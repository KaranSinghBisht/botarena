import type { Hex } from "viem";

/** Provenance attached to every decoded event. */
export interface EventMeta {
  block: bigint;
  tx: Hex;
  logIndex: number;
  /** stable dedupe key `${tx}:${logIndex}` */
  key: string;
}

export type ArenaEvent =
  | ({ kind: "HandStarted"; handId: number; button: number; deckCommit: Hex; smallBlind: bigint; bigBlind: bigint } & EventMeta)
  | ({ kind: "ActionTaken"; handId: number; street: number; seat: number; action: number; amount: bigint; pot: bigint; quip: string; reasoning: string } & EventMeta)
  | ({ kind: "StreetRevealed"; handId: number; street: number; cards: number[] } & EventMeta)
  | ({ kind: "ShowdownResult"; handId: number; holes0: number[]; holes1: number[]; score0: bigint; score1: bigint } & EventMeta)
  | ({ kind: "HandSettled"; handId: number; winnerSeat: number; amountWon: bigint; reason: number } & EventMeta)
  | ({ kind: "HandCanceled"; handId: number; refund0: bigint; refund1: bigint } & EventMeta)
  | ({ kind: "DeckAudited"; handId: number; salt: Hex } & EventMeta)
  | ({ kind: "PlayerJoined"; seat: number; player: Hex; buyIn: bigint } & EventMeta)
  | ({ kind: "PlayerLeft"; seat: number; player: Hex; cashOut: bigint } & EventMeta);

export type ActionEvent = Extract<ArenaEvent, { kind: "ActionTaken" }>;

/** Raw getHand() tuple shape. */
export interface RawHand {
  id: bigint;
  button: number;
  street: number;
  toAct: number;
  communityCount: number;
  phase: number;
  deckCommit: Hex;
  community: readonly number[];
  pot: bigint;
  streetBet: readonly bigint[];
  handTotal: readonly bigint[];
  betToMatch: bigint;
  lastRaise: bigint;
  acted: readonly boolean[];
  deadline: bigint;
}

export type GetHandResult = readonly [RawHand, readonly Hex[], readonly bigint[]];

/** One fully reconstructed hand, assembled from its events. */
export interface HandView {
  id: number;
  button: number;
  smallBlind: bigint;
  bigBlind: bigint;
  deckCommit: Hex | null;
  events: ArenaEvent[];
  actions: ActionEvent[];
  board: number[];
  holes: [number[], number[]] | null;
  scores: [bigint, bigint] | null;
  winnerSeat: number | null;
  amountWon: bigint | null;
  reason: number | null;
  canceled: boolean;
  refunds: [bigint, bigint] | null;
  audited: boolean;
  /** deck was revealed on-chain (showdown reached or audit posted) */
  verified: boolean;
  potPeak: bigint;
  settled: boolean;
}

export interface SeatView {
  seat: number;
  address: Hex;
  stack: bigint;
  streetBet: bigint;
  isActing: boolean;
  holes: number[] | null;
}

export interface TableView {
  handId: number;
  phase: number;
  street: number;
  button: number;
  live: boolean;
  pot: bigint;
  deadline: number;
  toAct: number;
  deckCommit: Hex | null;
  verified: boolean;
  seats: [SeatView, SeatView];
  /** exactly 5 slots; null = face-down */
  board: (number | null)[];
  matchOver: boolean;
  matchWinner: number | null;
}

export interface Scoreboard {
  handsWon: [number, number];
  handsPlayed: number;
  stacks: [bigint, bigint];
  biggestPot: bigint;
  biggestPotHand: number | null;
}

/** Everything the UI needs for a render, derived once per poll. */
export interface ArenaState {
  hands: HandView[];
  table: TableView | null;
  scoreboard: Scoreboard;
  players: [Hex, Hex] | null;
}
