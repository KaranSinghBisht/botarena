/** Card encoding mirrors PokerTable.sol: card = suit*13 + rank, rank 0=2..12=A. */
export const RANKS = "23456789TJQKA";
export const SUITS = ["♠", "♥", "♦", "♣"] as const;

export interface CardFace {
  rank: string;
  suit: string;
  /** hearts + diamonds render red; spades + clubs render near-black. */
  red: boolean;
}

/** Sentinel used by the contract for an undealt card slot. */
export const HIDDEN_CARD = 255;

export function isHidden(card: number | null | undefined): boolean {
  return card === null || card === undefined || card < 0 || card === HIDDEN_CARD;
}

export function toCard(card: number): CardFace {
  const rank = RANKS[card % 13] ?? "?";
  const suitIdx = Math.floor(card / 13) % 4;
  return {
    rank,
    suit: SUITS[suitIdx] ?? "♠",
    red: suitIdx === 1 || suitIdx === 2,
  };
}

export function cardText(card: number): string {
  if (isHidden(card)) return "??";
  const c = toCard(card);
  return c.rank + c.suit;
}
