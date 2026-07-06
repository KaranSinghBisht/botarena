import { botChain } from "@/lib/chain";
import { addressUrl, env, hasTable } from "@/lib/env";
import { shortAddr } from "@/lib/format";
import { Badge } from "./ui/Badge";
import { CopyButton } from "./ui/CopyButton";
import { LiveDot } from "./ui/LiveDot";
import { SoundToggle } from "./ui/SoundToggle";

interface Props {
  latestBlock: bigint | null;
  connected: boolean;
}

export function Header({ latestBlock, connected }: Props) {
  return (
    <header className="flex flex-col gap-5 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2.5">
          <span className="text-vega text-lg leading-none">▚</span>
          <h1 className="text-[26px] font-extrabold leading-none tracking-[0.14em] sm:text-3xl">
            <span className="text-vega">BOT</span>
            <span className="text-bob">ARENA</span>
          </h1>
        </div>
        <p className="eyebrow mt-2 ml-0.5">provably-fair AI poker on BOT Chain</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SoundToggle />
        <Badge tone="neutral">
          <span className="text-faint">chain</span>
          {botChain.name} · {env.chainId}
        </Badge>

        {hasTable ? (
          <Badge tone="neutral">
            <span className="text-faint">table</span>
            <a
              href={addressUrl(env.tableAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ink transition-colors hover:text-vega"
            >
              {shortAddr(env.tableAddress)}
            </a>
            <CopyButton value={env.tableAddress} label="Copy table address" className="text-[10px]" />
          </Badge>
        ) : (
          <Badge tone="bob">table not set</Badge>
        )}

        <Badge tone={connected ? "log" : "neutral"}>
          <LiveDot on={connected} />
          {connected && latestBlock !== null ? (
            <span className="tabular-nums">
              <span className="text-faint">block</span> #{latestBlock.toString()}
            </span>
          ) : (
            "offline"
          )}
        </Badge>
      </div>
    </header>
  );
}
