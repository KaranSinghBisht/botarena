import { persona } from "@/lib/personas";
import type { HandView } from "@/lib/types";
import { PlayingCard } from "../ui/PlayingCard";

export function ShowdownRow({ hand }: { hand: HandView }) {
  if (!hand.holes) return null;

  return (
    <div className="animate-feed-in flex gap-2.5">
      <div className="flex flex-col items-center pt-[7px]">
        <span className="h-2 w-2 shrink-0 rounded-full bg-gold" />
        <span className="mt-1 w-px flex-1 bg-line" />
      </div>

      <div className="min-w-0 flex-1 pb-1">
        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">showdown</div>
        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">
          {[0, 1].map((seat) => {
            const p = persona(seat);
            const win = hand.winnerSeat === seat;
            return (
              <div key={seat} className="flex items-center gap-2">
                <span className={`text-xs font-bold ${p.accent === "vega" ? "text-vega" : "text-bob"}`}>
                  {p.name}
                </span>
                <div className="flex gap-1">
                  {hand.holes![seat].map((c, i) => (
                    <PlayingCard key={`${seat}-${i}`} card={c} size="chip" />
                  ))}
                </div>
                {win && <span className="text-[11px] text-gold">◆ best hand</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
