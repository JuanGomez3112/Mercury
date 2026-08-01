"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconMercury } from "./icons";

type Mode = "angel" | "devil" | null;

/**
 * Slider de mood de 3 estados (calca Mood.svg): ángel (degradado morado, izq) ·
 * neutral (mismo degradado medio claro, medio — DEFAULT) · diablito/Tabú
 * (naranja, der). Knob con glifo Mercury (Font Awesome). Clic en una zona o
 * arrastre del knob. Escribe en /api/me/mode.
 */
export default function MoodSlider({ initial }: { initial: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initial);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<Mode>(initial);
  const ref = useRef<HTMLDivElement>(null);

  function modeFromX(clientX: number): Mode {
    const el = ref.current;
    if (!el) return mode;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    const third = rect.width / 3;
    return x < third ? "angel" : x < 2 * third ? null : "devil";
  }

  async function commit(next: Mode) {
    if (next === mode || busy) {
      setMode(next);
      return;
    }
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

  function onDown(e: React.PointerEvent) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    setPreview(modeFromX(e.clientX));
  }
  function onMove(e: React.PointerEvent) {
    if (!dragging) return;
    setPreview(modeFromX(e.clientX));
  }
  function onUp(e: React.PointerEvent) {
    if (!dragging) return;
    setDragging(false);
    commit(modeFromX(e.clientX));
  }

  const shown = dragging ? preview : mode;
  const pos = shown === "angel" ? "translate-x-0" : shown === "devil" ? "translate-x-10" : "translate-x-5";
  const bg =
    shown === "angel"
      ? "bg-gradient-to-tl from-purple-soft to-purple"
      : shown === "devil"
        ? "bg-gradient-to-tl from-orange-400 to-orange-500"
        : "bg-gradient-to-tl from-purple-soft to-purple opacity-60";
  const track = shown === "devil" ? "bg-orange-500/15" : "bg-purple/15";
  const label = shown === "angel" ? "Ángel" : shown === "devil" ? "Diablito" : "Neutral";

  return (
    <div
      ref={ref}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      className={`relative h-10 w-20 shrink-0 cursor-pointer touch-none select-none rounded-full ${track} transition-colors`}
      role="slider"
      aria-label="Modo"
      aria-valuemin={0}
      aria-valuemax={2}
      aria-valuenow={shown === "angel" ? 0 : shown === "devil" ? 2 : 1}
      aria-valuetext={label}
      title={label}
    >
      <span
        className={`pointer-events-none absolute left-0 top-0 flex h-10 w-10 items-center justify-center rounded-full text-white shadow-lg transition-transform duration-200 ${pos}`}
      >
        <span className={`absolute inset-0 rounded-full ${bg}`} />
        <IconMercury className="relative h-4 w-4" />
      </span>
    </div>
  );
}
