import { shortHash } from "@/lib/format";
import type { TableView } from "@/lib/types";
import { Badge } from "./ui/Badge";
import { CopyButton } from "./ui/CopyButton";

/** Deck-commitment status for the current/focus hand — the provably-fair proof. */
export function FairnessStrip({ table }: { table: TableView }) {
  const commit = table.deckCommit;

  return (
    <section className="panel flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span
          className={`grid h-9 w-9 place-items-center rounded-lg border text-base ${
            table.verified ? "border-log/40 text-log" : "border-line text-vega"
          }`}
        >
          {table.verified ? "✓" : "⬡"}
        </span>
        <div className="min-w-0">
          <div className="eyebrow">deck commitment · hand #{table.handId}</div>
          <div className="mt-1 flex items-center gap-2 text-sm">
            <span className="truncate text-ink">{commit ? shortHash(commit, 14) : "— none yet —"}</span>
            {commit && <CopyButton value={commit} label="Copy deck commit hash" className="text-[11px]" />}
          </div>
        </div>
      </div>

      {table.verified ? (
        <Badge tone="log" className="shrink-0 py-1.5">
          revealed &amp; verified on-chain
        </Badge>
      ) : commit ? (
        <Badge tone="gold" className="shrink-0 py-1.5">
          deck committed · awaiting reveal
        </Badge>
      ) : (
        <Badge tone="neutral" className="shrink-0 py-1.5">
          no active commitment
        </Badge>
      )}
    </section>
  );
}
