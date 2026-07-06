import { isHidden, toCard } from "@/lib/cards";

export type CardSize = "board" | "hole" | "chip" | "mini";

interface Dim {
  box: string;
  radius: string;
  rank: string;
  suit: string;
}

const DIMS: Record<CardSize, Dim> = {
  board: { box: "w-[clamp(38px,9vw,54px)] h-[clamp(54px,13vw,76px)]", radius: "rounded-[9px]", rank: "text-[15px]", suit: "text-[26px]" },
  hole: { box: "w-[38px] h-[54px]", radius: "rounded-md", rank: "text-[12px]", suit: "text-[19px]" },
  chip: { box: "w-[25px] h-[33px]", radius: "rounded-[5px]", rank: "text-[10px]", suit: "text-[13px]" },
  mini: { box: "w-[20px] h-[27px]", radius: "rounded-[4px]", rank: "text-[8px]", suit: "text-[11px]" },
};

interface Props {
  card: number | null;
  size?: CardSize;
  /** apply the flip-in reveal keyframe (only meaningful on mount) */
  reveal?: boolean;
}

export function PlayingCard({ card, size = "hole", reveal = false }: Props) {
  const d = DIMS[size];

  if (isHidden(card)) {
    return (
      <div
        className={`card-back ${d.box} ${d.radius} shrink-0 grid place-items-center`}
        aria-label="face-down card"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-vega/40" />
      </div>
    );
  }

  const c = toCard(card as number);
  const red = c.red ? "card-red" : "";
  const compact = size === "chip" || size === "mini";

  if (compact) {
    return (
      <div
        className={`card-face ${d.box} ${d.radius} shrink-0 grid place-items-center font-bold leading-none ${red}`}
        aria-label={`${c.rank}${c.suit}`}
      >
        <span className={`${d.rank} flex items-center gap-px`}>
          {c.rank}
          <span className={d.suit}>{c.suit}</span>
        </span>
      </div>
    );
  }

  return (
    <div
      className={`card-face ${d.box} ${d.radius} shrink-0 relative grid place-items-center ${
        reveal ? "animate-flip-in" : ""
      }`}
      aria-label={`${c.rank}${c.suit}`}
    >
      <span className={`absolute left-1 top-0.5 font-bold leading-none ${d.rank} ${red}`}>
        {c.rank}
      </span>
      <span className={`${d.suit} font-bold leading-none ${red}`}>{c.suit}</span>
    </div>
  );
}
