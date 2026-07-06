// Server-renders the data-driven components with REAL derived state to catch
// any runtime crash the client-only render path could hide.
// Run: NEXT_PUBLIC_TABLE_ADDRESS=0x0165... ../engine/node_modules/.bin/tsx scripts/ssr-smoke.ts
import { createElement as h } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createPublicClient, http } from "viem";
import { pokerTableAbi } from "../lib/abi";
import { decodeArenaLog } from "../lib/events";
import { buildArenaState } from "../lib/poker";
import { buildReplay } from "../lib/replay";
import { buildLiveStage, buildReplayStage } from "../lib/stage";
import { Header } from "../components/Header";
import { PokerTable } from "../components/poker/PokerTable";
import { FairnessStrip } from "../components/FairnessStrip";
import { ActionFeed } from "../components/ActionFeed";
import { HandHistory } from "../components/HandHistory";
import { Scoreboard } from "../components/Scoreboard";
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

  const lastHand = state.hands[state.hands.length - 1];
  const steps = buildReplay(lastHand);
  const midStep = steps[Math.floor(steps.length / 2)];

  const html = renderToStaticMarkup(
    h(
      "div",
      null,
      h(Header, { latestBlock: latest, connected: true }),
      h(PokerTable, { stage: buildLiveStage(state.table!, state.hands) }),
      h(PokerTable, {
        stage: buildReplayStage(lastHand, midStep, Math.floor(steps.length / 2), steps.length, state.players),
      }),
      h(FairnessStrip, { table: state.table! }),
      h(ActionFeed, { hands: state.hands }),
      h(HandHistory, { hands: state.hands }),
      h(Scoreboard, { data: state.scoreboard }),
    ),
  );

  console.log(`SSR render OK — ${html.length} bytes (replay steps for hand #${lastHand.id}: ${steps.length})\n`);
  const checks = ["VEGA", "BOB", "showdown", "LIVE ACTION FEED", "replay ·", "deck commitment"];
  for (const s of checks) console.log(html.includes(s) ? `  ✓ contains "${s}"` : `  ✗ MISSING "${s}"`);
}

main().catch((e) => {
  console.error("SSR CRASH:", e);
  process.exit(1);
});
