"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function TokenConfigForm({
  maxSupply,
  treasury,
  circulating,
  rateCents,
  launched,
}: {
  maxSupply: number;
  treasury: number;
  circulating: number;
  rateCents: number;
  launched: boolean;
}) {
  const router = useRouter();
  const [rate, setRate] = useState(rateCents);
  const [isLaunched, setIsLaunched] = useState(launched);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const input = "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple";

  async function save() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/admin/token", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rateCents: Number(rate), launched: isLaunched }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setMsg({ ok: true, text: "Guardado" }); router.refresh(); }
    else setMsg({ ok: false, text: d.error ?? "Error" });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-5 text-center">
          <p className="text-xs text-white/50">Supply máximo</p>
          <p className="mt-1 text-2xl font-bold text-white">{maxSupply.toLocaleString()} ☾</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-5 text-center">
          <p className="text-xs text-white/50">Treasury</p>
          <p className="mt-1 text-2xl font-bold text-white">{treasury.toLocaleString()} ☾</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-5 text-center">
          <p className="text-xs text-white/50">Circulante</p>
          <p className="mt-1 text-2xl font-bold text-white">{circulating.toLocaleString()} ☾</p>
        </div>
      </div>
      <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-6">
        <h2 className="mb-3 text-sm font-semibold text-white/70">Config del token</h2>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs text-white/50">Tasa (¢ por 1 ☾)</label>
            <input type="number" min={1} value={rate} onChange={(e) => setRate(Number(e.target.value))} className={input} />
          </div>
          <label className="flex items-center gap-2 text-sm text-white/80">
            <input type="checkbox" checked={isLaunched} onChange={(e) => setIsLaunched(e.target.checked)} className="h-4 w-4 accent-purple" />
            Lanzado (habilita retiros y on-ramp real)
          </label>
          <button onClick={save} disabled={busy} className="rounded-xl bg-gradient-to-tl from-purple to-purple-soft px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
            {busy ? "Guardando…" : "Guardar"}
          </button>
          {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
        </div>
      </div>
    </div>
  );
}
