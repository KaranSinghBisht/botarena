"use client";

import { useEffect, useMemo, useRef } from "react";
import { useChainData } from "@/hooks/useChainData";
import { useReplay } from "@/hooks/useReplay";
import { useSoundCues } from "@/hooks/useSoundCues";
import { fmtBot } from "@/lib/format";
import { buildLiveStage, buildReplayStage } from "@/lib/stage";
import type { ArenaState } from "@/lib/types";
import { ActionFeed } from "./ActionFeed";
import { EmptyState } from "./EmptyState";
import { FairnessStrip } from "./FairnessStrip";
import { Footer } from "./Footer";
import { HandHistory } from "./HandHistory";
import { Header } from "./Header";
import { PokerTable, type StageProps } from "./poker/PokerTable";
import { ReplayBar } from "./ReplayBar";
import { Scoreboard } from "./Scoreboard";

function Connecting({ error }: { error: string | null }) {
  return (
    <div className="panel mx-auto mt-16 max-w-md p-8 text-center">
      <div className="text-sm text-muted">
        {error ? (
          <span className="text-bob">{error}</span>
        ) : (
          <>
            connecting to chain
            <span className="animate-blink text-log">_</span>
          </>
        )}
      </div>
      <p className="eyebrow mt-2">reading getHand() &amp; scanning event logs</p>
    </div>
  );
}

function Ticker({ state, latestBlock }: { state: ArenaState; latestBlock: bigint | null }) {
  const events = state.hands.reduce((n, h) => n + h.events.length, 0);
  const items = [
    "● live on bot chain testnet",
    `block #${latestBlock ?? "…"}`,
    `${state.scoreboard.handsPlayed} hands played`,
    `${events} events on-chain`,
    `record pot ${fmtBot(state.scoreboard.biggestPot)}`,
    "every bluff is a transaction",
    "deck committed before dealing · keccak256(deck ‖ salt)",
    `VEGA ${state.scoreboard.handsWon[0]} — ${state.scoreboard.handsWon[1]} BOB`,
  ];
  const line = items.join("  ·  ");
  return (
    <div className="overflow-hidden border-b border-line/70 bg-black/20 text-[10.5px] tracking-[0.18em] uppercase text-faint">
      <div className="ticker-track flex w-max gap-8 whitespace-nowrap px-4 py-1.5">
        <span>{line}</span>
        <span aria-hidden>{line}</span>
      </div>
    </div>
  );
}

export function Arena() {
  const { state, status } = useChainData();
  const { table, hands, scoreboard } = state;
  const replay = useReplay();

  const allEvents = useMemo(() => hands.flatMap((h) => h.events), [hands]);
  useSoundCues(allEvents, replay.hand === null);

  // deep link: ?hand=7 opens that hand's replay once data arrives
  const deepLinked = useRef(false);
  useEffect(() => {
    if (deepLinked.current || hands.length === 0) return;
    const id = Number(new URLSearchParams(window.location.search).get("hand"));
    if (!Number.isFinite(id) || id <= 0) {
      deepLinked.current = true;
      return;
    }
    const hand = hands.find((h) => h.id === id && h.settled);
    if (hand) {
      deepLinked.current = true;
      replay.enter(hand);
    }
  }, [hands, replay]);

  const stage: StageProps | null = replay.hand
    ? replay.current
      ? buildReplayStage(replay.hand, replay.current, replay.index, replay.steps.length, state.players)
      : null
    : table
      ? buildLiveStage(table, hands)
      : null;

  return (
    <div className="min-h-screen">
      {status.configured && <Ticker state={state} latestBlock={status.latestBlock} />}

      <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-6">
        <Header latestBlock={status.latestBlock} connected={status.connected} />

        {!status.configured ? (
          <EmptyState />
        ) : !stage ? (
          <Connecting error={status.error} />
        ) : (
          <main className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
            <div className="order-1 space-y-4 lg:col-start-1">
              <PokerTable stage={stage} />
              <ReplayBar replay={replay} />
              {table && <FairnessStrip table={table} />}
            </div>

            <div className="order-2 h-[72vh] min-w-0 lg:col-start-2 lg:row-span-2 lg:h-[calc(100vh-3rem)] lg:sticky lg:top-4">
              <ActionFeed hands={hands} />
            </div>

            <div className="order-3 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:col-start-1">
              <HandHistory hands={hands} onSelect={replay.enter} selectedId={replay.hand?.id ?? null} />
              <Scoreboard data={scoreboard} />
            </div>
          </main>
        )}

        <div className="mt-8">
          <Footer />
        </div>
      </div>
    </div>
  );
}
