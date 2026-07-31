"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RechargeForm() {
  const router = useRouter();
  const [amount, setAmount] = useState(500);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function recharge(a: number) {
    setBusy(true); setMsg("");
    const res = await fetch("/api/wallet/topup", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount: a }),
    });
    setBusy(false);
    if (res.ok) { setMsg(`+${a} ☾ acreditados`); router.refresh(); }
    else setMsg("Error");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-center text-xs text-orange-300">
        Simulado — sin cobro real. Aquí se integrará el pago real más adelante.
      </div>
      <div className="flex gap-2">
        {[100, 500, 1000].map((a) => (
          <button key={a} onClick={() => recharge(a)} disabled={busy} className="flex-1 rounded-xl bg-gradient-to-tl from-purple to-purple-soft py-3 text-sm font-semibold text-white disabled:opacity-50">
            {a} ☾
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <input type="number" min={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="flex-1 rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none focus:border-purple" />
        <button onClick={() => recharge(amount)} disabled={busy} className="rounded-xl bg-purple px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">Recargar</button>
      </div>
      {msg && <p className="text-center text-sm text-emerald-400">{msg}</p>}
    </div>
  );
}
