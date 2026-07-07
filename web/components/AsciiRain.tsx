/** Ambient background: slow vertical streams of card glyphs + protocol
    fragments, terminal-rain style. Pure CSS animation, fixed behind content. */

const SEQS = [
  "A♠ K♦ Q♥ J♣ T♠ 9♥ 8♣ 7♠ 7♥ 7♣ ",
  "keccak256(deck‖salt) → 0xb874efd7 ",
  "♠ ♥ ♦ ♣ ♠ ♥ ♦ ♣ raise 0.38 call ",
  "fold check call bet raise all-in ",
  "0xB0B1 0xF131 pot 1.9 tBOT gg ♠ ",
  "K♠ 7♥ full house · sevens full ",
  "block +0.75s tx confirmed ✓ ♦ ",
  "Q♥ J♦ A♣ K♥ showdown verified ",
];

interface Col {
  left: string; // percentage
  seq: number;
  dur: number; // seconds
  delay: number;
  size: number; // px
  color: string;
  opacity: number;
  down?: boolean;
  hideMobile?: boolean;
}

const COLS: Col[] = [
  { left: "3%", seq: 0, dur: 70, delay: 0, size: 12, color: "var(--color-vega)", opacity: 0.126 },
  { left: "11%", seq: 3, dur: 95, delay: -30, size: 11, color: "var(--color-faint)", opacity: 0.18, down: true, hideMobile: true },
  { left: "19%", seq: 1, dur: 110, delay: -55, size: 11, color: "var(--color-log)", opacity: 0.108, hideMobile: true },
  { left: "27%", seq: 5, dur: 80, delay: -12, size: 12, color: "var(--color-bob)", opacity: 0.108, down: true },
  { left: "38%", seq: 2, dur: 100, delay: -70, size: 11, color: "var(--color-faint)", opacity: 0.162, hideMobile: true },
  { left: "49%", seq: 6, dur: 88, delay: -40, size: 11, color: "var(--color-vega)", opacity: 0.099, down: true, hideMobile: true },
  { left: "60%", seq: 4, dur: 76, delay: -20, size: 12, color: "var(--color-gold)", opacity: 0.09 },
  { left: "70%", seq: 7, dur: 105, delay: -62, size: 11, color: "var(--color-faint)", opacity: 0.18, down: true, hideMobile: true },
  { left: "79%", seq: 0, dur: 92, delay: -48, size: 12, color: "var(--color-bob)", opacity: 0.108 },
  { left: "87%", seq: 2, dur: 118, delay: -8, size: 11, color: "var(--color-log)", opacity: 0.099, hideMobile: true },
  { left: "95%", seq: 5, dur: 84, delay: -33, size: 12, color: "var(--color-vega)", opacity: 0.126 },
];

export function AsciiRain() {
  return (
    <div className="ascii-rain" aria-hidden>
      {COLS.map((c, i) => {
        const body = SEQS[c.seq].repeat(6);
        return (
          <span
            key={i}
            className={`ascii-col ${c.down ? "ascii-col-down" : ""} ${c.hideMobile ? "hidden md:block" : ""}`}
            style={{
              left: c.left,
              color: c.color,
              opacity: c.opacity,
              fontSize: c.size,
              animationDuration: `${c.dur}s`,
              animationDelay: `${c.delay}s`,
            }}
          >
            {body}
            {body}
          </span>
        );
      })}
    </div>
  );
}
