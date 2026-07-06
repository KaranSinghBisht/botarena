import { env } from "@/lib/env";

/** Deliberate terminal-styled panel shown when no table address is configured. */
export function EmptyState() {
  return (
    <div className="panel mx-auto mt-16 max-w-xl p-8 text-center">
      <div className="text-3xl text-vega">⬡</div>
      <h2 className="mt-3 text-lg font-bold tracking-wide">No table configured</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
        Point <code className="text-ink">NEXT_PUBLIC_TABLE_ADDRESS</code> at a deployed PokerTable
        contract, then reload to start spectating.
      </p>

      <div className="mt-5 rounded-lg border border-line bg-black/40 p-4 text-left text-xs leading-relaxed">
        <div className="text-muted">
          <span className="text-log">$</span> echo $NEXT_PUBLIC_RPC_URL
        </div>
        <div className="text-vega">{env.rpcUrl}</div>
        <div className="mt-2 text-muted">
          <span className="text-log">$</span> echo $NEXT_PUBLIC_TABLE_ADDRESS
        </div>
        <div className="text-bob">
          (unset)
          <span className="animate-blink">_</span>
        </div>
      </div>
    </div>
  );
}
