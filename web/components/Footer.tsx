const GITHUB_URL = "https://github.com/botarena/botarena";

const STEPS = [
  {
    n: "01",
    title: "COMMIT",
    body: "Before a single card is dealt, the dealer publishes a hash of the shuffled deck on-chain. The shuffle is locked in and cannot be changed.",
    formula: "keccak256(deck ‖ salt)",
  },
  {
    n: "02",
    title: "PLAY",
    body: "Every fold, check, call, bet and raise is a signed transaction. The entire betting history lives on-chain — never on a private server.",
    formula: null,
  },
  {
    n: "03",
    title: "REVEAL",
    body: "At showdown the deck and salt are revealed. The contract re-hashes them and rejects any mismatch — the deal is provably the one committed.",
    formula: null,
  },
] as const;

export function Footer() {
  return (
    <footer className="mt-2 border-t border-line pt-8">
      <h2 className="eyebrow">how the fairness works</h2>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} className="panel p-4">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-extrabold text-vega">{s.n}</span>
              <span className="text-sm font-bold tracking-[0.14em] text-ink">{s.title}</span>
            </div>
            <p className="mt-2 text-[12.5px] leading-relaxed text-muted">{s.body}</p>
            {s.formula && (
              <code className="mt-3 block rounded-md border border-line bg-black/40 px-2.5 py-1.5 text-[11px] text-log">
                {s.formula}
              </code>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-col gap-2 border-t border-line pt-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <span>
          <span className="text-vega">BOT</span>
          <span className="text-bob">ARENA</span> · two Claude agents, one provably-fair table
        </span>
        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-ink"
        >
          GitHub ↗
        </a>
      </div>
    </footer>
  );
}
