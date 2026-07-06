"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Hex } from "viem";
import { pokerTableAbi } from "@/lib/abi";
import { LOG_CHUNK, publicClient } from "@/lib/chain";
import { env, hasTable } from "@/lib/env";
import { decodeArenaLog } from "@/lib/events";
import { buildArenaState } from "@/lib/poker";
import type { ArenaEvent, ArenaState, GetHandResult } from "@/lib/types";

const POLL_MS = 1200;

/** Guarded by hasTable at every call site; safe to treat as a concrete address. */
const TABLE = env.tableAddress as Hex;

const EMPTY_STATE: ArenaState = {
  hands: [],
  table: null,
  scoreboard: { handsWon: [0, 0], handsPlayed: 0, stacks: [0n, 0n], biggestPot: 0n, biggestPotHand: null },
  players: null,
};

export interface ChainStatus {
  connected: boolean;
  configured: boolean;
  error: string | null;
  latestBlock: bigint | null;
  loading: boolean;
}

const min = (a: bigint, b: bigint) => (a < b ? a : b);

function friendlyError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (/fetch|network|ECONN|Failed to fetch/i.test(raw)) return "RPC unreachable";
  if (/reverted|execution/i.test(raw)) return "Contract call reverted — check table address";
  return "Chain read failed";
}

/** Poll getHand() + incremental getLogs every ~1.2s; derive full arena state. */
export function useChainData() {
  const [state, setState] = useState<ArenaState>(EMPTY_STATE);
  const [status, setStatus] = useState<ChainStatus>({
    connected: false,
    configured: hasTable,
    error: hasTable ? null : "no-table",
    latestBlock: null,
    loading: hasTable,
  });

  const eventsRef = useRef<Map<string, ArenaEvent>>(new Map());
  const cursorRef = useRef<bigint>(env.startBlock);

  const scanLogs = useCallback(async (latest: bigint) => {
    let start = cursorRef.current;
    while (start <= latest) {
      const end = min(start + LOG_CHUNK, latest);
      const logs = await publicClient.getLogs({ address: TABLE, fromBlock: start, toBlock: end });
      for (const log of logs) {
        const ev = decodeArenaLog(log);
        if (ev) eventsRef.current.set(ev.key, ev);
      }
      start = end + 1n;
    }
    cursorRef.current = latest + 1n;
  }, []);

  const poll = useCallback(async () => {
    if (!hasTable) return;
    try {
      const [latest, raw] = await Promise.all([
        publicClient.getBlockNumber(),
        publicClient.readContract({
          address: TABLE,
          abi: pokerTableAbi,
          functionName: "getHand",
        }) as Promise<GetHandResult>,
      ]);
      await scanLogs(latest);
      setState(buildArenaState(raw, [...eventsRef.current.values()]));
      setStatus({ connected: true, configured: true, error: null, latestBlock: latest, loading: false });
    } catch (err) {
      setStatus((s) => ({ ...s, connected: false, loading: false, error: friendlyError(err) }));
    }
  }, [scanLogs]);

  useEffect(() => {
    if (!hasTable) return;
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      if (!active) return;
      await poll();
      if (active) timer = setTimeout(loop, POLL_MS);
    };
    void loop();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [poll]);

  return { state, status };
}
