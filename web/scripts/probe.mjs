// Debug probe: reads live PokerTable state + decodes all event logs.
// Usage: node scripts/probe.mjs  (reads env or falls back to local anvil)
import { createPublicClient, http, formatEther } from "viem";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const abi = JSON.parse(readFileSync(join(__dirname, "../lib/PokerTable.json"), "utf8"));

const RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545";
const TABLE = process.env.NEXT_PUBLIC_TABLE_ADDRESS ?? "0x0165878A594ca255338adfa4d48449f69242Eb8F";
const START = BigInt(process.env.NEXT_PUBLIC_START_BLOCK ?? "0");

const RANKS = "23456789TJQKA";
const SUITS = ["♠", "♥", "♦", "♣"];
const card = (c) => (c === 255 ? "??" : RANKS[c % 13] + SUITS[Math.floor(c / 13)]);
const PHASE = ["Idle", "Betting", "AwaitReveal", "AwaitShowdown"];
const ACTION = ["fold", "check", "call", "bet", "raise"];
const STREET = ["preflop", "flop", "turn", "river"];
const REASON = ["Fold", "Showdown", "SplitPot", "Timeout"];

const client = createPublicClient({ transport: http(RPC) });

const latest = await client.getBlockNumber();
console.log(`\n=== CHAIN ===\nRPC ${RPC}\ntable ${TABLE}\nlatest block ${latest}\n`);

const [hand, players, stacks] = await client.readContract({
  address: TABLE, abi, functionName: "getHand",
});
console.log("=== getHand() ===");
console.log("hand id", hand.id, "phase", PHASE[hand.phase], "street", STREET[hand.street],
  "button", hand.button, "toAct", hand.toAct);
console.log("community", hand.community.map(card).join(" "), "pot", formatEther(hand.pot));
console.log("players", players);
console.log("stacks", stacks.map((s) => formatEther(s)));
console.log("deckCommit", hand.deckCommit);
console.log("deadline", hand.deadline, "streetBet", hand.streetBet.map((s) => formatEther(s)));

const logs = await client.getLogs({ address: TABLE, fromBlock: START, toBlock: latest });
console.log(`\n=== ${logs.length} raw logs ===`);

const decoded = [];
for (const log of logs) {
  try {
    const { decodeEventLog } = await import("viem");
    const ev = decodeEventLog({ abi, data: log.data, topics: log.topics });
    decoded.push({ ...ev, block: log.blockNumber, tx: log.transactionHash });
  } catch (e) {
    console.log("undecodable log", log.topics[0], e.message);
  }
}

const counts = {};
for (const d of decoded) counts[d.eventName] = (counts[d.eventName] ?? 0) + 1;
console.log("event counts:", counts);

console.log("\n=== decoded timeline ===");
for (const d of decoded) {
  const a = d.args;
  if (d.eventName === "ActionTaken") {
    console.log(`H${a.handId} ${STREET[a.street]} seat${a.seat} ${ACTION[a.action]} ${formatEther(a.amount)} pot=${formatEther(a.pot)}`);
    console.log(`    quip: "${a.quip}"`);
    console.log(`    reasoning: "${a.reasoning?.slice(0, 90)}${a.reasoning?.length > 90 ? "..." : ""}"`);
  } else if (d.eventName === "StreetRevealed") {
    console.log(`H${a.handId} REVEAL ${STREET[a.street]}: ${a.cards.map(card).join(" ")}`);
  } else if (d.eventName === "ShowdownResult") {
    console.log(`H${a.handId} SHOWDOWN holes0=${a.holes0.map(card).join(" ")} holes1=${a.holes1.map(card).join(" ")} score0=${a.score0} score1=${a.score1}`);
  } else if (d.eventName === "HandSettled") {
    console.log(`H${a.handId} SETTLED winner=seat${a.winnerSeat} won=${formatEther(a.amountWon)} reason=${REASON[a.reason]}`);
  } else if (d.eventName === "HandStarted") {
    console.log(`H${a.handId} STARTED button=${a.button} sb=${formatEther(a.smallBlind)} bb=${formatEther(a.bigBlind)} commit=${a.deckCommit.slice(0, 14)}...`);
  } else if (d.eventName === "DeckAudited") {
    console.log(`H${a.handId} AUDITED salt=${a.salt.slice(0, 14)}...`);
  } else if (d.eventName === "PlayerJoined") {
    console.log(`JOINED seat${a.seat} ${a.player} buyIn=${formatEther(a.buyIn)}`);
  } else if (d.eventName === "HandCanceled") {
    console.log(`H${a.handId} CANCELED refunds=${formatEther(a.refund0)}/${formatEther(a.refund1)}`);
  } else {
    console.log(d.eventName, JSON.stringify(a, (_, v) => typeof v === "bigint" ? v.toString() : v));
  }
}
console.log("");
