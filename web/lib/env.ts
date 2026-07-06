import type { Hex } from "viem";

/** Public chain-reader configuration, inlined at build from NEXT_PUBLIC_* vars. */
export const env = {
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.bohr.life",
  chainId: Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "968"),
  tableAddress: (process.env.NEXT_PUBLIC_TABLE_ADDRESS ?? "") as Hex | "",
  explorerUrl: (process.env.NEXT_PUBLIC_EXPLORER_URL ?? "https://scan.bohr.life").replace(
    /\/$/,
    "",
  ),
  startBlock: BigInt(process.env.NEXT_PUBLIC_START_BLOCK ?? "0"),
} as const;

/** True only when a syntactically valid contract address is configured. */
export const hasTable = /^0x[0-9a-fA-F]{40}$/.test(env.tableAddress);

export function txUrl(hash: string): string {
  return `${env.explorerUrl}/tx/${hash}`;
}

export function addressUrl(address: string): string {
  return `${env.explorerUrl}/address/${address}`;
}
