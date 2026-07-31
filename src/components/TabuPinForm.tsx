"use client";

import { useState } from "react";

export default function TabuPinForm({ hasPin }: { hasPin: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const res = await fetch("/api/me/tabu/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next, confirm }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setMsg({ ok: true, text: hasPin ? "Clave actualizada" : "Clave creada" }); setCurrent(""); setNext(""); setConfirm(""); }
    else setMsg({ ok: false, text: d.error ?? "Error" });
  }

  const input = "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple";

  return (
    <form onSubmit={submit} className="space-y-3">
      <h2 className="text-sm font-semibold text-white/70">🔥 Clave Tabú (desbloquea contenido adulto)</h2>
      {hasPin && <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Clave actual" className={input} />}
      <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Nueva clave (mín. 4)" className={input} />
      <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmar clave" className={input} />
      <button type="submit" disabled={busy} className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "Guardando…" : "Guardar clave"}
      </button>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
    </form>
  );
}
