"use client";

import { streetLabel } from "@/lib/enums";
import type { ReplayState } from "@/hooks/useReplay";

const SPEEDS = [1, 2, 4];

function Btn({
  onClick,
  active = false,
  children,
  label,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`rounded border px-2 py-1 text-[11px] font-bold tracking-wider transition-colors ${
        active
          ? "border-log/60 bg-log/10 text-log"
          : "border-line text-muted hover:border-log/40 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

/** Playback controls: appears as a slim strip under the stage. */
export function ReplayBar({ replay }: { replay: ReplayState }) {
  if (!replay.hand) {
    return (
      <div className="panel flex items-center justify-between px-3.5 py-2 text-[11px] text-muted">
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-log animate-pulse-dot" />
          watching live — every move lands as a transaction
        </span>
        <span className="eyebrow hidden sm:block">▸ click any hand in history to replay it</span>
      </div>
    );
  }

  const total = Math.max(replay.steps.length - 1, 1);
  const pct = (replay.index / total) * 100;
  const step = replay.current;

  return (
    <div className="panel space-y-2 px-3.5 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="eyebrow text-log">▸ replay</span>
        <span className="text-[11px] font-bold">hand #{replay.hand.id}</span>
        <span className="eyebrow">
          step {replay.index + 1}/{replay.steps.length}
          {step ? ` · ${streetLabel(step.street)}` : ""}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          <Btn onClick={() => replay.stepBy(-1)} label="Previous step">⏮</Btn>
          <Btn onClick={replay.togglePlay} active={replay.playing} label="Play or pause">
            {replay.playing ? "❚❚" : "▶"}
          </Btn>
          <Btn onClick={() => replay.stepBy(1)} label="Next step">⏭</Btn>
          {SPEEDS.map((x) => (
            <Btn key={x} onClick={() => replay.setSpeed(x)} active={replay.speed === x} label={`${x}x speed`}>
              {x}X
            </Btn>
          ))}
          <Btn onClick={replay.exit} label="Back to live">● LIVE</Btn>
        </div>
      </div>

      <input
        type="range"
        min={0}
        max={total}
        value={replay.index}
        onChange={(e) => replay.seek(Number(e.target.value))}
        className="scrubber w-full cursor-pointer"
        style={{ "--fill": `${pct}%` } as React.CSSProperties}
        aria-label="Replay position"
      />
    </div>
  );
}
