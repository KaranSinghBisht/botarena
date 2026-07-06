import { fmtAmount } from "@/lib/format";

export function PotDisplay({ pot }: { pot: bigint }) {
  return (
    <div className="text-center">
      <div className="eyebrow">pot</div>
      <div className="mt-1 text-[28px] font-extrabold leading-none tabular-nums sm:text-4xl">
        {fmtAmount(pot)}
        <span className="ml-1.5 text-sm font-medium text-muted">tBOT</span>
      </div>
    </div>
  );
}
