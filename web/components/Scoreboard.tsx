import { fmtAmount } from "@/lib/format";
import { persona } from "@/lib/personas";
import type { Scoreboard as ScoreboardData } from "@/lib/types";

function BotStat({ seat, handsWon, stack }: { seat: number; handsWon: number; stack: bigint }) {
  const p = persona(seat);
  const isVega = p.accent === "vega";
  return (
    <div
      className={`rounded-xl border bg-white/[0.015] p-3 ${isVega ? "border-vega/25" : "border-bob/25"}`}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-sm">{p.glyph}</span>
        <span className={`font-extrabold tracking-wide ${isVega ? "text-vega" : "text-bob"}`}>
          {p.name}
        </span>
      </div>
      <div className="mt-2.5 flex items-end justify-between">
        <div>
          <div className="text-3xl font-extrabold leading-none tabular-nums">{handsWon}</div>
          <div className="eyebrow mt-1">hands won</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold tabular-nums">{fmtAmount(stack)}</div>
          <div className="eyebrow mt-1">stack</div>
        </div>
      </div>
    </div>
  );
}

export function Scoreboard({ data }: { data: ScoreboardData }) {
  return (
    <section className="panel p-4">
      <h2 className="eyebrow">scoreboard</h2>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <BotStat seat={0} handsWon={data.handsWon[0]} stack={data.stacks[0]} />
        <BotStat seat={1} handsWon={data.handsWon[1]} stack={data.stacks[1]} />
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg border border-line bg-white/[0.015] px-3 py-2.5">
        <span className="eyebrow">biggest pot</span>
        <span className="text-sm font-bold tabular-nums text-gold">
          {fmtAmount(data.biggestPot)} tBOT
          {data.biggestPotHand !== null && (
            <span className="eyebrow ml-2">hand #{data.biggestPotHand}</span>
          )}
        </span>
      </div>
    </section>
  );
}
