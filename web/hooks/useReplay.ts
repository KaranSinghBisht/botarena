"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { buildReplay, type ReplayStep } from "@/lib/replay";
import { sound } from "@/lib/sounds";
import type { HandView } from "@/lib/types";

export interface ReplayState {
  /** null = live mode, following the chain */
  hand: HandView | null;
  steps: ReplayStep[];
  index: number;
  playing: boolean;
  speed: number;
  current: ReplayStep | null;
  enter: (hand: HandView) => void;
  exit: () => void;
  seek: (i: number) => void;
  togglePlay: () => void;
  setSpeed: (x: number) => void;
  stepBy: (delta: number) => void;
}

const BASE_STEP_MS = 1600;

export function useReplay(): ReplayState {
  const [hand, setHand] = useState<HandView | null>(null);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeedState] = useState(1);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const steps = useMemo(() => (hand ? buildReplay(hand) : []), [hand]);
  const indexRef = useRef(index);
  indexRef.current = index;

  const seek = useCallback(
    (i: number) => {
      setIndex((prev) => {
        const next = Math.max(0, Math.min(i, Math.max(steps.length - 1, 0)));
        if (next !== prev && steps[next]) sound.play(steps[next].cue);
        return next;
      });
    },
    [steps],
  );

  const stepBy = useCallback((delta: number) => seek(indexRef.current + delta), [seek]);

  const enter = useCallback((h: HandView) => {
    setHand(h);
    setIndex(0);
    setPlaying(true);
  }, []);

  const exit = useCallback(() => {
    setHand(null);
    setPlaying(false);
    setIndex(0);
  }, []);

  const togglePlay = useCallback(() => setPlaying((p) => !p), []);
  const setSpeed = useCallback((x: number) => setSpeedState(x), []);

  useEffect(() => {
    if (timer.current) clearInterval(timer.current);
    if (!playing || !hand || steps.length === 0) return;
    timer.current = setInterval(() => {
      setIndex((i) => {
        if (i >= steps.length - 1) {
          setPlaying(false);
          return i;
        }
        const next = i + 1;
        if (steps[next]) sound.play(steps[next].cue);
        return next;
      });
    }, BASE_STEP_MS / speed);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [playing, speed, hand, steps]);

  // keyboard: ← → step, space play/pause, esc exit
  useEffect(() => {
    if (!hand) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") stepBy(1);
      else if (e.key === "ArrowLeft") stepBy(-1);
      else if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "Escape") exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hand, stepBy, togglePlay, exit]);

  return {
    hand,
    steps,
    index,
    playing,
    speed,
    current: steps[index] ?? null,
    enter,
    exit,
    seek,
    togglePlay,
    setSpeed,
    stepBy,
  };
}
