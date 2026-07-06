import { decodeEventLog, type Hex, type Log } from "viem";
import { pokerTableAbi } from "./abi";
import type { ArenaEvent, EventMeta } from "./types";

const num = (v: unknown) => Number(v as bigint | number);
const nums = (v: unknown) => [...((v as readonly (bigint | number)[]) ?? [])].map(num);

/** Decode one raw log into a normalized ArenaEvent, or null if unrecognized. */
export function decodeArenaLog(log: Log): ArenaEvent | null {
  let decoded: { eventName: string; args: Record<string, unknown> };
  try {
    decoded = decodeEventLog({ abi: pokerTableAbi, data: log.data, topics: log.topics }) as unknown as {
      eventName: string;
      args: Record<string, unknown>;
    };
  } catch {
    return null;
  }

  const meta: EventMeta = {
    block: log.blockNumber ?? 0n,
    tx: (log.transactionHash ?? "0x") as Hex,
    logIndex: log.logIndex ?? 0,
    key: `${log.transactionHash}:${log.logIndex}`,
  };
  const a = decoded.args;

  switch (decoded.eventName) {
    case "HandStarted":
      return { kind: "HandStarted", handId: num(a.handId), button: num(a.button), deckCommit: a.deckCommit as Hex, smallBlind: a.smallBlind as bigint, bigBlind: a.bigBlind as bigint, ...meta };
    case "ActionTaken":
      return { kind: "ActionTaken", handId: num(a.handId), street: num(a.street), seat: num(a.seat), action: num(a.action), amount: a.amount as bigint, pot: a.pot as bigint, quip: (a.quip as string) ?? "", reasoning: (a.reasoning as string) ?? "", ...meta };
    case "StreetRevealed":
      return { kind: "StreetRevealed", handId: num(a.handId), street: num(a.street), cards: nums(a.cards), ...meta };
    case "ShowdownResult":
      return { kind: "ShowdownResult", handId: num(a.handId), holes0: nums(a.holes0), holes1: nums(a.holes1), score0: a.score0 as bigint, score1: a.score1 as bigint, ...meta };
    case "HandSettled":
      return { kind: "HandSettled", handId: num(a.handId), winnerSeat: num(a.winnerSeat), amountWon: a.amountWon as bigint, reason: num(a.reason), ...meta };
    case "HandCanceled":
      return { kind: "HandCanceled", handId: num(a.handId), refund0: a.refund0 as bigint, refund1: a.refund1 as bigint, ...meta };
    case "DeckAudited":
      return { kind: "DeckAudited", handId: num(a.handId), salt: a.salt as Hex, ...meta };
    case "PlayerJoined":
      return { kind: "PlayerJoined", seat: num(a.seat), player: a.player as Hex, buyIn: a.buyIn as bigint, ...meta };
    case "PlayerLeft":
      return { kind: "PlayerLeft", seat: num(a.seat), player: a.player as Hex, cashOut: a.cashOut as bigint, ...meta };
    default:
      return null;
  }
}

/** Chronological order: block number, then log index within block. */
export function compareEvents(a: ArenaEvent, b: ArenaEvent): number {
  if (a.block !== b.block) return a.block < b.block ? -1 : 1;
  return a.logIndex - b.logIndex;
}
