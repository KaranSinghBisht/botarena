import { decodeFunctionData, formatEther, parseAbiItem } from "viem";
import { deckCommit, fmtCards, DEAL } from "../cards.js";
import { config } from "../config.js";
import { publicClient, tableAbi } from "../table.js";

/**
 * Independent fairness auditor. For a given hand it:
 *   1. reads the deck commitment from the HandStarted event (pre-deal),
 *   2. finds the showdown/auditReveal transaction and extracts deck + salt,
 *   3. recomputes keccak256(deck || salt) and compares it to the commitment,
 *   4. re-derives hole cards and board from the fixed deal layout.
 * Anyone can run this against any hand — no trust in the dealer required.
 *
 * Usage: npx tsx src/scripts/verify.ts <handId> [fromBlock]
 */
async function main(): Promise<void> {
  const handId = BigInt(process.argv[2] ?? "1");
  const fromBlock = BigInt(process.argv[3] ?? "0");

  const started = await publicClient.getLogs({
    address: config.tableAddress,
    event: parseAbiItem(
      "event HandStarted(uint64 indexed handId, uint8 button, bytes32 deckCommit, uint256 smallBlind, uint256 bigBlind)",
    ),
    args: { handId },
    fromBlock,
  });
  if (started.length === 0) throw new Error(`no HandStarted event for hand ${handId}`);
  const commit = started[0].args.deckCommit!;
  console.log(`hand #${handId}`);
  console.log(`  on-chain commitment (before any card was dealt): ${commit}`);

  const reveals = [
    ...(await publicClient.getLogs({
      address: config.tableAddress,
      event: parseAbiItem(
        "event ShowdownResult(uint64 indexed handId, uint8[2] holes0, uint8[2] holes1, uint256 score0, uint256 score1)",
      ),
      args: { handId },
      fromBlock,
    })),
    ...(await publicClient.getLogs({
      address: config.tableAddress,
      event: parseAbiItem("event DeckAudited(uint64 indexed handId, bytes32 salt)"),
      args: { handId },
      fromBlock,
    })),
  ];
  if (reveals.length === 0) {
    throw new Error(`hand ${handId} has no reveal yet (still running, or folded without audit)`);
  }

  const tx = await publicClient.getTransaction({ hash: reveals[0].transactionHash });
  const { functionName, args } = decodeFunctionData({ abi: tableAbi, data: tx.input });
  const [deckArg, saltArg] = functionName === "auditReveal" ? [args![1], args![2]] : [args![0], args![1]];
  const deckHex = deckArg as `0x${string}`;
  const salt = saltArg as `0x${string}`;
  const deck = Array.from(Buffer.from(deckHex.slice(2), "hex"));

  const recomputed = deckCommit(deck, salt);
  const ok = recomputed === commit;
  console.log(`  revealed deck + salt found in ${functionName} tx ${reveals[0].transactionHash}`);
  console.log(`  recomputed keccak256(deck || salt):              ${recomputed}`);
  console.log(`  match: ${ok ? "✓ FAIR — deck cannot have changed after the commit" : "✗ MISMATCH"}`);
  if (!ok) process.exit(1);

  console.log(`  seat 0 hole cards: ${fmtCards(DEAL.holes[0].map((i) => deck[i]))}`);
  console.log(`  seat 1 hole cards: ${fmtCards(DEAL.holes[1].map((i) => deck[i]))}`);
  console.log(
    `  board: ${fmtCards([...DEAL.flop.map((i) => deck[i]), deck[DEAL.turn], deck[DEAL.river]])}`,
  );
  const sorted = [...deck].sort((a, b) => a - b);
  const isPermutation = sorted.every((c, i) => c === i);
  console.log(`  deck is a valid 52-card permutation: ${isPermutation ? "✓" : "✗"}`);
  console.log(`  blinds: ${formatEther(started[0].args.smallBlind!)} / ${formatEther(started[0].args.bigBlind!)} tBOT`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
