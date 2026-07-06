/** On-chain enum + index label maps (mirror PokerTable.sol). */

export const PHASE = ["Idle", "Betting", "AwaitReveal", "AwaitShowdown"] as const;
export const PHASE_IDLE = 0;
export const PHASE_BETTING = 1;

export const ACTION = ["fold", "check", "call", "bet", "raise"] as const;

export const SETTLE_REASON = ["Fold", "Showdown", "Split Pot", "Timeout"] as const;

export const STREET = ["preflop", "flop", "turn", "river"] as const;

export function phaseLabel(i: number): string {
  return PHASE[i] ?? "Unknown";
}
export function actionLabel(i: number): string {
  return ACTION[i] ?? "acts";
}
export function reasonLabel(i: number): string {
  return SETTLE_REASON[i] ?? "Settled";
}
export function streetLabel(i: number): string {
  return STREET[i] ?? "street";
}
