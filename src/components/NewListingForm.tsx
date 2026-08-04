"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconImage } from "./icons";

const CATEGORIES = ["ropa", "tecnología", "hogar", "juguetes", "coleccionables", "servicios", "otros"];
const MAX = 10;

const field = "w-full rounded-lg border border-white/10 bg-navy px-3.5 py-2.5 text-white outline-none placeholder:text-white/30 focus:border-purple";
const label = "mb-1.5 block text-sm text-purple-soft";

export default function NewListingForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState<number | "">("");
  const [files, setFiles] = useState<File[]>([]);
  const [acceptsCredits, setAcceptsCredits] = useState(true);
  const [acceptsCash, setAcceptsCash] = useState(false);
  const [condition, setCondition] = useState<"new" | "used">("used");
  const [category, setCategory] = useState("otros");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const previews = files.map((f) => ({ f, url: URL.createObjectURL(f) }));

  async function submit() {
    setError("");
    if (!title.trim()) return setError("Pon un título");
    if (acceptsCredits && (price === "" || Number(price) < 0)) return setError("Pon un precio en ☾");
    if (!acceptsCredits && !acceptsCash) return setError("Elige al menos un método de pago");
    setBusy(true);
    let images: string[] = [];
    if (files.length > 0) {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      if (!up.ok) { setError("Error al subir imágenes"); setBusy(false); return; }
      images = (await up.json()).urls;
    }
    const res = await fetch("/api/market/listings", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, images, priceCredits: price === "" ? 0 : Number(price), acceptsCredits, acceptsCash, condition, category, location }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) router.push(`/market/${d.id}`);
    else setError(d.error ?? "Error al publicar");
  }

  return (
    <div className="space-y-4">
      <label className="block"><span className={label}>Título</span>
        <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="¿Qué vendes?" /></label>
      <label className="block"><span className={label}>Descripción</span>
        <textarea className={`${field} min-h-[100px] resize-none`} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalles, estado, medidas…" /></label>

      {previews.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {previews.map((p, i) => (
            <div key={p.url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="aspect-square w-full rounded-lg object-cover" />
              <button onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-navy text-xs text-white/80 ring-1 ring-white/20">×</button>
            </div>
          ))}
        </div>
      )}
      <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-white/10 bg-navy px-4 py-2.5 text-sm text-white/80 hover:bg-navy-2">
        <IconImage className="h-5 w-5 text-purple" /> Añadir fotos
      </button>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden"
        onChange={(e) => { setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])].slice(0, MAX)); e.target.value = ""; }} />

      <div className="grid grid-cols-2 gap-3">
        <label className="block"><span className={label}>Precio ☾</span>
          <input className={field} type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0" /></label>
        <label className="block"><span className={label}>Condición</span>
          <select className={field} value={condition} onChange={(e) => setCondition(e.target.value as "new" | "used")}>
            <option value="used">Usado</option><option value="new">Nuevo</option>
          </select></label>
        <label className="block"><span className={label}>Categoría</span>
          <select className={field} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select></label>
        <label className="block"><span className={label}>Ubicación</span>
          <input className={field} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ciudad (para efectivo)" /></label>
      </div>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2 text-sm text-white/80"><input type="checkbox" checked={acceptsCredits} onChange={(e) => setAcceptsCredits(e.target.checked)} className="accent-purple" /> Acepta ☾ (con escrow)</label>
        <label className="flex items-center gap-2 text-sm text-white/80"><input type="checkbox" checked={acceptsCash} onChange={(e) => setAcceptsCash(e.target.checked)} className="accent-purple" /> Acepta efectivo (trato fuera de la plataforma)</label>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      <button onClick={submit} disabled={busy} className="w-full rounded-lg bg-purple py-2.5 font-medium text-navy transition hover:opacity-90 disabled:opacity-60">
        {busy ? "Publicando…" : "Publicar anuncio"}
      </button>
    </div>
  );
}
