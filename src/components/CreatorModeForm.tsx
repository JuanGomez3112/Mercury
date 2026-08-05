"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Collab = { username: string; percent: number | "" };

export default function CreatorModeForm({
  initialMode,
  initialPrice,
  initialCollaborators = [],
}: {
  initialMode: boolean;
  initialPrice: number | null;
  initialCollaborators?: { username: string; percent: number }[];
}) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [price, setPrice] = useState<number | "">(initialPrice ?? "");
  const [collabs, setCollabs] = useState<Collab[]>(initialCollaborators);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function save() {
    setBusy(true); setMsg("");
    const res = await fetch("/api/me/creator", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creatorMode: mode,
        subPriceCredits: mode && price !== "" ? Number(price) : null,
        collaborators: mode ? collabs.filter((c) => c.username.trim() && c.percent !== "").map((c) => ({ username: c.username.trim(), percent: Number(c.percent) })) : [],
      }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setMsg("Guardado"); router.refresh(); } else setMsg(d.error ?? "Error");
  }

  const sum = collabs.reduce((s, c) => s + (c.percent === "" ? 0 : Number(c.percent)), 0);

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

      {mode && (
        <div className="space-y-2 rounded-xl border border-white/10 bg-navy/60 p-3">
          <p className="text-sm font-semibold text-white/80">Reparto de la suscripción (colaboradores)</p>
          <p className="text-xs text-white/40">Estos porcentajes se aplican a cada pago de suscripción que recibas.</p>
          {collabs.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-white/40">@</span>
              <input value={c.username} onChange={(e) => setCollabs((p) => p.map((x, idx) => idx === i ? { ...x, username: e.target.value.replace(/^@/, "") } : x))}
                placeholder="usuario" className="min-w-0 flex-1 rounded-lg border border-white/10 bg-navy px-3 py-2 text-sm text-white outline-none focus:border-purple" />
              <input type="number" min={1} max={99} value={c.percent} onChange={(e) => setCollabs((p) => p.map((x, idx) => idx === i ? { ...x, percent: e.target.value === "" ? "" : Number(e.target.value) } : x))}
                placeholder="%" className="w-16 rounded-lg border border-white/10 bg-navy px-2 py-2 text-center text-sm text-white outline-none focus:border-purple" />
              <span className="text-white/40">%</span>
              <button type="button" onClick={() => setCollabs((p) => p.filter((_, idx) => idx !== i))} className="text-white/40 hover:text-white" aria-label="Quitar">×</button>
            </div>
          ))}
          {collabs.length < 5 && (
            <button type="button" onClick={() => setCollabs((p) => [...p, { username: "", percent: "" }])} className="text-sm text-purple hover:underline">+ Añadir colaborador</button>
          )}
          <p className={`text-xs ${sum > 99 ? "text-red-400" : "text-white/40"}`}>Tú te quedas con {Math.max(0, 100 - sum)}% · colaboradores {sum}%</p>
        </div>
      )}

      <button onClick={save} disabled={busy} className="rounded-xl bg-gradient-to-tl from-purple to-purple-soft px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Guardando…" : "Guardar"}</button>
      {msg && <p className="text-sm text-emerald-400">{msg}</p>}
    </div>
  );
}
