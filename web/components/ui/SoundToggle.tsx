"use client";

import { useEffect, useState } from "react";
import { sound } from "@/lib/sounds";

export function SoundToggle() {
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (sound.restorePreference()) {
      // context resumes on the first user gesture anywhere on the page
      const arm = () => {
        sound.setEnabled(true);
        setOn(true);
        window.removeEventListener("pointerdown", arm);
      };
      window.addEventListener("pointerdown", arm);
      return () => window.removeEventListener("pointerdown", arm);
    }
  }, []);

  const toggle = () => {
    const next = !on;
    sound.setEnabled(next);
    setOn(next);
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={on ? "Mute sounds" : "Enable sounds"}
      className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-bold tracking-wider transition-colors ${
        on ? "border-log/50 bg-log/10 text-log" : "border-line text-muted hover:text-ink"
      }`}
    >
      {on ? "♪ SOUND ON" : "♪ SOUND OFF"}
    </button>
  );
}
