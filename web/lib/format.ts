import { formatEther } from "viem";

/** Format wei as tBOT with up to 4 decimal places, trailing zeros trimmed. */
export function fmtAmount(wei: bigint): string {
  const s = formatEther(wei);
  if (!s.includes(".")) return s;
  const [int, frac] = s.split(".");
  const trimmed = frac.slice(0, 4).replace(/0+$/, "");
  return trimmed ? `${int}.${trimmed}` : int;
}

/** Amount with unit suffix, e.g. "0.012 tBOT". */
export function fmtBot(wei: bigint): string {
  return `${fmtAmount(wei)} tBOT`;
}

export function shortAddr(address: string): string {
  if (!address || address.length < 10) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function shortHash(hash: string, lead = 10): string {
  if (!hash || hash.length < lead + 6) return hash;
  return `${hash.slice(0, lead)}…${hash.slice(-6)}`;
}

/** Seconds → "1:04" style clock, clamped at zero. */
export function fmtClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}
