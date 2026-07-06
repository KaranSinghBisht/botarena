import { PlayingCard } from "../ui/PlayingCard";

interface Props {
  label: string;
  cards?: number[];
}

/** Marks a street transition inside a hand's feed, showing any newly-dealt cards. */
export function StreetDivider({ label, cards }: Props) {
  return (
    <div className="flex items-center gap-2.5 py-1">
      <span className="shrink-0 text-[10px] font-bold uppercase tracking-[0.22em] text-faint">
        {label}
      </span>
      {cards && cards.length > 0 && (
        <div className="flex gap-1">
          {cards.map((c, i) => (
            <PlayingCard key={`${label}-${i}-${c}`} card={c} size="chip" reveal />
          ))}
        </div>
      )}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
