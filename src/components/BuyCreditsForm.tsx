"use client";

import { useState } from "react";

// Compra real de ☾ vía BTCPay (cripto, cero comisión). Redirige al checkout hospedado del proveedor.
export default function BuyCreditsForm({ rateCents }: { rateCents: number }) {
  const [credits, setCredits] = useState(500);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const usd = (credits * rateCents) / 100;

  async function buy(amount: number) {
    if (busy || amount < 1) return;
    setBusy(true);
    setError("");
    const res = await fetch("/api/payments/buy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credits: amount }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok && d.redirectUrl) {
      window.location.href = d.redirectUrl; // checkout de BTCPay
      return;
    }
    setBusy(false);
    setError(d.error ?? "No se pudo iniciar el pago");
  }

  return (
    <div className="space-y-4 rounded-2xl border border-purple/30 bg-purple/[0.06] p-4">
      <div className="flex items-center gap-2">
        <span className="text-lg">₿</span>
        <h2 className="text-sm font-semibold text-white">Comprar con cripto</h2>
        <span className="ml-auto rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">sin comisión</span>
      </div>

      <div className="flex gap-2">
        {[100, 500, 1000].map((a) => (
          <button
            key={a}
            onClick={() => buy(a)}
            disabled={busy}
            className="flex-1 rounded-xl bg-gradient-to-tl from-purple to-purple-soft py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {a} ☾
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={credits}
          onChange={(e) => setCredits(Number(e.target.value))}
          className="flex-1 rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none focus:border-purple"
        />
        <button
          onClick={() => buy(credits)}
          disabled={busy}
          className="rounded-xl bg-purple px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Redirigiendo…" : "Pagar"}
        </button>
      </div>

      <p className="text-center text-xs text-white/40">≈ ${usd.toFixed(2)} USD · pagas en BTC / Lightning</p>
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </div>
  );
}
