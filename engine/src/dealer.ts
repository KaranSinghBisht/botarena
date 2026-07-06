import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { Hex } from "viem";
import { DEAL, deckCommit, deckToHex, fmtCards, randomSalt, shuffledDeck } from "./cards.js";
import { config } from "./config.js";
import { sendTable, walletFor, type HandState } from "./table.js";

interface DeckRecord {
  handId: string;
  deck: number[];
  salt: Hex;
}

const STATE_FILE = new URL("../../.secrets/dealer-state.json", import.meta.url).pathname;

/**
 * The dealer: shuffles, commits keccak(deck||salt) on-chain BEFORE dealing,
 * hands hole cards to the agents in-process, reveals streets, and opens the
 * deck at showdown. It cannot bet and cannot touch player funds; if it
 * disappears, the contract refunds both players via enforceTimeout().
 * Decks are persisted so a crash never leaves a hand unfinishable.
 */
export class Dealer {
  private wallet = walletFor(config.dealerKey);
  private decks = new Map<string, DeckRecord>();

  constructor() {
    if (existsSync(STATE_FILE)) {
      const saved = JSON.parse(readFileSync(STATE_FILE, "utf8")) as DeckRecord[];
      for (const rec of saved) this.decks.set(rec.handId, rec);
    }
  }

  get address(): Hex {
    return this.wallet.account.address;
  }

  private persist(): void {
    writeFileSync(STATE_FILE, JSON.stringify([...this.decks.values()], null, 1));
  }

  async startHand(nextHandId: bigint): Promise<Hex> {
    const deck = shuffledDeck();
    const salt = randomSalt();
    const commit = deckCommit(deck, salt);
    this.decks.set(nextHandId.toString(), { handId: nextHandId.toString(), deck, salt });
    this.persist();
    const tx = await sendTable(this.wallet, "startHand", [commit]);
    console.log(`[dealer] hand #${nextHandId} committed ${commit.slice(0, 18)}… tx ${tx}`);
    return tx;
  }

  holeCards(handId: bigint, seat: number): number[] {
    const rec = this.mustDeck(handId);
    return DEAL.holes[seat].map((i) => rec.deck[i]);
  }

  async revealNext(h: HandState): Promise<Hex> {
    const rec = this.mustDeck(h.id);
    const next = h.street + 1;
    const cards =
      next === 1 ? DEAL.flop.map((i) => rec.deck[i])
      : next === 2 ? [rec.deck[DEAL.turn]]
      : [rec.deck[DEAL.river]];
    const tx = await sendTable(this.wallet, "revealStreet", [cards]);
    console.log(`[dealer] street ${next} revealed: ${fmtCards(cards)} tx ${tx}`);
    return tx;
  }

  async showdown(h: HandState): Promise<Hex> {
    const rec = this.mustDeck(h.id);
    const tx = await sendTable(this.wallet, "showdown", [deckToHex(rec.deck), rec.salt]);
    console.log(`[dealer] showdown for hand #${h.id} tx ${tx}`);
    return tx;
  }

  /** Post-fold transparency: prove the deck was legit even though nobody saw it. */
  async auditReveal(handId: bigint): Promise<Hex | null> {
    const rec = this.decks.get(handId.toString());
    if (!rec) return null;
    const tx = await sendTable(this.wallet, "auditReveal", [
      handId,
      deckToHex(rec.deck),
      rec.salt,
    ]);
    console.log(`[dealer] audit reveal for folded hand #${handId} tx ${tx}`);
    return tx;
  }

  private mustDeck(handId: bigint): DeckRecord {
    const rec = this.decks.get(handId.toString());
    if (!rec) throw new Error(`no deck recorded for hand ${handId} — cannot continue`);
    return rec;
  }
}
