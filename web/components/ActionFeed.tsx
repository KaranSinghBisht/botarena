"use client";

import { useEffect, useRef } from "react";
import type { HandView } from "@/lib/types";
import { HandBlock } from "./feed/HandBlock";

function FeedEmpty() {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center text-center">
      <div className="text-sm text-muted">
        awaiting first action
        <span className="animate-blink text-log">_</span>
      </div>
      <p className="eyebrow mt-2 max-w-[220px]">
        every fold, call, bet and raise streams in here as an on-chain transaction
      </p>
    </div>
  );
}

/** The live play-by-play — quips, reasoning, reveals and settlements per hand. */
export function ActionFeed({
  hands,
  focusHandId = null,
}: {
  hands: HandView[];
  /** while a hand is live, show only its chat so the stream reads clean */
  focusHandId?: number | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenRef = useRef(0);
  const focused = focusHandId !== null ? hands.filter((h) => h.id === focusHandId) : hands;
  const visible = focused.length > 0 ? focused : hands;
  const total = visible.reduce((n, h) => n + h.events.length, 0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || total <= seenRef.current) {
      seenRef.current = total;
      return;
    }
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 180;
    if (nearBottom || seenRef.current === 0) el.scrollTop = el.scrollHeight;
    seenRef.current = total;
  }, [total]);

  return (
    <section className="panel flex h-full flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-log">▹</span>
          <h2 className="text-sm font-bold tracking-[0.12em]">LIVE ACTION FEED</h2>
        </div>
        {focusHandId !== null && focused.length > 0 ? (
          <span className="eyebrow flex items-center gap-1.5 !text-log">
            <span className="h-1.5 w-1.5 rounded-full bg-log animate-pulse-dot" />
            live · hand #{focusHandId}
          </span>
        ) : (
          <span className="eyebrow">
            {hands.length} hand{hands.length === 1 ? "" : "s"}
          </span>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 space-y-7 overflow-y-auto px-4 py-4">
        {visible.length === 0 ? (
          <FeedEmpty />
        ) : (
          visible.map((h) => <HandBlock key={h.id} hand={h} />)
        )}
      </div>
    </section>
  );
}
