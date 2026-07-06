import Anthropic from "@anthropic-ai/sdk";
import { formatEther, parseEther } from "viem";
import { fmtCards } from "./cards.js";
import { config } from "./config.js";
import { Action, type HandState } from "./table.js";
import type { Persona } from "./personas.js";

export interface Decision {
  action: Action;
  /** raise-to / bet total for this street, in wei */
  amount: bigint;
  quip: string;
  reasoning: string;
}

export interface HandLogEntry {
  seat: number;
  street: number;
  action: string;
  amount: bigint;
  quip: string;
}

const anthropic = new Anthropic({ apiKey: config.anthropicKey });

const decideTool: Anthropic.Tool = {
  name: "decide_action",
  description: "Commit your poker action for this turn.",
  input_schema: {
    type: "object" as const,
    properties: {
      action: { type: "string", enum: ["fold", "check", "call", "bet", "raise"] },
      raise_to: {
        type: "number",
        description:
          "Only for bet/raise: TOTAL tBOT you want committed this street (raise-to semantics), e.g. 0.006",
      },
      quip: { type: "string", description: "Table talk, in character, max 90 chars" },
      reasoning: {
        type: "string",
        description: "Honest one-sentence strategy summary for spectators, max 180 chars",
      },
    },
    required: ["action", "quip", "reasoning"],
  },
};

const STREETS = ["preflop", "flop", "turn", "river"];

function legalActions(h: HandState, seat: number): string[] {
  const owe = h.betToMatch - h.streetBet[seat];
  const stack = h.stacks[seat];
  const acts: string[] = ["fold"];
  if (owe === 0n) acts.push("check");
  if (owe > 0n) acts.push("call");
  if (h.betToMatch === 0n && stack > 0n) acts.push("bet");
  if (h.betToMatch > 0n && stack > owe) acts.push("raise");
  return acts;
}

function describeState(h: HandState, seat: number, holes: number[], log: HandLogEntry[]): string {
  const opp = 1 - seat;
  const owe = h.betToMatch - h.streetBet[seat];
  const board = h.communityCount > 0 ? fmtCards(h.community.slice(0, h.communityCount)) : "(none yet)";
  const pot = h.pot + h.streetBet[0] + h.streetBet[1];
  const minRaiseTo = h.betToMatch + (h.lastRaise > 0n ? h.lastRaise : parseEther("0.002"));
  const history = log
    .map((e) => `${STREETS[e.street]}: seat${e.seat} ${e.action}${e.amount > 0n ? ` ${formatEther(e.amount)}` : ""}${e.quip ? ` — "${e.quip}"` : ""}`)
    .join("\n");

  return [
    `Hand #${h.id}. You are seat ${seat}${h.button === seat ? " (button/SB — in position)" : " (BB — out of position)"}.`,
    `Street: ${STREETS[h.street]}. Board: ${board}`,
    `Your hole cards: ${fmtCards(holes)}`,
    `Pot: ${formatEther(pot)} tBOT. Your stack: ${formatEther(h.stacks[seat])}. Opponent stack: ${formatEther(h.stacks[opp])}.`,
    owe > 0n ? `To call: ${formatEther(owe)} tBOT.` : `No bet to you.`,
    `If raising/betting, min total this street: ${formatEther(minRaiseTo)} tBOT; going all-in is always allowed.`,
    `Legal actions: ${legalActions(h, seat).join(" | ")}`,
    log.length > 0 ? `Action so far this hand:\n${history}` : "First action of the hand.",
  ].join("\n");
}

/** Clamp/repair a model decision into something the contract will accept. */
function sanitize(h: HandState, seat: number, raw: Record<string, unknown>): Decision {
  const owe = h.betToMatch - h.streetBet[seat];
  const stack = h.stacks[seat];
  const allInTo = h.streetBet[seat] + stack;
  const quip = String(raw.quip ?? "").slice(0, 90);
  const reasoning = String(raw.reasoning ?? "").slice(0, 180);
  let name = String(raw.action ?? "fold");

  if (name === "check" && owe > 0n) name = "call";
  if (name === "call" && owe === 0n) name = "check";
  if (name === "bet" && h.betToMatch > 0n) name = "raise";
  if (name === "raise" && h.betToMatch === 0n) name = "bet";

  if (name === "bet" || name === "raise") {
    let to = parseSafeEther(raw.raise_to);
    const minTo = name === "bet" ? parseEther("0.002") : h.betToMatch + h.lastRaise;
    if (to < minTo) to = minTo;
    if (to > allInTo) to = allInTo;
    if (name === "raise" && stack <= owe) {
      return { action: Action.Call, amount: 0n, quip, reasoning };
    }
    return { action: name === "bet" ? Action.Bet : Action.Raise, amount: to, quip, reasoning };
  }
  if (name === "call") return { action: Action.Call, amount: 0n, quip, reasoning };
  if (name === "check") return { action: Action.Check, amount: 0n, quip, reasoning };
  return { action: Action.Fold, amount: 0n, quip, reasoning };
}

function parseSafeEther(value: unknown): bigint {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0n;
  return parseEther(n.toFixed(9));
}

/** Scripted policy for local dry-runs (AGENT_MODEL=mock): exercises every code
 *  path — checks, calls, raises, folds and the occasional shove — with no API. */
function mockDecision(h: HandState, seat: number): Decision {
  const owe = h.betToMatch - h.streetBet[seat];
  const stack = h.stacks[seat];
  const allInTo = h.streetBet[seat] + stack;
  const roll = Math.random();
  const tag = { quip: "beep boop", reasoning: "mock policy" };

  if (owe === 0n) {
    if (roll < 0.6 || h.betToMatch > 0n) return { action: Action.Check, amount: 0n, ...tag };
    const to = h.pot / 2n > parseEther("0.002") ? h.pot / 2n : parseEther("0.002");
    return { action: Action.Bet, amount: to > allInTo ? allInTo : to, ...tag };
  }
  if (roll < 0.15) return { action: Action.Fold, amount: 0n, ...tag };
  if (roll < 0.85 || stack <= owe) return { action: Action.Call, amount: 0n, ...tag };
  if (roll < 0.95) {
    const to = h.betToMatch + h.lastRaise * 2n;
    return { action: Action.Raise, amount: to > allInTo ? allInTo : to, ...tag };
  }
  return { action: Action.Raise, amount: allInTo, ...tag };
}

export async function decide(
  persona: Persona,
  h: HandState,
  holes: number[],
  log: HandLogEntry[],
): Promise<Decision> {
  if (config.model === "mock") return mockDecision(h, persona.seat);
  const system = [
    persona.style,
    "You play for real on-chain stakes. Blinds are 0.001/0.002 tBOT.",
    "Think about pot odds, ranges, position and the opponent's line, then commit",
    "exactly one action via the decide_action tool. Your `reasoning` is shown to",
    "spectators (they see your logic, opponent does not) — make it sharp and honest.",
    "Your `quip` is said out loud at the table, stay in character.",
  ].join(" ");

  try {
    const res = await anthropic.messages.create({
      model: config.model,
      max_tokens: 500,
      system,
      messages: [{ role: "user", content: describeState(h, seat(persona), holes, log) }],
      tools: [decideTool],
      tool_choice: { type: "tool", name: "decide_action" },
      temperature: 1,
    });
    const toolUse = res.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") throw new Error("no tool_use block");
    return sanitize(h, persona.seat, toolUse.input as Record<string, unknown>);
  } catch (err) {
    // Never stall the table on an API hiccup: take the free/cheap way out.
    console.error(`[${persona.name}] decision error, playing safe:`, err);
    const owe = h.betToMatch - h.streetBet[persona.seat];
    return {
      action: owe === 0n ? Action.Check : Action.Fold,
      amount: 0n,
      quip: "",
      reasoning: "connection wobble — playing it safe",
    };
  }
}

function seat(persona: Persona): number {
  return persona.seat;
}
