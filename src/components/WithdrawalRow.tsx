"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WithdrawalRow({
  withdrawal,
}: {
  withdrawal: {
    id: string;
    credits: number;
    amountCents: number;
    payoutInfo: string;
    user: { username: string };
  };
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function resolve(action: "paid" | "rejected") {
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/admin/withdrawals/${withdrawal.id}`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(false);
    if (res.ok) { router.refresh(); }
    else { const d = await res.json().catch(() => ({})); setMsg(d.error ?? "Error"); }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 px-4 py-3 last:border-0">
      <div>
        <div className="text-sm text-white/80">@{withdrawal.user.username} — {withdrawal.credits} ☾ → ${(withdrawal.amountCents / 100).toFixed(2)}</div>
        <div className="text-xs text-white/40">{withdrawal.payoutInfo}</div>
        {msg && <div className="text-xs text-red-400">{msg}</div>}
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => resolve("paid")} disabled={busy} className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Pagar</button>
        <button onClick={() => resolve("rejected")} disabled={busy} className="rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Rechazar</button>
      </div>
    </div>
  );
}
