"use client";

import type { SoundCue } from "./replay";

/**
 * Zero-asset sound engine: every effect is synthesized with WebAudio, so the
 * build has no binary audio deps and nothing to license. Audio contexts need a
 * user gesture — `enable()` is called from the sound toggle; preference is
 * persisted to localStorage.
 */
const PREF_KEY = "botarena.sound";

let ctx: AudioContext | null = null;
let enabled = false;

function now(): number {
  return ctx?.currentTime ?? 0;
}

function master(gainAt: number): GainNode {
  const g = ctx!.createGain();
  g.gain.value = gainAt;
  g.connect(ctx!.destination);
  return g;
}

function tone(freq: number, start: number, dur: number, gain = 0.08, type: OscillatorType = "square"): void {
  const osc = ctx!.createOscillator();
  const g = master(0);
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, now() + start);
  g.gain.linearRampToValueAtTime(gain, now() + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now() + start + dur);
  osc.connect(g);
  osc.start(now() + start);
  osc.stop(now() + start + dur + 0.05);
}

function noise(start: number, dur: number, gain = 0.06, filterFreq = 2400): void {
  const len = Math.ceil(ctx!.sampleRate * dur);
  const buf = ctx!.createBuffer(1, len, ctx!.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx!.createBufferSource();
  src.buffer = buf;
  const filter = ctx!.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.value = filterFreq;
  const g = master(gain);
  src.connect(filter);
  filter.connect(g);
  src.start(now() + start);
}

const EFFECTS: Record<SoundCue, () => void> = {
  none: () => {},
  /** card swish ×2 */
  deal: () => {
    noise(0, 0.09, 0.05, 3200);
    noise(0.12, 0.09, 0.05, 3600);
  },
  /** double knock on the table */
  check: () => {
    tone(140, 0, 0.06, 0.12, "sine");
    tone(120, 0.11, 0.07, 0.12, "sine");
  },
  /** single chip clink */
  call: () => {
    tone(1900, 0, 0.03, 0.05, "triangle");
    tone(2600, 0.035, 0.04, 0.04, "triangle");
  },
  /** chips sliding in */
  bet: () => {
    for (let i = 0; i < 4; i++) tone(1700 + i * 260, i * 0.045, 0.035, 0.045, "triangle");
  },
  /** bigger chip cascade, rising intent */
  raise: () => {
    for (let i = 0; i < 6; i++) tone(1500 + i * 320, i * 0.04, 0.035, 0.05, "triangle");
    tone(520, 0.28, 0.1, 0.06, "square");
  },
  /** dramatic two-note alarm */
  allin: () => {
    tone(392, 0, 0.22, 0.09, "sawtooth");
    tone(523, 0.24, 0.34, 0.09, "sawtooth");
    for (let i = 0; i < 8; i++) tone(1400 + i * 300, 0.1 + i * 0.03, 0.03, 0.04, "triangle");
  },
  /** soft falling whoosh */
  fold: () => {
    noise(0, 0.2, 0.05, 900);
    tone(330, 0, 0.16, 0.04, "sine");
    tone(220, 0.08, 0.18, 0.04, "sine");
  },
  /** card flip snap */
  flip: () => {
    noise(0, 0.05, 0.07, 4200);
    tone(980, 0.02, 0.05, 0.05, "triangle");
  },
  /** little victory arpeggio */
  win: () => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => tone(f, i * 0.09, 0.16, 0.07, "square"));
  },
};

export const sound = {
  isEnabled(): boolean {
    return enabled;
  },
  /** must be called from a user gesture the first time */
  setEnabled(on: boolean): void {
    enabled = on;
    try {
      localStorage.setItem(PREF_KEY, on ? "1" : "0");
    } catch {
      /* private mode: preference just won't persist */
    }
    if (on && !ctx) {
      ctx = new AudioContext();
    }
    if (on) void ctx?.resume();
  },
  /** restore persisted preference (context still needs a gesture; browsers allow resume on first click) */
  restorePreference(): boolean {
    try {
      return localStorage.getItem(PREF_KEY) === "1";
    } catch {
      return false;
    }
  },
  play(cue: SoundCue): void {
    if (!enabled || !ctx || ctx.state !== "running") return;
    try {
      EFFECTS[cue]?.();
    } catch {
      /* never let audio kill the render loop */
    }
  },
};
