"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ArenaEvent, HandView } from "@/lib/types";
import { HandBlock } from "./feed/HandBlock";

/** Event kinds that correspond 1:1 with replay steps (step 0 = blinds). */
const STEP_KINDS = new Set(["ActionTaken", "StreetRevealed", "ShowdownResult", "HandSettled"]);

/** Trim a hand's events to what the replay has revealed so far. */
function sliceToStep(events: ArenaEvent[], uptoStep: number): ArenaEvent[] {
  const out: ArenaEvent[] = [];
  let n = 0;
  for (const ev of events) {
    if (STEP_KINDS.has(ev.kind)) {
      n++;
      if (n > uptoStep) break;
    }
    out.push(ev);
  }
  return out;
}

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

export interface FeedFocus {
  handId: number;
  mode: "live" | "replay";
  /** replay only: reveal events up to this step so the chat streams in sync */
  uptoStep?: number;
}

/** The live play-by-play — quips, reasoning, reveals and settlements per hand. */
export function ActionFeed({
  hands,
  focus = null,
}: {
  hands: HandView[];
  /** while a hand is live or replaying, show only its chat so the stream reads clean */
  focus?: FeedFocus | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const seenRef = useRef(0);

  const focused = useMemo(() => {
    if (focus === null) return null;
    const h = hands.find((x) => x.id === focus.handId);
    if (!h) return null;
    const events =
      focus.mode === "replay" && focus.uptoStep !== undefined
        ? sliceToStep(h.events, focus.uptoStep)
        : h.events;
    return [{ ...h, events }];
  }, [hands, focus]);

  const visible = focused ?? hands;
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
        {focus !== null && focused ? (
          focus.mode === "live" ? (
            <span className="eyebrow flex items-center gap-1.5 !text-log">
              <span className="h-1.5 w-1.5 rounded-full bg-log animate-pulse-dot" />
              live · hand #{focus.handId}
            </span>
          ) : (
            <span className="eyebrow !text-gold">⟲ replay · hand #{focus.handId}</span>
          )
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
