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
export function ActionFeed({ hands }: { hands: HandView[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenRef = useRef(0);
  const total = hands.reduce((n, h) => n + h.events.length, 0);

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
        <span className="eyebrow">
          {hands.length} hand{hands.length === 1 ? "" : "s"}
        </span>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-7 overflow-y-auto px-4 py-4">
        {hands.length === 0 ? (
          <FeedEmpty />
        ) : (
          hands.map((h) => <HandBlock key={h.id} hand={h} />)
        )}
      </div>
    </section>
  );
}
