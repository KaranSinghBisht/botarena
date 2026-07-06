import { streetLabel } from "@/lib/enums";
import { fmtAmount } from "@/lib/format";
import { persona } from "@/lib/personas";
import type { ArenaEvent, HandView } from "@/lib/types";
import { ActionRow } from "./ActionRow";
import { SettledRow } from "./SettledRow";
import { ShowdownRow } from "./ShowdownRow";
import { StreetDivider } from "./StreetDivider";

function renderEvent(ev: ArenaEvent, hand: HandView) {
  switch (ev.kind) {
    case "ActionTaken":
      return <ActionRow key={ev.key} ev={ev} />;
    case "StreetRevealed":
      return <StreetDivider key={ev.key} label={streetLabel(ev.street)} cards={ev.cards} />;
    case "ShowdownResult":
      return <ShowdownRow key={ev.key} hand={hand} />;
    case "HandSettled":
    case "HandCanceled":
      return <SettledRow key={ev.key} hand={hand} />;
    case "DeckAudited":
      return (
        <div key={ev.key} className="animate-feed-in flex items-center gap-1.5 text-[11px] text-log">
          <span>✓</span> deck revealed &amp; verified on-chain
        </div>
      );
    default:
      return null;
  }
}

export function HandBlock({ hand }: { hand: HandView }) {
  return (
    <div className="space-y-2">
      <header className="flex items-center gap-2">
        <span className="text-[11px] font-bold tracking-wide text-ink">HAND #{hand.id}</span>
        <span className="h-px flex-1 bg-line/60" />
        <span className="text-[10px] tracking-wide text-faint">
          btn {persona(hand.button).name} · {fmtAmount(hand.smallBlind)}/{fmtAmount(hand.bigBlind)}
        </span>
      </header>

      <StreetDivider label="preflop" />
      {hand.events.map((ev) => renderEvent(ev, hand))}
    </div>
  );
}
