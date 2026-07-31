"use client";

import { useState } from "react";

export default function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/me/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next, confirm }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg({ ok: true, text: hasPassword ? "Contraseña actualizada" : "Contraseña establecida" });
      setCurrent(""); setNext(""); setConfirm("");
    } else {
      setMsg({ ok: false, text: d.error ?? "Error" });
    }
  }

  const input = "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple";

  return (
    <form onSubmit={submit} className="space-y-3">
      <h2 className="text-sm font-semibold text-white/70">
        {hasPassword ? "Cambiar contraseña" : "Establecer contraseña"}
      </h2>
      {hasPassword && (
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Contraseña actual" className={input} autoComplete="current-password" />
      )}
      <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Nueva contraseña (mín. 8)" className={input} autoComplete="new-password" />
      <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmar nueva contraseña" className={input} autoComplete="new-password" />
      <button type="submit" disabled={busy} className="rounded-xl bg-gradient-to-tl from-purple to-purple-soft px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "Guardando…" : "Guardar"}
      </button>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
    </form>
  );
}
