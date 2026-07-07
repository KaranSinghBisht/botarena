import type { Hex } from "viem";
import type { StageProps } from "@/components/poker/PokerTable";
import type { PodData } from "@/components/poker/SeatPod";
import { phaseLabel, streetLabel } from "./enums";
import { fmtBot } from "./format";
import { persona } from "./personas";
import type { ReplayStep } from "./replay";
import type { HandView, TableView } from "./types";

/** Assemble the stage from live chain state. */
export function buildLiveStage(table: TableView, hands: HandView[]): StageProps {
  const current = hands.find((h) => h.id === table.handId) ?? null;
  const last = current?.actions[current.actions.length - 1] ?? null;
  const foldedSeat = current?.reason === 0 ? 1 - (current.winnerSeat ?? 0) : null;

  const pod = (i: number): PodData => ({
    seat: i,
    address: table.seats[i].address,
    stack: table.seats[i].stack,
    holes: table.seats[i].holes ?? [null, null],
    isButton: table.button === i,
    isActing: table.seats[i].isActing,
    folded: foldedSeat === i,
    deadline: table.deadline,
    isWinner: table.matchWinner === i || (!table.live && current?.winnerSeat === i),
  });

  const banner = table.matchOver
    ? `${persona(table.matchWinner ?? 0).name} takes the match`
    : !table.live && current?.settled && current.winnerSeat !== null
      ? `${persona(current.winnerSeat).name} wins ${fmtBot(current.amountWon ?? 0n)}`
      : null;

  // the contract zeroes `street` when a hand settles — recover it from the board
  const boardCount = table.board.filter((c) => c !== null).length;
  const street = table.live ? table.street : boardCount === 5 ? 3 : boardCount === 4 ? 2 : boardCount === 3 ? 1 : 0;

  return {
    handId: table.handId,
    statusLabel: table.matchOver
      ? "match complete"
      : table.live
        ? `${streetLabel(table.street)} · ${phaseLabel(table.phase)}`
        : "waiting for next hand",
    live: table.live,
    pods: [pod(0), pod(1)],
    bets: [table.seats[0].streetBet, table.seats[1].streetBet],
    board: table.board,
    pot: table.pot,
    street,
    // only voice quips while the hand is actually live — otherwise the last
    // one lingers forever on an idle table and looks stale
    quip: table.live && last ? { seat: last.seat, text: last.quip, reasoning: last.reasoning } : null,
    banner,
  };
}

/** Assemble the stage from one step of a hand replay. */
export function buildReplayStage(
  hand: HandView,
  step: ReplayStep,
  index: number,
  total: number,
  players: [Hex, Hex] | null,
): StageProps {
  const pod = (i: number): PodData => ({
    seat: i,
    address: players?.[i] ?? null,
    stack: null,
    holes: step.holes?.[i] ?? [null, null],
    isButton: hand.button === i,
    isActing: step.actor === i,
    folded: step.folded[i],
    deadline: 0,
    isWinner: step.winnerSeat === i,
  });

  return {
    handId: hand.id,
    statusLabel: `replay · ${index + 1}/${total}`,
    live: false,
    pods: [pod(0), pod(1)],
    bets: step.streetBet,
    board: Array.from({ length: 5 }, (_, i) => step.board[i] ?? null),
    pot: step.pot,
    street: step.street,
    quip: step.actor >= 0 ? { seat: step.actor, text: step.quip, reasoning: step.reasoning } : null,
    banner:
      step.winnerSeat !== null
        ? `${persona(step.winnerSeat).name} wins ${fmtBot(step.amountWon ?? 0n)}`
        : null,
  };
}
