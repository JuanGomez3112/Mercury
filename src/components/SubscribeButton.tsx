"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SubscribeButton({ username, price, activeUntil }: { username: string; price: number; activeUntil?: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function subscribe() {
    setBusy(true); setErr("");
    const res = await fetch(`/api/creators/${username}/subscribe`, { method: "POST" });
    setBusy(false);
    if (res.ok) router.refresh();
    else { const d = await res.json().catch(() => ({})); setErr(d.error ?? "Error"); }
  }

  if (activeUntil) {
    return <span className="rounded-[1.25rem] border-2 border-purple/40 px-4 py-2 text-sm font-bold text-purple">Suscrito · vence {new Date(activeUntil).toLocaleDateString("es")}</span>;
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <button onClick={subscribe} disabled={busy} className="rounded-[1.25rem] bg-gradient-to-tl from-purple to-purple-soft px-4 py-2 text-sm font-bold text-white disabled:opacity-50">
        {busy ? "…" : `Suscribirse por ${price} ☾/mes`}
      </button>
      {err && <span className="text-xs text-red-400">{err}</span>}
    </div>
  );
}
