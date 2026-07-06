"use client";

import { useCountdown } from "@/hooks/useCountdown";
import { addressUrl } from "@/lib/env";
import { fmtAmount, fmtClock, shortAddr } from "@/lib/format";
import { persona } from "@/lib/personas";
import type { SeatView } from "@/lib/types";
import { PlayingCard } from "../ui/PlayingCard";

interface Props {
  seat: SeatView;
  isButton: boolean;
  deadline: number;
}

export function SeatPanel({ seat, isButton, deadline }: Props) {
  const p = persona(seat.seat);
  const isVega = p.accent === "vega";
  const remaining = useCountdown(seat.isActing ? deadline : 0);

  const holes = seat.holes ?? [null, null];
  const glow = seat.isActing ? (isVega ? "glow-vega" : "glow-bob") : "border border-line";
  const nameColor = isVega ? "text-vega" : "text-bob";
  const pulse = isVega ? "animate-act text-vega" : "animate-act-bob text-bob";

  return (
    <div
      className={`flex items-center gap-3 rounded-xl bg-white/[0.02] px-3 py-2.5 backdrop-blur-sm ${glow}`}
    >
      <div className="flex gap-1.5">
        {holes.map((c, i) => (
          <PlayingCard key={`${seat.seat}-${i}-${c ?? "x"}`} card={c} size="hole" reveal={c != null} />
        ))}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-base leading-none">{p.glyph}</span>
          <span className={`font-extrabold tracking-wide ${nameColor}`}>{p.name}</span>
          {isButton && (
            <span className="grid h-4 w-4 place-items-center rounded-full border border-gold/50 text-[9px] font-bold text-gold">
              D
            </span>
          )}
          {seat.isActing && (
            <span
              className={`rounded-md border px-1.5 py-0.5 text-[9px] font-bold tracking-widest ${pulse} ${
                isVega ? "border-vega/50" : "border-bob/50"
              }`}
            >
              TO ACT{deadline ? ` · ${fmtClock(remaining)}` : ""}
            </span>
          )}
        </div>
        <a
          href={addressUrl(seat.address)}
          target="_blank"
          rel="noopener noreferrer"
          className="eyebrow mt-1 inline-block transition-colors hover:text-ink"
        >
          {shortAddr(seat.address)}
        </a>
      </div>

      <div className="text-right">
        <div className="text-xl font-extrabold tabular-nums leading-none">{fmtAmount(seat.stack)}</div>
        <div className="eyebrow mt-1">
          tBOT
          {seat.streetBet > 0n && <span className="text-muted"> · bet {fmtAmount(seat.streetBet)}</span>}
        </div>
      </div>
    </div>
  );
}
