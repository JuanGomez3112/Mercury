"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "angel" | "devil" | null;

/**
 * Slider de mood de 3 estados (calca Mood.svg): ángel (morado, izq) · neutral
 * (translúcido, medio) · diablito/Tabú (naranja, der). Knob de corazón. Escribe
 * en /api/me/mode (mismo dato `mode`: angel|devil|null).
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

  // Posiciones del knob (track 80, knob 40 → 0 / 20 / 40 px).
  const knob =
    mode === "angel"
      ? "translate-x-0 bg-gradient-to-tl from-purple to-purple-soft"
      : mode === "devil"
        ? "translate-x-10 bg-gradient-to-tl from-orange-500 to-orange-400"
        : "translate-x-5 bg-purple/40";
  const track = mode === "devil" ? "bg-orange-500/15" : "bg-purple/15";

  return (
    <div
      className={`relative h-10 w-20 shrink-0 rounded-full ${track} transition-colors`}
      title={`Modo: ${mode ?? "neutral"}`}
    >
      <button aria-label="Ángel" onClick={() => set("angel")} className="absolute left-0 top-0 h-full w-1/3" />
      <button aria-label="Neutral" onClick={() => set(null)} className="absolute left-1/3 top-0 h-full w-1/3" />
      <button aria-label="Diablito" onClick={() => set("devil")} className="absolute right-0 top-0 h-full w-1/3" />
      <span
        className={`pointer-events-none absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg transition-transform duration-200 ${knob}`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M12 21s-7-4.35-9.5-8.5C1 9 3 6 6 6c1.7 0 3.1.9 4 2.3C10.9 6.9 12.3 6 14 6c3 0 5 3 3.5 6.5C19 16.65 12 21 12 21z" />
        </svg>
      </span>
    </div>
  );
}
