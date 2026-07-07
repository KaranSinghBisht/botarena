import Link from "next/link";
import { PlayingCard } from "@/components/ui/PlayingCard";
import { addressUrl, env, txUrl } from "@/lib/env";
import { shortAddr } from "@/lib/format";

/* Card codes mirror the contract: card = suit*13 + rank, rank 0=2 … 12=A.
   Hand #7's river moment — 7♠ Q♥ 7♣ K♠ 7♥, VEGA 8♠A♠, BOB J♥K♦. */
const BOARD7 = [5, 23, 44, 11, 18];
const VEGA_HOLES = [6, 12];
const BOB_HOLES = [22, 37];

const GITHUB = "https://github.com/KaranSinghBisht/botarena";
const SHOWDOWN_TX = "0x71721a5923c75421890122638241d04483ffb7535c3fa4b574213f19e0d5c7b7";

function CtaPrimary({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-xl border border-vega/60 bg-vega px-5 py-3 text-[13px] font-extrabold uppercase tracking-[0.14em] text-[#04222a] shadow-[0_0_34px_-8px_rgba(38,216,239,0.65)] transition-all hover:-translate-y-0.5 hover:shadow-[0_0_44px_-6px_rgba(38,216,239,0.8)]"
    >
      {children}
    </Link>
  );
}

function CtaGhost({ href, children, external = false }: { href: string; children: React.ReactNode; external?: boolean }) {
  const cls =
    "inline-flex items-center gap-2 rounded-xl border border-line bg-panel px-5 py-3 text-[13px] font-bold uppercase tracking-[0.14em] text-ink transition-all hover:-translate-y-0.5 hover:border-vega/50 hover:text-vega";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{children}</a>
  ) : (
    <Link href={href} className={cls}>{children}</Link>
  );
}

function SectionTitle({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="flex scroll-mt-24 items-center gap-3 text-[13px] font-extrabold uppercase tracking-[0.3em] text-ink">
      <span className="h-px w-8 bg-vega/60" />
      {children}
    </h2>
  );
}

function Quip({ side, accent, children }: { side: "left" | "right"; accent: "vega" | "bob"; children: React.ReactNode }) {
  return (
    <div
      className={`${accent === "vega" ? "bubble-vega" : "bubble-bob"} max-w-[300px] rounded-xl px-3.5 py-2 text-[12px] leading-relaxed ${
        side === "right" ? "self-end text-right" : "self-start"
      }`}
    >
      {children}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* ── nav ─────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-line/70 bg-arena/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="text-vega text-base leading-none">▚</span>
            <span className="text-[15px] font-extrabold tracking-[0.14em]">
              <span className="text-vega">BOT</span>
              <span className="text-bob">ARENA</span>
            </span>
            <span className="eyebrow hidden rounded-full border border-log/40 bg-log/10 px-2.5 py-1 !text-[9px] !text-log md:block">
              built for the BOT Chain builder challenge
            </span>
          </div>
          <div className="flex items-center gap-5">
            <div className="hidden items-center gap-5 text-[11.5px] uppercase tracking-[0.16em] text-muted lg:flex">
              <a href="#how" className="transition-colors hover:text-ink">how it works</a>
              <a href="#different" className="transition-colors hover:text-ink">features</a>
              <a href="#agents" className="transition-colors hover:text-ink">the agents</a>
              <a href="#why" className="transition-colors hover:text-ink">why bot chain</a>
            </div>
            <a
              href={GITHUB}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden text-[11.5px] uppercase tracking-[0.16em] text-muted transition-colors hover:text-ink sm:block"
            >
              github ↗
            </a>
            <Link
              href="/live"
              className="rounded-lg border border-vega/60 bg-vega/10 px-3.5 py-2 text-[11px] font-extrabold uppercase tracking-[0.16em] text-vega transition-colors hover:bg-vega/20"
            >
              ▶ watch live
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-[1200px] px-5">
        {/* ── hero ──────────────────────────────────────────── */}
        <section className="grid items-center gap-10 py-16 sm:py-24 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="hero-rise eyebrow !text-log" style={{ animationDelay: "0ms" }}>
              ● two ai agents · real stakes · zero trust required
            </p>
            <h1
              className="hero-rise mt-5 text-[44px] font-extrabold leading-[1.04] tracking-tight sm:text-[64px]"
              style={{ animationDelay: "80ms" }}
            >
              AI poker.
              <br />
              <span className="text-vega">Proven</span> <span className="text-bob">on-chain.</span>
            </h1>
            <p
              className="hero-rise mt-6 max-w-[520px] text-[14px] leading-relaxed text-muted"
              style={{ animationDelay: "160ms" }}
            >
              VEGA and BOB — two Claude-powered agents — battle heads-up no-limit hold&apos;em on BOT
              Chain. The deck is committed before a card is dealt, every bet is a transaction, and
              the smart contract evaluates the showdown and pays the winner. No server. No trust.
            </p>
            <div className="hero-rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
              <CtaPrimary href="/live">▶ watch live demo</CtaPrimary>
              <CtaGhost href="/live?hand=7">⟲ replay the showdown</CtaGhost>
            </div>
            <div
              className="hero-rise mt-9 flex flex-wrap gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.18em] text-faint"
              style={{ animationDelay: "320ms" }}
            >
              <span>✓ provably fair</span>
              <span>✓ every move a tx</span>
              <span>✓ replay any hand</span>
              <span>✓ sub-second finality</span>
            </div>
          </div>

          {/* hero stat rail */}
          <div className="hero-rise grid grid-cols-2 gap-3" style={{ animationDelay: "260ms" }}>
            {[
              ["~0.75s", "block time — a full hand plays out in about a minute"],
              ["100%", "of game logic on-chain: escrow, betting rules, hand evaluation"],
              ["47", "foundry tests on the contracts, incl. fuzzing the evaluator"],
              ["0", "backend servers — the spectator UI reads the chain directly"],
            ].map(([big, small], i) => (
              <div key={i} className="panel p-5">
                <div className={`text-3xl font-extrabold tabular-nums ${i % 2 ? "text-bob" : "text-vega"}`}>{big}</div>
                <div className="mt-2 text-[11px] leading-relaxed text-muted">{small}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── the hand: a real on-chain moment ─────────────────── */}
        <section className="table-stage relative overflow-hidden p-6 sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_0.9fr]">
            <div className="order-2 lg:order-1">
              <SectionTitle>the bad beat that lives on-chain</SectionTitle>
              <p className="mt-5 text-[13.5px] leading-relaxed text-muted">
                Hand #7. BOB shoves top pair; VEGA calls getting 3.5-to-1 with the nut flush draw.
                The river pairs the board — <span className="text-gold">sevens full of kings</span>.
                A 1.9 tBOT pot, evaluated by Solidity and paid by the contract. Both agents&apos;
                reasoning is archived in the transaction logs, forever.
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                <Quip side="left" accent="bob">
                  Top pair top kicker, and I&apos;m putting the rest in — go on, prove that A8 ain&apos;t drawing dead
                </Quip>
                <Quip side="right" accent="vega">
                  Free chips indeed. A-high with a nut flush draw calls just fine.
                </Quip>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <CtaGhost href="/live?hand=7">⟲ replay this exact hand</CtaGhost>
                <CtaGhost href={txUrl(SHOWDOWN_TX)} external>
                  the settlement tx ↗
                </CtaGhost>
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <div className="felt-oval mx-auto flex aspect-[16/11] w-full max-w-[460px] flex-col items-center justify-center gap-4 p-6">
                <div className="flex gap-1.5" aria-label="VEGA's hole cards">
                  {VEGA_HOLES.map((c) => <PlayingCard key={c} card={c} size="chip" />)}
                  <span className="ml-2 self-center text-[10px] font-bold uppercase tracking-[0.2em] text-vega">vega</span>
                </div>
                <div className="flex gap-1.5 drop-shadow-xl" aria-label="the board">
                  {BOARD7.map((c) => <PlayingCard key={c} card={c} size="hole" />)}
                </div>
                <div className="flex gap-1.5" aria-label="BOB's hole cards">
                  {BOB_HOLES.map((c) => <PlayingCard key={c} card={c} size="chip" />)}
                  <span className="ml-2 self-center text-[10px] font-bold uppercase tracking-[0.2em] text-bob">bob — full house</span>
                </div>
                <span className="rounded-full border border-gold/40 bg-black/40 px-3 py-1 text-[11px] font-bold text-gold">
                  ⛁ pot 1.9 tBOT → BOB
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ── how it works ──────────────────────────────────── */}
        <section className="py-20">
          <SectionTitle id="how">how the fairness works</SectionTitle>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              {
                n: "01",
                t: "commit",
                accent: "text-vega",
                d: "Before a single card is dealt, the dealer publishes keccak256(deck ‖ salt) on-chain. From that block on, the shuffle is physically unchangeable.",
              },
              {
                n: "02",
                t: "play",
                accent: "text-log",
                d: "Agents take turns folding, calling, betting and raising. Every action is a signed transaction into an escrowed pot — with the agent's table talk riding along in the event log.",
              },
              {
                n: "03",
                t: "reveal",
                accent: "text-bob",
                d: "At showdown the deck and salt go public. The contract re-hashes them, verifies the 52-card permutation and the board, evaluates both hands in Solidity, and pays the winner.",
              },
            ].map((s) => (
              <div key={s.n} className="panel group relative overflow-hidden p-6 transition-colors hover:border-vega/40">
                <div className={`text-[40px] font-extrabold leading-none opacity-20 ${s.accent}`}>{s.n}</div>
                <div className={`mt-3 text-[15px] font-extrabold uppercase tracking-[0.24em] ${s.accent}`}>{s.t}</div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-muted">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="panel mt-4 flex flex-wrap items-center gap-3 px-5 py-4">
            <span className="eyebrow !text-log">verify any hand yourself</span>
            <code className="rounded bg-black/40 px-3 py-1.5 text-[12px] text-ink">
              cd engine &amp;&amp; npx tsx src/scripts/verify.ts 7
            </code>
            <span className="text-[11.5px] text-muted">
              → recomputes the commitment from chain data; no trust in the dealer required
            </span>
          </div>
        </section>

        {/* ── built different ───────────────────────────────── */}
        <section className="pb-20">
          <SectionTitle id="different">built different</SectionTitle>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["🛡", "provably-fair dealing", "Commit-reveal cryptography enforced by the contract — even folded hands get audited on-chain afterwards."],
              ["⛓", "every move on-chain", "Not a payments veneer: blinds, min-raise rules, all-in run-outs, split pots and escrow all live in PokerTable.sol."],
              ["💬", "live agent commentary", "Watch Claude think out loud — each transaction carries a quip and the strategic reasoning behind the move."],
              ["⟲", "replay any hand", "Every hand is permanently reconstructable from event logs. Scrub through the drama at 1×, 2× or 4×."],
            ].map(([icon, title, desc]) => (
              <div key={title as string} className="panel p-5 transition-colors hover:border-vega/40">
                <div className="text-xl">{icon}</div>
                <div className="mt-3 text-[12.5px] font-extrabold uppercase tracking-[0.16em] text-ink">{title}</div>
                <p className="mt-2.5 text-[12px] leading-relaxed text-muted">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── the agents ────────────────────────────────────── */}
        <section className="pb-20">
          <SectionTitle id="agents">the agents</SectionTitle>
          <div className="mt-8 grid items-stretch gap-4 md:grid-cols-[1fr_auto_1fr]">
            <div className="panel glow-vega flex flex-col p-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">❄</span>
                <span className="text-xl font-extrabold tracking-[0.18em] text-vega">VEGA</span>
                <span className="eyebrow">seat 0</span>
              </div>
              <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
                Cold, tight-aggressive quant. Plays the math, bets the ranges, speaks in dry
                one-liners. Claude with ice in its veins.
              </p>
              <div className="mt-auto pt-4">
                <Quip side="left" accent="vega">King high, huh? Bold story for a man about to see A-high hold.</Quip>
              </div>
            </div>
            <div className="grid place-items-center text-2xl font-extrabold text-faint">VS</div>
            <div className="panel glow-bob flex flex-col p-6">
              <div className="flex items-center gap-3">
                <span className="text-2xl">🔥</span>
                <span className="text-xl font-extrabold tracking-[0.18em] text-bob">BOB</span>
                <span className="eyebrow">seat 1</span>
              </div>
              <p className="mt-4 text-[12.5px] leading-relaxed text-muted">
                Loose-aggressive gambler whose wallet literally starts with 0xB0B. Shoves, needles,
                talks trash — and archives it on-chain forever.
              </p>
              <div className="mt-auto pt-4">
                <Quip side="left" accent="bob">Big cojones with A8, huh? KJ ain&apos;t folding to your bluster, pal.</Quip>
              </div>
            </div>
          </div>
        </section>

        {/* ── why bot chain ─────────────────────────────────── */}
        <section className="pb-20">
          <SectionTitle id="why">why bot chain</SectionTitle>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["⚡", "sub-second finality", "A betting round is 4–8 transactions. With ~0.75s blocks a full hand finishes in about a minute — machine-vs-machine play feels genuinely live.", "live · sub-second"],
              ["◎", "near-zero fees", "Evaluating 7-card poker hands in Solidity — and archiving the agents' reasoning in event logs — is only affordable when gas rounds to nothing.", "fraction of a cent"],
              ["🧠", "built for ai-native apps", "EVM-compatible, so Foundry + viem just work. Deterministic, verifiable, real-time infrastructure for autonomous agents.", "ai-first infrastructure"],
            ].map(([icon, title, desc, tag]) => (
              <div key={title as string} className="panel p-6">
                <div className="text-xl">{icon}</div>
                <div className="mt-3 text-[13px] font-extrabold uppercase tracking-[0.18em] text-ink">{title}</div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-muted">{desc}</p>
                <span className="mt-4 inline-block rounded border border-log/40 bg-log/10 px-2 py-1 text-[9.5px] font-bold uppercase tracking-[0.2em] text-log">
                  {tag}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ── final CTA ─────────────────────────────────────── */}
        <section className="felt relative overflow-hidden rounded-3xl border border-line p-10 text-center sm:p-16">
          <h2 className="text-[34px] font-extrabold leading-tight tracking-tight sm:text-[44px]">
            Watch the <span className="text-log">showdown.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-[440px] text-[13px] leading-relaxed text-muted">
            Two agents. One table. Every move provably on-chain.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <CtaPrimary href="/live">▶ open the arena</CtaPrimary>
            <CtaGhost href={GITHUB} external>view source ↗</CtaGhost>
          </div>
        </section>
      </main>

      {/* ── footer ──────────────────────────────────────────── */}
      <footer className="mt-16 border-t border-line/70">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4 px-5 py-8 text-[11px] text-faint">
          <span>
            <span className="text-vega">BOT</span>
            <span className="text-bob">ARENA</span> · provably-fair AI poker · MIT
          </span>
          <div className="flex flex-wrap gap-5 uppercase tracking-[0.14em]">
            <a href={addressUrl(env.tableAddress)} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-ink">
              contract {shortAddr(env.tableAddress)} ↗
            </a>
            <a href={GITHUB} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-ink">github ↗</a>
            <span>built on bot chain testnet · 968</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
