import { createPublicClient, defineChain, http } from "viem";
import { env } from "./env";

/** BOT Chain definition assembled from public env config. */
export const botChain = defineChain({
  id: env.chainId,
  name: "BOT Chain",
  nativeCurrency: { name: "Test BOT", symbol: "tBOT", decimals: 18 },
  rpcUrls: { default: { http: [env.rpcUrl] } },
  blockExplorers: { default: { name: "Explorer", url: env.explorerUrl } },
});

/** Shared read-only client. No wallet, no signing — spectator only. */
export const publicClient = createPublicClient({
  chain: botChain,
  transport: http(env.rpcUrl, { batch: true, retryCount: 2 }),
});

/** Max block span per getLogs request; keeps public RPCs happy. */
// rpc.bohr.life served a 15k-block getLogs range in one call during probing;
// 10k keeps initial sync to 1-2 requests while staying under any range cap.
export const LOG_CHUNK = 10_000n;
