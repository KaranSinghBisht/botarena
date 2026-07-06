"use client";

import { useChainData } from "@/hooks/useChainData";
import { ActionFeed } from "./ActionFeed";
import { EmptyState } from "./EmptyState";
import { FairnessStrip } from "./FairnessStrip";
import { Footer } from "./Footer";
import { HandHistory } from "./HandHistory";
import { Header } from "./Header";
import { PokerTable } from "./poker/PokerTable";
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

export function Arena() {
  const { state, status } = useChainData();
  const { table, hands, scoreboard } = state;

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6 sm:py-7">
      <Header latestBlock={status.latestBlock} connected={status.connected} />

      {!status.configured ? (
        <EmptyState />
      ) : !table ? (
        <Connecting error={status.error} />
      ) : (
        <main className="mt-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
          <div className="order-1 space-y-5 lg:col-start-1">
            <PokerTable table={table} />
            <FairnessStrip table={table} />
          </div>

          <div className="order-2 h-[72vh] lg:col-start-2 lg:row-span-2 lg:h-[calc(100vh-2.5rem)] lg:sticky lg:top-5">
            <ActionFeed hands={hands} />
          </div>

          <div className="order-3 grid gap-5 sm:grid-cols-2 lg:col-start-1">
            <HandHistory hands={hands} />
            <Scoreboard data={scoreboard} />
          </div>
        </main>
      )}

      <div className="mt-8">
        <Footer />
      </div>
    </div>
  );
}
