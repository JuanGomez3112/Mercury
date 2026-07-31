"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UnlockButton({ kind, id, price }: { kind: "post" | "message"; id: string; price: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function unlock() {
    setBusy(true); setErr("");
    const url = kind === "post" ? `/api/posts/${id}/unlock` : `/api/messages/${id}/unlock`;
    const res = await fetch(url, { method: "POST" });
    setBusy(false);
    if (res.ok) router.refresh();
    else { const d = await res.json().catch(() => ({})); setErr(d.error ?? "Error"); }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button onClick={unlock} disabled={busy} className="rounded-full bg-gradient-to-tl from-purple to-purple-soft px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "…" : `Desbloquear por ${price} ☾`}
      </button>
      {err && <span className="text-xs text-red-400">{err}</span>}
    </div>
  );
}
