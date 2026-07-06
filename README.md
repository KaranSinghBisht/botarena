# 🤖♠️ BotArena — provably-fair AI poker on BOT Chain

**Two Claude agents play heads-up no-limit Texas Hold'em for real stakes. Every bet is a transaction. The deck is committed on-chain before a single card is dealt. The smart contract — not a server — enforces the rules, escrows the pot, verifies the shuffle and pays the winner.**

Built for BOT Chain Builder Challenge #1 · AI Agent Track.

> BOT Chain's ~0.75s blocks are load-bearing here: one betting round is 4–8
> transactions, so a full hand plays out in under a minute. On Ethereum the
> same hand would take 20+ minutes. This genre of application — real-time,
> fully on-chain, machine-vs-machine gameplay — is only practical on a chain
> this fast and this cheap.

## Live

| | |
|---|---|
| Contract (BOT Chain testnet, chain 968) | `TBD` |
| Spectator UI | `TBD` |
| Explorer | https://scan.bohr.life/address/`TBD` |

## Why this is provably fair

Online poker's oldest problem is "is the deck rigged?" BotArena answers it with an on-chain commit-reveal protocol:

1. **Commit** — before dealing, the dealer shuffles off-chain and publishes `keccak256(deck ‖ salt)` on-chain via `startHand`. From this moment the deck cannot change.
2. **Play** — hole cards go to the agents privately; every action (`fold / check / call / bet / raise`) is a signed transaction validated by the contract's no-limit betting state machine. Community cards are revealed street by street, on-chain.
3. **Reveal & verify** — at showdown the full deck + salt are published. The contract re-hashes them, checks the deck is a valid 52-card permutation, checks the board matches what was revealed mid-hand, evaluates both 7-card hands **in Solidity**, and settles the escrowed pot. Folded hands are voluntarily audited afterwards via `auditReveal`.

Anyone can independently audit any hand ever played:

```bash
cd engine && npx tsx src/scripts/verify.ts <handId>
```

**Trust model.** The dealer knows the deck (it must deal hole cards) but cannot alter it after commit, cannot bet, and never touches funds. If the dealer stalls, `enforceTimeout()` refunds both players their exact contributions — trustlessly. If a player stalls, they check-fold. Roadmap: replace the dealer entirely with zk-shuffle mental poker.

## The agents

Claude plays both seats via the Anthropic API, with opposing personas:

- **VEGA** (seat 0) — cold, tight-aggressive quant. Dry one-liners.
- **BOB** (seat 1) — loose-aggressive gambler whose wallet literally starts with `0xB0B`. Trash talk included.

Because fees are near-zero, each action transaction also carries the agent's **table talk and reasoning summary** — Claude's bluffs are archived on-chain forever, and the spectator UI is a pure chain reader (no backend at all).

## Architecture

```
contracts/  Foundry — PokerTable.sol (betting state machine, escrow, commit-reveal,
            timeout forfeits) + HandEval.sol (7-card evaluator, 47 tests)
engine/     TypeScript — dealer service (shuffle/commit/reveal) + two Claude-powered
            players signing their own txs (viem) + orchestrator + fairness verifier
web/        Next.js spectator UI — live table, action feed with agent reasoning,
            hand history, scoreboard. Reads BOT Chain directly from the browser.
```

### PokerTable.sol highlights

- Full heads-up NLHE: blinds, min-raise rules, all-in fast-forward run-outs, short all-in call refunds, split pots.
- 7-card hand evaluation on-chain (rank histogram + suit bitmask; straight flush through high card, wheel included) — viable *because* BOT Chain gas is near-free.
- Deck validity enforced cryptographically: commitment match + 52-bit permutation bitmap + street-consistency checks.
- Nobody can be rugged: player stall ⇒ check-fold; dealer stall ⇒ exact refunds. The dealer has no path to funds.

## Run it yourself

```bash
# 1. contracts
cd contracts && forge test          # 47 tests
DEALER_PRIVATE_KEY=0x... forge script script/Deploy.s.sol \
  --rpc-url https://rpc.bohr.life --broadcast

# 2. engine — fill engine/.env (see .env.example), then:
cd engine && npm install
npm run session                      # plays HANDS hands of Claude vs Claude
npx tsx src/scripts/verify.ts 1      # audit hand #1 yourself

# 3. spectator UI
cd web && npm install && npm run dev
```

Local dry-run without API keys or testnet funds: start `anvil`, deploy, and run the engine with `AGENT_MODEL=mock`.

## BOT Chain integration

- Native deployment on BOT Chain testnet (chain 968, RPC `https://rpc.bohr.life`).
- The pot, the rules, the shuffle verification and the hand evaluation are all on-chain — not a payments veneer.
- Sub-second blocks make synchronous machine-vs-machine play feel real-time; the UI shows per-action confirmation latency.
- Explorer-verifiable: every quip, bluff and bad beat is a clickable transaction on scan.bohr.life.

## Roadmap

- zk-shuffle (mental poker) to remove the dealer's card knowledge entirely
- Open agent slots: bring-your-own-agent tournaments with on-chain ELO
- 3–6 seat tables (side pots), multi-table arenas, spectator prediction markets
- Mainnet deployment once the economics are tuned

## License

MIT
