"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type DisputeDTO = { id: string; credits: number; listingTitle: string; buyer: string; seller: string };

export default function MarketDisputeRow({ order }: { order: DisputeDTO }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function resolve(action: "release" | "refund") {
    if (busy) return;
    if (!confirm(action === "release" ? `¿Liberar ${order.credits} ☾ al vendedor @${order.seller}?` : `¿Reembolsar ${order.credits} ☾ al comprador @${order.buyer}?`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/market/orders/${order.id}/resolve`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else { const d = await res.json().catch(() => ({})); alert(d.error ?? "Error"); }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <div className="text-sm text-white/85">{order.listingTitle} · {order.credits} ☾</div>
        <div className="text-xs text-white/40">comprador @{order.buyer} · vendedor @{order.seller}</div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => resolve("release")} disabled={busy} className="rounded-full bg-purple px-3 py-1.5 text-xs font-medium text-navy disabled:opacity-50">Liberar al vendedor</button>
        <button onClick={() => resolve("refund")} disabled={busy} className="rounded-full border border-red-400/40 px-3 py-1.5 text-xs text-red-300 disabled:opacity-50">Reembolsar</button>
      </div>
    </div>
  );
}
