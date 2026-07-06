interface Props {
  children: React.ReactNode;
  tone?: "neutral" | "vega" | "bob" | "log" | "gold";
  className?: string;
}

const TONES: Record<NonNullable<Props["tone"]>, string> = {
  neutral: "border-line text-muted",
  vega: "border-vega/40 text-vega",
  bob: "border-bob/40 text-bob",
  log: "border-log/40 text-log",
  gold: "border-gold/40 text-gold",
};

/** Small monospace pill used for chain/table/status chips. */
export function Badge({ children, tone = "neutral", className = "" }: Props) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border bg-white/[0.015] px-2 py-1 text-[11px] leading-none ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
