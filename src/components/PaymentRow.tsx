"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type PaymentDTO = {
  id: string;
  kind: string;
  credits: number | null;
  amountCents: number;
  status: string;
  username: string;
  createdAt: string;
};

const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "Pendiente", cls: "text-amber-300 bg-amber-500/15" },
  paid: { label: "Pagado", cls: "text-emerald-300 bg-emerald-500/15" },
  failed: { label: "Fallido", cls: "text-white/40 bg-white/5" },
  refunded: { label: "Reembolsado", cls: "text-red-300 bg-red-500/15" },
};

const KIND: Record<string, string> = { buy_credits: "Compra ☾", store_order: "Orden tienda" };

export default function PaymentRow({ payment }: { payment: PaymentDTO }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function refund() {
    if (busy) return;
    if (!confirm("¿Reembolsar? Revierte el efecto contable (recupera ☾ / restock, baja reserva). El envío del dinero se hace aparte en BTCPay.")) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/admin/payments/${payment.id}/refund`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) {
      if (d.shortfall > 0) alert(`Reembolsado. Faltaron ${d.shortfall} ☾ (ya gastados) — deuda/pérdida a resolver.`);
      router.refresh();
    } else {
      setError(d.error ?? "Error");
    }
  }

  const st = STATUS[payment.status] ?? { label: payment.status, cls: "text-white/50 bg-white/5" };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div>
        <div className="text-sm text-white/80">
          {KIND[payment.kind] ?? payment.kind} · @{payment.username}
          {payment.credits ? ` · ${payment.credits} ☾` : ""}
        </div>
        <div className="text-xs text-white/40">
          ${(payment.amountCents / 100).toFixed(2)} · {new Date(payment.createdAt).toLocaleDateString("es")}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className={`rounded-full px-3 py-1 text-xs ${st.cls}`}>{st.label}</span>
        {payment.status === "paid" && (
          <button
            onClick={refund}
            disabled={busy}
            className="rounded-full border border-red-400/40 px-3 py-1 text-xs text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
          >
            {busy ? "…" : "Reembolsar"}
          </button>
        )}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
