"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import MercuryMark from "./MercuryMark";

type Mode = "angel" | "devil" | null;

/**
 * Slider de mood de 3 estados (calca Mood.svg): ángel (morado sólido, izq) ·
 * neutral (morado translúcido, medio — DEFAULT) · diablito/Tabú (naranja, der).
 * Knob con el glifo Mercury. Escribe en /api/me/mode (mismo dato `mode`).
 */
export default function MoodSlider({ initial }: { initial: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initial);
  const [busy, setBusy] = useState(false);

  async function set(next: Mode) {
    if (busy || next === mode) return;
    setBusy(true);
    const prev = mode;
    setMode(next);
    const res = await fetch("/api/me/mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: next }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setMode(prev);
  }

  // Knob: track 80, knob 40 → posiciones 0 / 20 / 40 px (izq / medio / der).
  const knob =
    mode === "angel"
      ? "translate-x-0 bg-gradient-to-tl from-purple-soft to-purple"
      : mode === "devil"
        ? "translate-x-10 bg-gradient-to-tl from-orange-400 to-orange-500"
        : "translate-x-5 bg-purple/60";
  const track = mode === "devil" ? "bg-orange-500/15" : "bg-purple/15";

  return (
    <div
      className={`relative h-10 w-20 shrink-0 rounded-full ${track} transition-colors`}
      title={mode === "angel" ? "Ángel" : mode === "devil" ? "Diablito" : "Neutral"}
    >
      <button aria-label="Ángel" onClick={() => set("angel")} className="absolute left-0 top-0 h-full w-1/3" />
      <button aria-label="Neutral" onClick={() => set(null)} className="absolute left-1/3 top-0 h-full w-1/3" />
      <button aria-label="Diablito" onClick={() => set("devil")} className="absolute right-0 top-0 h-full w-1/3" />
      <span
        className={`pointer-events-none absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full shadow-lg transition-transform duration-200 ${knob}`}
      >
        <MercuryMark className="h-5" />
      </span>
    </div>
  );
}
