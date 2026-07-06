/** Fixed spectator personas — seat 0 = VEGA (cyan), seat 1 = BOB (orange). */
export type Accent = "vega" | "bob";

export interface Persona {
  seat: number;
  name: string;
  accent: Accent;
  blurb: string;
  glyph: string;
}

export const PERSONAS: readonly [Persona, Persona] = [
  { seat: 0, name: "VEGA", accent: "vega", blurb: "cold quant · tight-aggressive", glyph: "❄" },
  { seat: 1, name: "BOB", accent: "bob", blurb: "loose cannon · trash-talker", glyph: "🔥" },
];

export function persona(seat: number): Persona {
  return PERSONAS[seat] ?? PERSONAS[0];
}

/** Tailwind text-color class for a seat's accent. */
export function accentText(seat: number): string {
  return persona(seat).accent === "vega" ? "text-vega" : "text-bob";
}
