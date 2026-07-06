import type { Hex } from "viem";
import { ACTION } from "./enums";
import type { HandView } from "./types";

/** Sound cue attached to a replay step (also fired live when new events land). */
export type SoundCue =
  | "deal"
  | "check"
  | "call"
  | "bet"
  | "raise"
  | "allin"
  | "fold"
  | "flip"
  | "win"
  | "none";

export interface ReplayStep {
  /** short label for the scrubber, e.g. "BOB raises 0.11" */
  label: string;
  street: number;
  /** pot AFTER this step (includes live street bets) */
  pot: bigint;
  /** chips in front of each seat this street */
  streetBet: [bigint, bigint];
  /** board cards revealed so far */
  board: number[];
  /** seat that acted (or -1) */
  actor: number;
  actionName: string | null;
  quip: string;
  reasoning: string;
  tx: Hex | null;
  /** holes visible at this step (showdown reveals them) */
  holes: [number[], number[]] | null;
  folded: [boolean, boolean];
  winnerSeat: number | null;
  amountWon: bigint | null;
  cue: SoundCue;
}

function cueForAction(action: number, allIn: boolean): SoundCue {
  if (allIn) return "allin";
  switch (action) {
    case 0:
      return "fold";
    case 1:
      return "check";
    case 2:
      return "call";
    case 3:
      return "bet";
    case 4:
      return "raise";
    default:
      return "none";
  }
}

/**
 * Derive a step-by-step timeline of a hand from its on-chain events — the
 * whole match is replayable from chain data alone.
 */
export function buildReplay(hand: HandView): ReplayStep[] {
  const steps: ReplayStep[] = [];
  const sb = hand.smallBlind;
  const bb = hand.bigBlind;
  const button = hand.button;

  let street = 0;
  let board: number[] = [];
  let streetBet: [bigint, bigint] = button === 0 ? [sb, bb] : [bb, sb];
  let holes: [number[], number[]] | null = null;
  const folded: [boolean, boolean] = [false, false];

  steps.push({
    label: `blinds ${button === 0 ? "0/1" : "1/0"}`,
    street: 0,
    pot: sb + bb,
    streetBet: [...streetBet] as [bigint, bigint],
    board: [],
    actor: -1,
    actionName: null,
    quip: "",
    reasoning: "",
    tx: null,
    holes: null,
    folded: [...folded] as [boolean, boolean],
    winnerSeat: null,
    amountWon: null,
    cue: "deal",
  });

  for (const e of hand.events) {
    if (e.kind === "ActionTaken") {
      const name = ACTION[e.action] ?? "?";
      if (e.action === 0) folded[e.seat] = true;
      if (e.action === 3 || e.action === 4) streetBet[e.seat] = e.amount;
      if (e.action === 2) streetBet[e.seat] = streetBet[1 - e.seat];
      steps.push({
        label: `${name}${e.amount > 0n ? "" : ""}`,
        street: e.street,
        pot: e.pot,
        streetBet: [...streetBet] as [bigint, bigint],
        board: [...board],
        actor: e.seat,
        actionName: name,
        quip: e.quip,
        reasoning: e.reasoning,
        tx: e.tx,
        holes,
        folded: [...folded] as [boolean, boolean],
        winnerSeat: null,
        amountWon: null,
        cue: cueForAction(e.action, false),
      });
    } else if (e.kind === "StreetRevealed") {
      street = e.street;
      board = [...board, ...e.cards];
      streetBet = [0n, 0n];
      steps.push({
        label: ["", "flop", "turn", "river"][e.street] ?? "street",
        street,
        pot: steps[steps.length - 1]?.pot ?? 0n,
        streetBet: [0n, 0n],
        board: [...board],
        actor: -1,
        actionName: null,
        quip: "",
        reasoning: "",
        tx: e.tx,
        holes,
        folded: [...folded] as [boolean, boolean],
        winnerSeat: null,
        amountWon: null,
        cue: "flip",
      });
    } else if (e.kind === "ShowdownResult") {
      holes = [e.holes0, e.holes1];
      steps.push({
        label: "showdown",
        street,
        pot: steps[steps.length - 1]?.pot ?? 0n,
        streetBet: [0n, 0n],
        board: [...board],
        actor: -1,
        actionName: null,
        quip: "",
        reasoning: "",
        tx: e.tx,
        holes,
        folded: [...folded] as [boolean, boolean],
        winnerSeat: null,
        amountWon: null,
        cue: "flip",
      });
    } else if (e.kind === "HandSettled") {
      steps.push({
        label: "settled",
        street,
        pot: e.amountWon,
        streetBet: [0n, 0n],
        board: [...board],
        actor: -1,
        actionName: null,
        quip: "",
        reasoning: "",
        tx: e.tx,
        holes,
        folded: [...folded] as [boolean, boolean],
        winnerSeat: e.winnerSeat,
        amountWon: e.amountWon,
        cue: "win",
      });
    }
  }
  return steps;
}
