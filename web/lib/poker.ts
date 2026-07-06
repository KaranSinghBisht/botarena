import type { Hex } from "viem";
import { PHASE_BETTING, PHASE_IDLE } from "./enums";
import { compareEvents } from "./events";
import type {
  ArenaEvent,
  ArenaState,
  GetHandResult,
  HandView,
  RawHand,
  Scoreboard,
  SeatView,
  TableView,
} from "./types";

const ZERO = "0x0000000000000000000000000000000000000000" as Hex;

function pick<K extends ArenaEvent["kind"]>(
  events: ArenaEvent[],
  kind: K,
): Extract<ArenaEvent, { kind: K }> | undefined {
  return events.find((e) => e.kind === kind) as Extract<ArenaEvent, { kind: K }> | undefined;
}

function pickAll<K extends ArenaEvent["kind"]>(
  events: ArenaEvent[],
  kind: K,
): Extract<ArenaEvent, { kind: K }>[] {
  return events.filter((e) => e.kind === kind) as Extract<ArenaEvent, { kind: K }>[];
}

function maxBigint(values: bigint[]): bigint {
  return values.reduce((m, v) => (v > m ? v : m), 0n);
}

function nonzeroHash(h: Hex): Hex | null {
  return /^0x0*$/.test(h) ? null : h;
}

/** Reconstruct a single hand from its chronologically-sorted events. */
function assembleHand(id: number, events: ArenaEvent[]): HandView {
  events.sort(compareEvents);
  const started = pick(events, "HandStarted");
  const actions = pickAll(events, "ActionTaken");
  const reveals = [...pickAll(events, "StreetRevealed")].sort((a, b) => a.street - b.street);
  const showdown = pick(events, "ShowdownResult");
  const settled = pick(events, "HandSettled");
  const canceled = pick(events, "HandCanceled");
  const audited = events.some((e) => e.kind === "DeckAudited");

  return {
    id,
    button: started?.button ?? 0,
    smallBlind: started?.smallBlind ?? 0n,
    bigBlind: started?.bigBlind ?? 0n,
    deckCommit: started?.deckCommit ?? null,
    events,
    actions,
    board: reveals.flatMap((r) => r.cards),
    holes: showdown ? [showdown.holes0, showdown.holes1] : null,
    scores: showdown ? [showdown.score0, showdown.score1] : null,
    winnerSeat: settled?.winnerSeat ?? null,
    amountWon: settled?.amountWon ?? null,
    reason: settled?.reason ?? null,
    canceled: Boolean(canceled),
    refunds: canceled ? [canceled.refund0, canceled.refund1] : null,
    audited,
    verified: Boolean(showdown) || audited,
    potPeak: maxBigint([...actions.map((a) => a.pot), settled?.amountWon ?? 0n]),
    settled: Boolean(settled) || Boolean(canceled),
  };
}

/** Group all hand-scoped events by hand id, ascending. */
export function buildHands(events: ArenaEvent[]): HandView[] {
  const groups = new Map<number, ArenaEvent[]>();
  for (const e of events) {
    if (!("handId" in e)) continue;
    const list = groups.get(e.handId) ?? [];
    list.push(e);
    groups.set(e.handId, list);
  }
  return [...groups.entries()]
    .map(([id, evs]) => assembleHand(id, evs))
    .sort((a, b) => a.id - b.id);
}

function boardSlots(live: boolean, h: RawHand, focus?: HandView): (number | null)[] {
  const revealed = live ? h.community.slice(0, h.communityCount) : (focus?.board ?? []);
  return Array.from({ length: 5 }, (_, i) => (i < revealed.length ? revealed[i] : null));
}

/** Merge live getHand() state with the reconstructed focus hand for the centerpiece. */
export function buildTableView(raw: GetHandResult | null, hands: HandView[]): TableView | null {
  if (!raw) return null;
  const [h, players, stacks] = raw;
  const live = h.phase !== PHASE_IDLE;
  const focus = hands.find((x) => x.id === Number(h.id)) ?? hands[hands.length - 1];
  const holes = focus?.holes ?? null;
  const toAct = live && h.phase === PHASE_BETTING ? h.toAct : -1;

  const seat = (i: number, address: Hex, stack: bigint): SeatView => ({
    seat: i,
    address,
    stack,
    streetBet: live ? (h.streetBet[i] ?? 0n) : 0n,
    isActing: toAct === i,
    holes: holes ? holes[i] : null,
  });

  const s0 = stacks[0] ?? 0n;
  const s1 = stacks[1] ?? 0n;
  const matchOver = !live && hands.some((x) => x.settled) && (s0 === 0n || s1 === 0n);

  return {
    handId: Number(h.id),
    phase: h.phase,
    street: h.street,
    button: h.button,
    live,
    pot: live ? h.pot : (focus?.potPeak ?? 0n),
    deadline: live ? Number(h.deadline) : 0,
    toAct,
    deckCommit: focus?.deckCommit ?? nonzeroHash(h.deckCommit),
    verified: focus?.verified ?? false,
    seats: [seat(0, (players[0] ?? ZERO) as Hex, s0), seat(1, (players[1] ?? ZERO) as Hex, s1)],
    board: boardSlots(live, h, focus),
    matchOver,
    matchWinner: matchOver ? (s0 === 0n ? 1 : s1 === 0n ? 0 : null) : null,
  };
}

export function buildScoreboard(hands: HandView[], stacks: readonly bigint[] | null): Scoreboard {
  const handsWon: [number, number] = [0, 0];
  let handsPlayed = 0;
  let biggestPot = 0n;
  let biggestPotHand: number | null = null;

  for (const h of hands) {
    if (h.settled && !h.canceled) handsPlayed++;
    if (h.winnerSeat === 0) handsWon[0]++;
    else if (h.winnerSeat === 1) handsWon[1]++;
    if (h.potPeak > biggestPot) {
      biggestPot = h.potPeak;
      biggestPotHand = h.id;
    }
  }

  return {
    handsWon,
    handsPlayed,
    stacks: [stacks?.[0] ?? 0n, stacks?.[1] ?? 0n],
    biggestPot,
    biggestPotHand,
  };
}

/** One-shot derivation of everything the UI renders from a poll. */
export function buildArenaState(raw: GetHandResult | null, events: ArenaEvent[]): ArenaState {
  const hands = buildHands(events);
  return {
    hands,
    table: buildTableView(raw, hands),
    scoreboard: buildScoreboard(hands, raw ? raw[2] : null),
    players: raw ? [raw[1][0] as Hex, raw[1][1] as Hex] : null,
  };
}
