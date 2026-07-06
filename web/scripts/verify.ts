// Exercises the REAL lib derivation (events.ts + poker.ts) against live chain
// data, so we validate the data layer without a browser.
// Run: ../engine/node_modules/.bin/tsx scripts/verify.ts
import { createPublicClient, http } from "viem";
import { pokerTableAbi } from "../lib/abi";
import { decodeArenaLog } from "../lib/events";
import { buildArenaState } from "../lib/poker";
import { cardText } from "../lib/cards";
import { fmtAmount } from "../lib/format";
import { phaseLabel, reasonLabel } from "../lib/enums";
import { persona } from "../lib/personas";
import type { ArenaEvent, GetHandResult } from "../lib/types";

const RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545";
const TABLE = (process.env.NEXT_PUBLIC_TABLE_ADDRESS ??
  "0x0165878A594ca255338adfa4d48449f69242Eb8F") as `0x${string}`;

async function main() {
  const client = createPublicClient({ transport: http(RPC) });
  const latest = await client.getBlockNumber();
  const raw = (await client.readContract({
    address: TABLE,
    abi: pokerTableAbi,
    functionName: "getHand",
  })) as GetHandResult;

  const logs = await client.getLogs({ address: TABLE, fromBlock: 0n, toBlock: latest });
  const events = logs.map(decodeArenaLog).filter((e): e is ArenaEvent => e !== null);
  const state = buildArenaState(raw, events);

  console.log(`\n=== DERIVED STATE (block ${latest}, ${events.length} events) ===`);
  console.log(`hands reconstructed: ${state.hands.length}`);
  for (const h of state.hands) {
    const w = h.winnerSeat !== null ? persona(h.winnerSeat).name : "—";
    const board = h.board.map(cardText).join(" ") || "(none)";
    const holes = h.holes
      ? `${persona(0).name} ${h.holes[0].map(cardText).join("")} · ${persona(1).name} ${h.holes[1].map(cardText).join("")}`
      : "hidden";
    console.log(
      `  hand #${h.id}: ${h.actions.length} actions · board [${board}] · holes ${holes}\n` +
        `     winner ${w} +${fmtAmount(h.amountWon ?? 0n)} · reason ${reasonLabel(h.reason ?? 0)} · verified ${h.verified} · potPeak ${fmtAmount(h.potPeak)}`,
    );
  }

  const t = state.table;
  console.log(`\ntable: hand #${t?.handId} · ${phaseLabel(t?.phase ?? 0)} · live=${t?.live}`);
  console.log(`  board slots: ${t?.board.map((c) => (c === null ? "▢" : cardText(c))).join(" ")}`);
  console.log(`  pot ${fmtAmount(t?.pot ?? 0n)} · verified ${t?.verified} · matchOver ${t?.matchOver}`);
  for (const s of t?.seats ?? []) {
    console.log(
      `  seat ${s.seat} ${persona(s.seat).name}: stack ${fmtAmount(s.stack)} · holes ${s.holes ? s.holes.map(cardText).join("") : "hidden"} · acting ${s.isActing}`,
    );
  }

  const sb = state.scoreboard;
  console.log(
    `\nscoreboard: ${persona(0).name} ${sb.handsWon[0]}W / ${persona(1).name} ${sb.handsWon[1]}W · played ${sb.handsPlayed}`,
  );
  console.log(`  biggest pot ${fmtAmount(sb.biggestPot)} (hand #${sb.biggestPotHand})\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
