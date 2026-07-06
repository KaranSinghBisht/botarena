"use client";

import { useCountdown } from "@/hooks/useCountdown";
import { addressUrl } from "@/lib/env";
import { fmtAmount, fmtClock, shortAddr } from "@/lib/format";
import { persona } from "@/lib/personas";
import type { Hex } from "viem";
import { PlayingCard } from "../ui/PlayingCard";

export interface PodData {
  seat: number;
  address: Hex | null;
  /** null = don't show a stack line (replay mode) */
  stack: bigint | null;
  holes: (number | null)[];
  isButton: boolean;
  isActing: boolean;
  folded: boolean;
  deadline: number;
  isWinner: boolean;
}

/** A player pod that sits ON the felt: cards, identity, stack, status. */
export function SeatPod({ pod, at }: { pod: PodData; at: "top" | "bottom" }) {
  const p = persona(pod.seat);
  const isVega = p.accent === "vega";
  const remaining = useCountdown(pod.isActing ? pod.deadline : 0);
  const ring = pod.isActing ? (isVega ? "glow-vega" : "glow-bob") : "";
  const cards = (
    <div className="flex justify-center gap-1.5 drop-shadow-xl">
      {pod.holes.map((c, i) => (
        <PlayingCard key={`${pod.seat}-${i}-${c ?? "x"}`} card={c} size="big" reveal={c != null} />
      ))}
    </div>
  );

  return (
    <div className={`flex flex-col items-center gap-2 ${pod.folded ? "pod-folded" : ""}`}>
      {at === "bottom" && cards}

      <div className={`pod relative flex items-center gap-3 px-3.5 py-2 ${ring} ${pod.isWinner ? "animate-win" : ""}`}>
        <span className="text-lg leading-none">{p.glyph}</span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-extrabold tracking-wide ${isVega ? "text-vega" : "text-bob"}`}>
              {p.name}
            </span>
            <span className="eyebrow !text-[9px]">{pod.isButton ? "BTN·SB" : "BB"}</span>
            {pod.folded && <span className="eyebrow !text-[9px] text-cardred">folded</span>}
          </div>
          {pod.address ? (
            <a
              href={addressUrl(pod.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="eyebrow !text-[9px] transition-colors hover:text-ink"
            >
              {shortAddr(pod.address)}
            </a>
          ) : null}
        </div>

        {pod.stack !== null && (
          <div className="ml-1 min-w-[58px] border-l border-line pl-3 text-right">
            <div className="text-base font-extrabold tabular-nums leading-none">{fmtAmount(pod.stack)}</div>
            <div className="eyebrow !text-[9px] mt-0.5">tBOT</div>
          </div>
        )}

        {pod.isButton && (
          <span className="absolute -left-2.5 -top-2.5 grid h-6 w-6 place-items-center rounded-full border border-gold/60 bg-[#141007] text-[10px] font-black text-gold shadow-lg">
            D
          </span>
        )}
        {pod.isActing && (
          <span className="deciding-chip absolute -right-2 -top-3 rounded px-1.5 py-0.5 text-[9px] font-bold">
            DECIDING{pod.deadline ? ` ${fmtClock(remaining)}` : ""}
          </span>
        )}
      </div>

      {at === "top" && cards}
    </div>
  );
}
