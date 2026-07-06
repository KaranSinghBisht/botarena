import { fmtAmount } from "@/lib/format";
import { persona } from "@/lib/personas";
import type { HandView } from "@/lib/types";
import { PlayingCard } from "./ui/PlayingCard";

const REASON_LABEL: Record<number, string> = { 0: "fold", 1: "showdown", 2: "split", 3: "timeout" };

function ReasonTag({ reason }: { reason: number | null }) {
  const label = REASON_LABEL[reason ?? -1] ?? "settled";
  const tone =
    reason === 1 ? "border-gold/40 text-gold" : reason === 2 ? "border-vega/40 text-vega" : "border-line text-muted";
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[9px] uppercase tracking-widest ${tone}`}>
      {label}
    </span>
  );
}

interface RowProps {
  hand: HandView;
  onSelect?: (hand: HandView) => void;
  selected?: boolean;
}

function HistoryRow({ hand, onSelect, selected }: RowProps) {
  if (hand.canceled) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-line/70 bg-white/[0.015] px-3 py-2 text-sm text-muted">
        <span className="w-9 shrink-0 text-[11px] text-faint">#{hand.id}</span>
        <span>canceled · refunded</span>
      </div>
    );
  }

  const p = hand.winnerSeat !== null ? persona(hand.winnerSeat) : null;

  return (
    <button
      type="button"
      onClick={() => onSelect?.(hand)}
      title="Watch replay"
      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
        selected
          ? "border-log/50 bg-log/[0.06]"
          : "border-line/70 bg-white/[0.015] hover:border-log/40 hover:bg-white/[0.03]"
      }`}
    >
      <span className="w-9 shrink-0 text-[11px] text-faint">#{hand.id}</span>
      <span className={`w-12 shrink-0 font-bold ${p?.accent === "vega" ? "text-vega" : "text-bob"}`}>
        {p?.name ?? "—"}
      </span>
      <span className="w-16 shrink-0 font-semibold tabular-nums text-gold">
        {fmtAmount(hand.amountWon ?? 0n)}
      </span>
      <ReasonTag reason={hand.reason} />

      {hand.holes && (
        <div className="ml-1 hidden items-center gap-2.5 md:flex">
          {[0, 1].map((seat) => (
            <div key={seat} className="flex items-center gap-1">
              <span className={`text-[9px] ${seat === 0 ? "text-vega" : "text-bob"}`}>
                {persona(seat).name[0]}
              </span>
              {hand.holes![seat].map((c, i) => (
                <PlayingCard key={i} card={c} size="mini" />
              ))}
            </div>
          ))}
        </div>
      )}

      <span className="ml-auto flex items-center gap-2">
        {hand.audited && (
          <span className="text-log" title="deck audited on-chain">
            ✓
          </span>
        )}
        <span className="eyebrow !text-[9px] text-faint">▸</span>
      </span>
    </button>
  );
}

interface Props {
  hands: HandView[];
  onSelect?: (hand: HandView) => void;
  selectedId?: number | null;
}

export function HandHistory({ hands, onSelect, selectedId }: Props) {
  const finished = hands.filter((h) => h.settled).reverse();

  return (
    <section className="panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="eyebrow">hand history</h2>
        <span className="eyebrow">{finished.length} played · click to replay</span>
      </div>

      {finished.length === 0 ? (
        <p className="mt-3 text-sm text-muted">No hands settled yet.</p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {finished.map((h) => (
            <HistoryRow key={h.id} hand={h} onSelect={onSelect} selected={selectedId === h.id} />
          ))}
        </div>
      )}
    </section>
  );
}
