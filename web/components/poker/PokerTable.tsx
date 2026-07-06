import { phaseLabel, streetLabel } from "@/lib/enums";
import { persona } from "@/lib/personas";
import type { TableView } from "@/lib/types";
import { BoardCards } from "./BoardCards";
import { PotDisplay } from "./PotDisplay";
import { SeatPanel } from "./SeatPanel";

export function PokerTable({ table }: { table: TableView }) {
  const centerLabel = table.matchOver
    ? "match complete"
    : table.live
      ? `${streetLabel(table.street)} · ${phaseLabel(table.phase)}`
      : "waiting for next hand";

  return (
    <section className="felt rounded-[26px] p-3 sm:p-6">
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="eyebrow">hand #{table.handId}</span>
        <span className="eyebrow flex items-center gap-1.5">
          {table.live && <span className="h-1.5 w-1.5 rounded-full bg-log animate-pulse-dot" />}
          {centerLabel}
        </span>
      </div>

      <SeatPanel seat={table.seats[0]} isButton={table.button === 0} deadline={table.deadline} />

      <div className="my-6 flex flex-col items-center gap-5">
        <PotDisplay pot={table.pot} />
        <BoardCards board={table.board} />
      </div>

      <SeatPanel seat={table.seats[1]} isButton={table.button === 1} deadline={table.deadline} />

      {table.matchOver && table.matchWinner !== null && (
        <div className="mt-4 rounded-xl border border-gold/40 bg-gold/[0.06] py-2.5 text-center text-sm font-bold tracking-wide text-gold">
          ♛ {persona(table.matchWinner).name} takes the match
        </div>
      )}
    </section>
  );
}
