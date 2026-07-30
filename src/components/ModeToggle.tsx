"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "angel" | "devil" | null;

export default function ModeToggle({ initial }: { initial: Mode }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initial);
  const [busy, setBusy] = useState(false);

  async function set(next: Mode) {
    if (busy) return;
    const value = mode === next ? null : next; // clic en el activo lo apaga
    setBusy(true);
    setMode(value);
    const res = await fetch("/api/me/mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: value }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else setMode(mode);
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Modo</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => set("angel")}
          className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2 text-sm font-medium transition ${
            mode === "angel" ? "border-purple bg-purple/15 text-white" : "border-white/10 text-white/60 hover:text-white"
          }`}
        >
          <span>😇</span> Ángel
        </button>
        <button
          onClick={() => set("devil")}
          className={`flex items-center justify-center gap-2 rounded-xl border-2 py-2 text-sm font-medium transition ${
            mode === "devil" ? "border-orange-500 bg-orange-500/15 text-white" : "border-white/10 text-white/60 hover:text-white"
          }`}
        >
          <span>😈</span> Diablito
        </button>
      </div>
    </div>
  );
}
