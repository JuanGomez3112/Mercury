"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatorModeForm({ initialMode, initialPrice }: { initialMode: boolean; initialPrice: number | null }) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [price, setPrice] = useState<number | "">(initialPrice ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setBusy(true); setMsg("");
    const res = await fetch("/api/me/creator", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ creatorMode: mode, subPriceCredits: mode && price !== "" ? Number(price) : null }),
    });
    setBusy(false);
    if (res.ok) { setMsg("Guardado"); router.refresh(); } else setMsg("Error");
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-white/70">Modo creador</h2>
      <label className="flex items-center gap-3 text-sm text-white/80">
        <input type="checkbox" checked={mode} onChange={(e) => setMode(e.target.checked)} className="h-4 w-4 accent-purple" />
        Activar modo creador (acepto los términos de creador)
      </label>
      {mode && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/60">Suscripción mensual:</span>
          <input type="number" min={1} value={price} onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))} placeholder="precio ☾" className="w-32 rounded-xl border border-white/10 bg-navy px-3 py-2 text-sm text-white outline-none focus:border-purple" />
          <span className="text-sm text-white/60">☾ / mes</span>
        </div>
      )}
      <button onClick={save} disabled={busy} className="rounded-xl bg-gradient-to-tl from-purple to-purple-soft px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Guardando…" : "Guardar"}</button>
      {msg && <p className="text-sm text-emerald-400">{msg}</p>}
    </div>
  );
}
