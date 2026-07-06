interface Props {
  on?: boolean;
  className?: string;
}

/** Pulsing status dot — green when live, muted when offline. */
export function LiveDot({ on = true, className = "" }: Props) {
  return (
    <span className={`relative inline-flex h-2 w-2 ${className}`}>
      {on && (
        <span className="absolute inline-flex h-full w-full rounded-full bg-log/60 animate-pulse-dot" />
      )}
      <span
        className={`relative inline-flex h-2 w-2 rounded-full ${on ? "bg-log" : "bg-faint"}`}
      />
    </span>
  );
}
