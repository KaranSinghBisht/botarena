import { streetLabel } from "@/lib/enums";
import { fmtAmount } from "@/lib/format";

/** Dark pot pill on the felt: "⛁ 1.9 · flop". */
export function PotDisplay({ pot, street }: { pot: bigint; street: number }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-white/10 bg-[#0a0f16]/95 px-3.5 py-1.5 shadow-xl">
      <span className="chip-token grid h-5 w-5 place-items-center rounded-full text-[9px] text-ink/70">⛁</span>
      <span className="text-lg font-extrabold tabular-nums leading-none">{fmtAmount(pot)}</span>
      <span className="eyebrow !text-[9px] border-l border-white/10 pl-2.5">{streetLabel(street)}</span>
    </div>
  );
}
