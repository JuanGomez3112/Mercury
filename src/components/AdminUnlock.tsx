"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Pantalla de segundo factor del panel admin. */
export default function AdminUnlock({ hasPin }: { hasPin: boolean }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    setBusy(false);
    if (res.ok) {
      setPin("");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Error");
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <div className="rounded-3xl border border-purple/30 bg-navy-2 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple/15 text-2xl">🔐</div>
        <h1 className="text-lg font-semibold text-white">Panel de administración</h1>
        {hasPin ? (
          <>
            <p className="mt-1 text-sm text-white/50">Introduce tu PIN admin para continuar.</p>
            <form onSubmit={unlock} className="mt-5 space-y-3">
              <input
                type="password"
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="PIN admin"
                className="w-full rounded-xl border border-white/10 bg-navy px-4 py-3 text-center text-white outline-none focus:border-purple"
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button type="submit" disabled={busy} className="w-full rounded-xl bg-gradient-to-tl from-purple to-purple-soft py-3 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? "Verificando…" : "Desbloquear"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-white/50">Aún no configuraste tu PIN admin.</p>
            <a href="/ajustes" className="mt-5 inline-block rounded-xl bg-gradient-to-tl from-purple to-purple-soft px-5 py-3 text-sm font-semibold text-white">
              Crear PIN en Ajustes
            </a>
          </>
        )}
      </div>
    </div>
  );
}
