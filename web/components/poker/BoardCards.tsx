import { PlayingCard } from "../ui/PlayingCard";

/** The five community-card slots; face-down until revealed on-chain. */
export function BoardCards({ board }: { board: (number | null)[] }) {
  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-2.5">
      {board.map((card, i) => (
        <PlayingCard key={`${i}-${card ?? "x"}`} card={card} size="board" reveal={card != null} />
      ))}
    </div>
  );
}
