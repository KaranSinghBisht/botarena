import "dotenv/config";
import { defineChain, type Hex } from "viem";

export const botChainTestnet = defineChain({
  id: Number(process.env.CHAIN_ID ?? 968),
  name: "BOT Chain Testnet",
  nativeCurrency: { name: "Test BOT", symbol: "tBOT", decimals: 18 },
  rpcUrls: { default: { http: [process.env.RPC_URL ?? "https://rpc.bohr.life"] } },
  blockExplorers: { default: { name: "BohrScan", url: "https://scan.bohr.life" } },
});

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var ${name} (see .env.example)`);
  }
  return value;
}

export const config = {
  dealerKey: requireEnv("DEALER_PRIVATE_KEY") as Hex,
  agentKeys: [
    requireEnv("AGENT1_PRIVATE_KEY") as Hex,
    requireEnv("AGENT2_PRIVATE_KEY") as Hex,
  ] as const,
  tableAddress: requireEnv("TABLE_ADDRESS") as Hex,
  anthropicKey: requireEnv("ANTHROPIC_API_KEY"),
  model: process.env.AGENT_MODEL ?? "claude-sonnet-5",
  handsPerSession: Number(process.env.HANDS ?? 5),
  pollMs: Number(process.env.POLL_MS ?? 900),
  /** extra pause after each action / street reveal — set ~5000 for narrated demos */
  paceMs: Number(process.env.PACE_MS ?? 0),
  explorerUrl: "https://scan.bohr.life",
} as const;
