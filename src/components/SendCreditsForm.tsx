"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SendCreditsForm() {
  const router = useRouter();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState<number | "">("");
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const input = "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple";

  async function send() {
    setBusy(true); setMsg(null);
    const res = await fetch("/api/wallet/send", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toUsername: to.replace(/^@/, ""), amount: Number(amount) }),
    });
    setBusy(false); setConfirm(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setMsg({ ok: true, text: `Enviado ${amount} ☾ a @${to.replace(/^@/, "")}` }); setTo(""); setAmount(""); router.refresh(); }
    else setMsg({ ok: false, text: d.error ?? "Error" });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-6">
      <h2 className="mb-3 text-sm font-semibold text-white/70">Enviar MeryCoin</h2>
      <div className="space-y-2">
        <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="@usuario" className={input} />
        <input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))} placeholder="Monto ☾" className={input} />
        {!confirm ? (
          <button onClick={() => { if (to && amount) setConfirm(true); }} className="rounded-xl bg-gradient-to-tl from-purple to-purple-soft px-5 py-2.5 text-sm font-semibold text-white">Enviar</button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/70">¿Enviar {amount} ☾ a @{to.replace(/^@/, "")}?</span>
            <button onClick={send} disabled={busy} className="rounded-xl bg-purple px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Confirmar</button>
            <button onClick={() => setConfirm(false)} className="text-sm text-white/50">Cancelar</button>
          </div>
        )}
        {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
