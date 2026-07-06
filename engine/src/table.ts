import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
  type PublicClient,
  type WalletClient,
  type Account,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { botChainTestnet, config } from "./config.js";
import abi from "./abi/PokerTable.json" with { type: "json" };

export const tableAbi = abi;

export enum Phase {
  Idle = 0,
  Betting = 1,
  AwaitReveal = 2,
  AwaitShowdown = 3,
}

export enum Action {
  Fold = 0,
  Check = 1,
  Call = 2,
  Bet = 3,
  Raise = 4,
}

export interface HandState {
  id: bigint;
  button: number;
  street: number;
  toAct: number;
  communityCount: number;
  phase: Phase;
  deckCommit: Hex;
  community: number[];
  pot: bigint;
  streetBet: [bigint, bigint];
  betToMatch: bigint;
  lastRaise: bigint;
  deadline: bigint;
  players: [Hex, Hex];
  stacks: [bigint, bigint];
}

export const publicClient: PublicClient = createPublicClient({
  chain: botChainTestnet,
  transport: http(),
});

export function walletFor(key: Hex): { client: WalletClient; account: Account } {
  const account = privateKeyToAccount(key);
  const client = createWalletClient({ account, chain: botChainTestnet, transport: http() });
  return { client, account };
}

export interface Blinds {
  sb: bigint;
  bb: bigint;
}

export async function readBlinds(): Promise<Blinds> {
  const [sb, bb] = (await Promise.all([
    publicClient.readContract({ address: config.tableAddress, abi: tableAbi, functionName: "smallBlind" }),
    publicClient.readContract({ address: config.tableAddress, abi: tableAbi, functionName: "bigBlind" }),
  ])) as [bigint, bigint];
  return { sb, bb };
}

export async function readHand(): Promise<HandState> {
  const [h, players, stacks] = (await publicClient.readContract({
    address: config.tableAddress,
    abi: tableAbi,
    functionName: "getHand",
  })) as [Record<string, unknown>, [Hex, Hex], [bigint, bigint]];

  return {
    id: h.id as bigint,
    button: Number(h.button),
    street: Number(h.street),
    toAct: Number(h.toAct),
    communityCount: Number(h.communityCount),
    phase: Number(h.phase) as Phase,
    deckCommit: h.deckCommit as Hex,
    community: (h.community as readonly (number | bigint)[]).map(Number),
    pot: h.pot as bigint,
    streetBet: (h.streetBet as readonly bigint[]).slice(0, 2) as [bigint, bigint],
    betToMatch: h.betToMatch as bigint,
    lastRaise: h.lastRaise as bigint,
    deadline: h.deadline as bigint,
    players,
    stacks: stacks.slice(0, 2) as [bigint, bigint],
  };
}

/** Sends a state-changing call and waits for its receipt (blocks are ~0.75s). */
export async function sendTable(
  wallet: { client: WalletClient; account: Account },
  functionName: string,
  args: unknown[],
  value?: bigint,
): Promise<Hex> {
  const { request } = await publicClient.simulateContract({
    address: config.tableAddress,
    abi: tableAbi,
    functionName,
    args,
    value,
    account: wallet.account,
  });
  const txHash = await wallet.client.writeContract(request);
  const receipt = await publicClient.waitForTransactionReceipt({
    hash: txHash,
    timeout: 60_000,
  });
  if (receipt.status !== "success") {
    throw new Error(`${functionName} reverted on-chain: ${txHash}`);
  }
  return txHash;
}
