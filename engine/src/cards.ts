import { randomBytes, randomInt } from "node:crypto";
import { concatHex, keccak256, toHex, type Hex } from "viem";

/** Card encoding mirrors PokerTable.sol: card = suit*13 + rank, rank 0=2..12=A. */
export const RANKS = "23456789TJQKA";
export const SUITS = ["♠", "♥", "♦", "♣"];

export function fmtCard(card: number): string {
  return RANKS[card % 13] + SUITS[Math.floor(card / 13)];
}

export function fmtCards(cards: readonly number[]): string {
  return cards.map(fmtCard).join(" ");
}

/** Cryptographically shuffled 52-card deck (Fisher-Yates over crypto randomInt). */
export function shuffledDeck(): number[] {
  const deck = Array.from({ length: 52 }, (_, i) => i);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function deckToHex(deck: readonly number[]): Hex {
  return toHex(new Uint8Array(deck));
}

export function randomSalt(): Hex {
  return toHex(randomBytes(32));
}

/** Matches Solidity keccak256(abi.encodePacked(bytes deck, bytes32 salt)). */
export function deckCommit(deck: readonly number[], salt: Hex): Hex {
  return keccak256(concatHex([deckToHex(deck), salt]));
}

/** Fixed deal layout shared with the contract. */
export const DEAL = {
  holes: [
    [0, 1],
    [2, 3],
  ],
  flop: [4, 5, 6],
  turn: 7,
  river: 8,
} as const;
