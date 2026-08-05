"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreatePageForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr("");
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) { router.push(`/paginas/${d.slug}`); router.refresh(); }
    else setErr(d.error ?? "Error");
  }

  const input = "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple";

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="w-full rounded-xl bg-gradient-to-tl from-purple to-purple-soft px-5 py-3 text-sm font-semibold text-white max-sm:rounded-none">
        + Crear página
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl border border-white/10 bg-navy-2/50 p-5 max-sm:rounded-none max-sm:border-x-0">
      <h2 className="text-sm font-semibold text-white">Nueva página</h2>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre de la página" maxLength={50} className={input} />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción (opcional)" maxLength={300} rows={2} className={`${input} resize-none`} />
      <div className="flex gap-2">
        <button type="submit" disabled={busy || name.trim().length < 2} className="rounded-xl bg-gradient-to-tl from-purple to-purple-soft px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Creando…" : "Crear"}</button>
        <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-4 py-2.5 text-sm text-white/60 hover:text-white">Cancelar</button>
      </div>
      {err && <p className="text-sm text-red-400">{err}</p>}
    </form>
  );
}
