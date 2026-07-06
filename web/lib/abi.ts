import type { Abi } from "viem";
import abiJson from "./PokerTable.json";

/** PokerTable ABI, copied from engine/src/abi. Cast for viem consumption. */
export const pokerTableAbi = abiJson as unknown as Abi;
