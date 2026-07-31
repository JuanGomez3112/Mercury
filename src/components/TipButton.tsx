"use client";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOutside } from "@/lib/useOutside";

export default function TipButton({ toUsername, postId }: { toUsername: string; postId?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [custom, setCustom] = useState<number | "">("");
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);

  async function tip(amount: number) {
    if (amount < 1) return;
    setBusy(true);
    const res = await fetch("/api/tips", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ toUsername, postId, amount }) });
    setBusy(false);
    setOpen(false);
    if (res.ok) router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="transition hover:text-purple" aria-label="Propina">☾</button>
      {open && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-48 rounded-xl border border-white/10 bg-navy-2 p-3 shadow-2xl">
          <div className="mb-2 flex gap-1.5">
            {[5, 10, 50].map((a) => (
              <button key={a} onClick={() => tip(a)} disabled={busy} className="flex-1 rounded-lg bg-purple/15 py-1.5 text-xs font-semibold text-purple hover:bg-purple/25 disabled:opacity-50">{a} ☾</button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input type="number" min={1} value={custom} onChange={(e) => setCustom(e.target.value === "" ? "" : Number(e.target.value))} placeholder="otro" className="w-full rounded-lg border border-white/10 bg-navy px-2 py-1 text-xs text-white outline-none" />
            <button onClick={() => custom !== "" && tip(Number(custom))} disabled={busy || custom === ""} className="rounded-lg bg-purple px-2 py-1 text-xs font-semibold text-white disabled:opacity-50">Dar</button>
          </div>
        </div>
      )}
    </div>
  );
}
