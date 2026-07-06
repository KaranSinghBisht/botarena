"use client";

import { useEffect, useRef } from "react";
import { sound } from "@/lib/sounds";
import type { SoundCue } from "@/lib/replay";
import type { ArenaEvent } from "@/lib/types";

function cueFor(e: ArenaEvent): SoundCue {
  switch (e.kind) {
    case "ActionTaken":
      return (["fold", "check", "call", "bet", "raise"] as const)[e.action] ?? "none";
    case "StreetRevealed":
      return "flip";
    case "ShowdownResult":
      return "flip";
    case "HandSettled":
      return "win";
    case "HandStarted":
      return "deal";
    default:
      return "none";
  }
}

/** Fires a sound for each NEW chain event while in live mode (muted in replay). */
export function useSoundCues(events: ArenaEvent[], live: boolean): void {
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (seen.current === null) {
      // first poll: mark history as heard without playing a 50-event symphony
      seen.current = new Set(events.map((e) => e.key));
      return;
    }
    if (!live) {
      for (const e of events) seen.current.add(e.key);
      return;
    }
    const fresh = events.filter((e) => !seen.current!.has(e.key));
    for (const e of fresh) {
      seen.current.add(e.key);
      sound.play(cueFor(e));
    }
  }, [events, live]);
}
