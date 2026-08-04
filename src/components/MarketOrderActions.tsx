"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MarketOrderActions({ orderId, isBuyer, status }: { orderId: string; isBuyer: boolean; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(path: string, confirmMsg?: string) {
    if (busy) return;
    if (confirmMsg && !confirm(confirmMsg)) return;
    setBusy(true);
    const res = await fetch(`/api/market/orders/${orderId}/${path}`, { method: "POST" });
    setBusy(false);
    if (res.ok) router.refresh();
    else { const d = await res.json().catch(() => ({})); alert(d.error ?? "Error"); }
  }

  if (status !== "held") return null;

  return (
    <div className="flex gap-2">
      {isBuyer && (
        <button onClick={() => act("confirm", "¿Confirmas que recibiste? Se liberan los ☾ al vendedor.")} disabled={busy}
          className="rounded-full bg-purple px-3 py-1.5 text-xs font-medium text-navy disabled:opacity-50">Confirmar recepción</button>
      )}
      <button onClick={() => act("dispute", "¿Abrir disputa? El admin decidirá.")} disabled={busy}
        className="rounded-full border border-red-400/40 px-3 py-1.5 text-xs text-red-300 disabled:opacity-50">Disputar</button>
    </div>
  );
}
