"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const NEXT_STATUS: Record<string, { status: string; label: string } | undefined> = {
  pending: { status: "paid", label: "Marcar pagado" },
  paid: { status: "shipped", label: "Marcar enviado" },
  shipped: { status: "delivered", label: "Marcar entregado" },
};

export default function OrderStatusButton({ orderId, status }: { orderId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function update(newStatus: string) {
    setBusy(true);
    setMsg(null);
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setBusy(false);
    if (res.ok) {
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setMsg(d.error ?? "Error");
    }
  }

  const next = NEXT_STATUS[status];
  const canCancel = status !== "cancelled" && status !== "delivered";

  if (!next && !canCancel) return null;

  return (
    <div className="flex items-center gap-2">
      {next && (
        <button
          onClick={() => update(next.status)}
          disabled={busy}
          className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          {next.label}
        </button>
      )}
      {canCancel && (
        <button
          onClick={() => update("cancelled")}
          disabled={busy}
          className="rounded-xl bg-red-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
        >
          Cancelar
        </button>
      )}
      {msg && <span className="text-xs text-red-400">{msg}</span>}
    </div>
  );
}
