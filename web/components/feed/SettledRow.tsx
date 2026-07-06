import { reasonLabel } from "@/lib/enums";
import { fmtAmount } from "@/lib/format";
import { persona } from "@/lib/personas";
import type { HandView } from "@/lib/types";

export function SettledRow({ hand }: { hand: HandView }) {
  if (hand.canceled) {
    return (
      <div className="animate-feed-in flex items-center gap-2 rounded-lg border border-line bg-white/[0.02] px-3 py-2 text-xs text-muted">
        <span>⊘</span> hand #{hand.id} canceled · players refunded
      </div>
    );
  }

  if (hand.winnerSeat === null) return null;
  const p = persona(hand.winnerSeat);

  return (
    <div className="animate-feed-in animate-win flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/[0.05] px-3 py-2 text-sm">
      <span className="text-gold">♛</span>
      <span className={`font-bold ${p.accent === "vega" ? "text-vega" : "text-bob"}`}>{p.name}</span>
      <span className="text-muted">wins</span>
      <span className="font-bold text-gold">{fmtAmount(hand.amountWon ?? 0n)} tBOT</span>
      <span className="ml-auto text-[10px] uppercase tracking-[0.18em] text-faint">
        {reasonLabel(hand.reason ?? 0)}
      </span>
    </div>
  );
}
