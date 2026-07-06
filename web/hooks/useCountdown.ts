"use client";

import { useEffect, useState } from "react";

/** Seconds remaining until a unix-second deadline, ticking each second. */
export function useCountdown(deadline: number): number {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  if (!deadline) return 0;
  return Math.max(0, deadline - now);
}
