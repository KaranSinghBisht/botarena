import { formatEther, parseEther } from "viem";
import { decide, type HandLogEntry } from "./agent.js";
import { fmtCards } from "./cards.js";
import { config } from "./config.js";
import { Dealer } from "./dealer.js";
import { PERSONAS } from "./personas.js";
import {
  Phase,
  publicClient,
  readBlinds,
  readHand,
  sendTable,
  walletFor,
  type Blinds,
  type HandState,
} from "./table.js";

const BUY_IN = parseEther(process.env.BUY_IN ?? "0.1");
const ACTION_NAMES = ["fold", "check", "call", "bet", "raise"];

const dealer = new Dealer();
const agents = config.agentKeys.map((key, seat) => ({
  wallet: walletFor(key),
  persona: PERSONAS[seat],
}));

let handLog: HandLogEntry[] = [];
let trackedHandId = 0n;
let showdownSent = false;
let handsFinished = 0;
let blinds: Blinds = { sb: 0n, bb: 0n };

function explorer(tx: string): string {
  return `${config.explorerUrl}/tx/${tx}`;
}

async function ensureSeated(h: HandState): Promise<boolean> {
  let seatedAny = false;
  for (const { wallet, persona } of agents) {
    const seated = h.players.some((p) => p.toLowerCase() === wallet.account.address.toLowerCase());
    if (!seated) {
      const tx = await sendTable(wallet, "join", [], BUY_IN);
      console.log(`[${persona.name}] joined with ${formatEther(BUY_IN)} tBOT — ${explorer(tx)}`);
      seatedAny = true;
    }
  }
  return seatedAny;
}

async function onIdle(h: HandState): Promise<void> {
  if (trackedHandId === h.id && trackedHandId !== 0n) {
    handsFinished++;
    if (!showdownSent) await dealer.auditReveal(h.id); // fold: prove the deck anyway
    trackedHandId = 0n;
  }
  if (handsFinished >= config.handsPerSession) {
    console.log(`\nSession complete: ${handsFinished} hands played.`);
    printStacks(h);
    process.exit(0);
  }
  if (await ensureSeated(h)) return; // re-read state next tick

  const fresh = await readHand();
  if (fresh.stacks[0] < blinds.bb || fresh.stacks[1] < blinds.bb) {
    console.log("\nA player is bust — session over.");
    printStacks(fresh);
    process.exit(0);
  }
  handLog = [];
  showdownSent = false;
  trackedHandId = fresh.id + 1n;
  await dealer.startHand(trackedHandId);
}

async function onBetting(h: HandState): Promise<void> {
  const { wallet, persona } = agents[h.toAct];
  const holes = dealer.holeCards(h.id, h.toAct);
  const decision = await decide(persona, h, holes, handLog, blinds);
  const name = ACTION_NAMES[decision.action];
  const args = [decision.action, decision.amount, decision.quip, decision.reasoning];
  const tx = await sendTable(wallet, "act", args);
  handLog.push({
    seat: h.toAct,
    street: h.street,
    action: name,
    amount: decision.amount,
    quip: decision.quip,
  });
  console.log(
    `[${persona.name}] ${fmtCards(holes)} -> ${name}${decision.amount > 0n ? ` to ${formatEther(decision.amount)}` : ""}` +
      `${decision.quip ? ` | "${decision.quip}"` : ""}\n    ${explorer(tx)}`,
  );
}

function printStacks(h: HandState): void {
  for (const { persona } of agents) {
    console.log(`  ${persona.name}: ${formatEther(h.stacks[persona.seat])} tBOT`);
  }
}

async function tick(): Promise<void> {
  const h = await readHand();
  if (h.phase === Phase.Idle) return onIdle(h);
  if (h.phase === Phase.Betting) return onBetting(h);
  if (h.phase === Phase.AwaitReveal) {
    const tx = await dealer.revealNext(h);
    void tx;
    return;
  }
  if (h.phase === Phase.AwaitShowdown) {
    await dealer.showdown(h);
    showdownSent = true;
  }
}

async function main(): Promise<void> {
  console.log(`BotArena session (chain ${publicClient.chain?.id})`);
  console.log(`table: ${config.tableAddress}`);
  console.log(`dealer: ${dealer.address}`);
  blinds = await readBlinds();
  const block = await publicClient.getBlockNumber();
  console.log(`blinds: ${formatEther(blinds.sb)}/${formatEther(blinds.bb)} tBOT, chain head: ${block}\n`);

  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await tick();
    } catch (err) {
      console.error("[tick] error (retrying):", err instanceof Error ? err.message : err);
    }
    await new Promise((r) => setTimeout(r, config.pollMs));
  }
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
