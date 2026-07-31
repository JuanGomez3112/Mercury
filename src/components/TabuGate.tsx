"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TabuGate({
  hasPin,
  onUnlocked,
  onClose,
}: {
  hasPin: boolean;
  onUnlocked?: () => void;
  onClose?: () => void;
}) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onVis() {
      if (document.hidden) {
        navigator.sendBeacon?.("/api/me/tabu/lock") ||
          fetch("/api/me/tabu/lock", { method: "POST", keepalive: true });
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/me/tabu/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    setBusy(false);
    if (res.ok) { setPin(""); if (onUnlocked) onUnlocked(); else router.refresh(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? "Error"); }
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/80 p-4 backdrop-blur-sm"
      onClick={onClose ? () => onClose() : undefined}
    >
      <div
        className="w-full max-w-sm rounded-3xl border border-orange-500/30 bg-navy-2 p-8 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/15 text-2xl">🔥</div>
        <h2 className="text-lg font-semibold text-white">Contenido Tabú</h2>
        {hasPin ? (
          <>
            <p className="mt-1 text-sm text-white/50">Introduce tu clave para desbloquear.</p>
            <form onSubmit={unlock} className="mt-5 space-y-3">
              <input
                type="password"
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Clave Tabú"
                className="w-full rounded-xl border border-white/10 bg-navy px-4 py-3 text-center text-white outline-none focus:border-orange-500"
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button type="submit" disabled={busy} className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? "Verificando…" : "Desbloquear"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-white/50">Aún no configuraste una clave Tabú.</p>
            <a href="/ajustes" className="mt-5 inline-block rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white">
              Crear clave en Ajustes
            </a>
          </>
        )}
        {onClose && (
          <button onClick={() => onClose()} className="mt-4 text-xs text-white/40 transition hover:text-white/70">
            Cancelar
          </button>
        )}
      </div>
    </div>
  );
}
