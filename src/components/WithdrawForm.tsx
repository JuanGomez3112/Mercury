"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WithdrawForm({ max, launched, rateCents }: { max: number; launched: boolean; rateCents: number }) {
  const router = useRouter();
  const [credits, setCredits] = useState<number | "">("");
  const [payout, setPayout] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const input = "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple";

  if (!launched) {
    return <p className="text-xs text-white/40">Retiros disponibles al lanzamiento (pre-lanzamiento).</p>;
  }
  const cents = credits === "" ? 0 : Number(credits) * rateCents;

  async function withdraw() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/wallet/withdraw", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credits: Number(credits), payoutInfo: payout }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setMsg({ ok: true, text: "Solicitud de retiro creada" }); setCredits(""); setPayout(""); router.refresh(); }
    else setMsg({ ok: false, text: d.error ?? "Error" });
  }

  return (
    <div className="mt-3 space-y-2">
      <input type="number" min={1} max={max} value={credits} onChange={(e) => setCredits(e.target.value === "" ? "" : Number(e.target.value))} placeholder={`Monto ☾ (máx ${max})`} className={input} />
      <input value={payout} onChange={(e) => setPayout(e.target.value)} placeholder="Datos de pago (banco, cuenta, etc.)" className={input} />
      <p className="text-xs text-white/40">Recibirás ≈ ${(cents / 100).toFixed(2)}</p>
      <button onClick={withdraw} disabled={busy || credits === "" || Number(credits) > max} className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Solicitar retiro</button>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
    </div>
  );
}
