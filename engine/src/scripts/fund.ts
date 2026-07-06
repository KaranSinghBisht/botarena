import { formatEther, parseEther } from "viem";
import { config } from "../config.js";
import { publicClient, walletFor } from "../table.js";

/**
 * Splits the dealer's faucet tBOT with the two agent wallets.
 * Usage: npm run fund -- 0.1   (sends 0.1 tBOT to each agent)
 */
async function main(): Promise<void> {
  const amount = parseEther(process.argv[2] ?? "0.1");
  const dealer = walletFor(config.dealerKey);

  for (const key of config.agentKeys) {
    const to = walletFor(key).account.address;
    const hash = await dealer.client.sendTransaction({
      account: dealer.account,
      chain: dealer.client.chain,
      to,
      value: amount,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    console.log(`sent ${formatEther(amount)} tBOT -> ${to} (${hash})`);
  }

  for (const key of [config.dealerKey, ...config.agentKeys]) {
    const addr = walletFor(key).account.address;
    const bal = await publicClient.getBalance({ address: addr });
    console.log(`${addr}: ${formatEther(bal)} tBOT`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
