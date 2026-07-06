"use client";

import { persona } from "@/lib/personas";
import { fmtAmount } from "@/lib/format";
import { PlayingCard } from "../ui/PlayingCard";
import { SeatPod, type PodData } from "./SeatPod";
import { PotDisplay } from "./PotDisplay";

export interface StageQuip {
  seat: number;
  text: string;
  reasoning: string;
}

export interface StageProps {
  handId: number;
  statusLabel: string;
  live: boolean;
  pods: [PodData, PodData];
  bets: [bigint, bigint];
  board: (number | null)[];
  pot: bigint;
  street: number;
  quip: StageQuip | null;
  banner: string | null;
}

function BetToken({ amount }: { amount: bigint }) {
  if (amount <= 0n) return null;
  return (
    <span className="flex items-center gap-1.5">
      <span className="chip-token grid h-5 w-5 place-items-center rounded-full text-[8px] text-ink/70">⛁</span>
      <span className="text-[11px] font-bold tabular-nums text-ink/90">{fmtAmount(amount)}</span>
    </span>
  );
}

function QuipBubble({ quip, side }: { quip: StageQuip; side: "right" | "left" }) {
  const isVega = persona(quip.seat).accent === "vega";
  const anchor = side === "right" ? "left-full top-1 ml-3" : "right-full bottom-1 mr-3";
  return (
    <div className={`table-quip absolute z-20 hidden w-max sm:block ${anchor} ${isVega ? "bubble-vega" : "bubble-bob"}`}>
      {quip.text || <span className="opacity-60">…</span>}
    </div>
  );
}

/** The stage: a real racetrack felt with pods, chips, board and pot placed spatially. */
export function PokerTable({ stage }: { stage: StageProps }) {
  return (
    <section className="table-stage p-3 sm:p-5">
      <div className="mb-2.5 flex items-center justify-between px-1">
        <span className="eyebrow">hand #{stage.handId}</span>
        <span className="eyebrow flex items-center gap-1.5">
          {stage.live && <span className="h-1.5 w-1.5 rounded-full bg-log animate-pulse-dot" />}
          {stage.statusLabel}
        </span>
      </div>

      <div className="felt-oval relative mx-auto aspect-[4/5] w-full max-w-[880px] sm:aspect-[16/10.6]">
        {/* seat 0 — top */}
        <div className="absolute left-1/2 top-[4%] z-10 -translate-x-1/2">
          <div className="relative">
            <SeatPod pod={stage.pods[0]} at="top" />
            {stage.quip?.seat === 0 && <QuipBubble quip={stage.quip} side="right" />}
          </div>
        </div>
        {/* seat 1 — bottom */}
        <div className="absolute bottom-[4%] left-1/2 z-10 -translate-x-1/2">
          <div className="relative">
            <SeatPod pod={stage.pods[1]} at="bottom" />
            {stage.quip?.seat === 1 && <QuipBubble quip={stage.quip} side="left" />}
          </div>
        </div>

        {/* bets on the felt */}
        <div className="absolute left-[14%] top-[38%] z-10 sm:left-[24%]">
          <BetToken amount={stage.bets[0]} />
        </div>
        <div className="absolute bottom-[38%] right-[14%] z-10 sm:right-[24%]">
          <BetToken amount={stage.bets[1]} />
        </div>

        {/* center: pot + board */}
        <div className="absolute inset-0 z-0 grid place-items-center">
          <div className="flex flex-col items-center gap-2.5 sm:gap-3.5">
            <PotDisplay pot={stage.pot} street={stage.street} />
            <div className="flex gap-1.5 sm:gap-2">
              {stage.board.map((c, i) => (
                <PlayingCard key={`${i}-${c ?? "x"}`} card={c} size="board" reveal={c != null} />
              ))}
            </div>
          </div>
        </div>

        {stage.banner && (
          <div className="absolute bottom-[-1px] left-1/2 z-20 w-max max-w-[92%] -translate-x-1/2 translate-y-1/2 rounded-xl border border-gold/45 bg-[#131007] px-4 py-2 text-center text-sm font-bold tracking-wide text-gold shadow-2xl animate-win">
            ♛ {stage.banner}
          </div>
        )}
      </div>

      {stage.quip?.reasoning ? (
        <p className="mx-auto mt-4 max-w-[720px] px-2 text-center text-[11.5px] italic leading-relaxed text-muted">
          🧠 {stage.quip.reasoning}
        </p>
      ) : (
        <div className="mt-4 h-[17px]" />
      )}
    </section>
  );
}
