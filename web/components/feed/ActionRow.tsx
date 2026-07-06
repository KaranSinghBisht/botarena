import { txUrl } from "@/lib/env";
import { actionLabel } from "@/lib/enums";
import { fmtAmount, shortHash } from "@/lib/format";
import { persona } from "@/lib/personas";
import type { ActionEvent } from "@/lib/types";

const VERB: Record<number, string> = {
  0: "folds",
  1: "checks",
  2: "calls",
  3: "bets",
  4: "raises",
};

export function ActionRow({ ev }: { ev: ActionEvent }) {
  const p = persona(ev.seat);
  const isVega = p.accent === "vega";
  const showAmount = ev.action >= 2 && ev.amount > 0n;

  return (
    <div className="animate-feed-in flex gap-2.5">
      <div className="flex flex-col items-center pt-[7px]">
        <span className={`h-2 w-2 shrink-0 rounded-full ${isVega ? "bg-vega" : "bg-bob"}`} />
        <span className="mt-1 w-px flex-1 bg-line" />
      </div>

      <div className="min-w-0 flex-1 pb-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-sm">
          <span className={`font-bold ${isVega ? "text-vega" : "text-bob"}`}>{p.name}</span>
          <span className="text-muted">{VERB[ev.action] ?? actionLabel(ev.action)}</span>
          {showAmount && <span className="font-semibold text-ink">{fmtAmount(ev.amount)} tBOT</span>}
          <span className="text-[11px] text-faint">pot {fmtAmount(ev.pot)}</span>
          <a
            href={txUrl(ev.tx)}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-[10px] tracking-wide text-faint transition-colors hover:text-vega"
          >
            {shortHash(ev.tx, 8)} ↗
          </a>
        </div>

        {ev.quip && (
          <div
            className={`mt-1.5 inline-block max-w-full rounded-xl rounded-tl-sm px-3 py-1.5 text-[13px] leading-snug ${
              isVega ? "bubble-vega" : "bubble-bob"
            }`}
          >
            {ev.quip}
          </div>
        )}

        {ev.reasoning && (
          <div className="mt-1.5 flex gap-1.5 text-[11.5px] leading-snug text-muted">
            <span className="shrink-0 opacity-70">🧠</span>
            <span className="italic">{ev.reasoning}</span>
          </div>
        )}
      </div>
    </div>
  );
}
