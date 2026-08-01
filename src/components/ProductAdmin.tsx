"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Variant = { id: string; label: string; priceCredits: number; priceCents: number; stock: number; active: boolean };
type Product = { id: string; name: string; description: string; images: string[]; active: boolean; variants: Variant[] };

const input = "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple";
const btn = "rounded-xl bg-gradient-to-tl from-purple to-purple-soft px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50";

export default function ProductAdmin({ products }: { products: Product[] }) {
  return (
    <div className="space-y-6">
      <NewProductForm />
      <div className="space-y-4">
        {products.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-navy-2/50 p-8 text-center text-sm text-white/40">Sin productos aún.</p>
        ) : products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </div>
  );
}

function NewProductForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function create() {
    if (!name.trim()) return;
    setBusy(true); setMsg(null);
    try {
      let images: string[] = [];
      if (files.length > 0) {
        const fd = new FormData();
        for (const f of files) fd.append("files", f);
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const ud = await up.json().catch(() => ({}));
        if (!up.ok) throw new Error(ud.error ?? "Error al subir imágenes");
        images = ud.urls ?? [];
      }
      const res = await fetch("/api/admin/products", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, images }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Error");
      setName(""); setDescription(""); setFiles([]);
      setMsg({ ok: true, text: "Producto creado" });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-6">
      <h2 className="mb-3 text-sm font-semibold text-white/70">Nuevo producto</h2>
      <div className="space-y-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" className={input} />
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripción" rows={3} className={input} />
        <input type="file" accept="image/*" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} className="text-sm text-white/60" />
        <button onClick={create} disabled={busy || !name.trim()} className={btn}>{busy ? "Creando…" : "Crear producto"}</button>
        {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function toggleActive() {
    setBusy(true);
    await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !product.active }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white">{product.name}</h3>
            {!product.active && <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/50">Inactivo</span>}
          </div>
          {product.description && <p className="mt-1 text-sm text-white/50">{product.description}</p>}
          {product.images.length > 0 && (
            <div className="mt-2 flex gap-2">
              {product.images.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={src} src={src} alt="" className="h-14 w-14 rounded-lg object-cover" />
              ))}
            </div>
          )}
        </div>
        <button onClick={toggleActive} disabled={busy} className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 hover:text-white disabled:opacity-50">
          {product.active ? "Desactivar" : "Activar"}
        </button>
      </div>

      <div className="mt-4 space-y-2 border-t border-white/5 pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-white/40">Variantes</h4>
        {product.variants.length === 0 && <p className="text-sm text-white/40">Sin variantes.</p>}
        {product.variants.map((v) => <VariantRow key={v.id} variant={v} />)}
        <NewVariantForm productId={product.id} />
      </div>
    </div>
  );
}

function VariantRow({ variant }: { variant: Variant }) {
  const router = useRouter();
  const [label, setLabel] = useState(variant.label);
  const [priceCredits, setPriceCredits] = useState(variant.priceCredits);
  const [priceCents, setPriceCents] = useState(variant.priceCents);
  const [stock, setStock] = useState(variant.stock);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const small = "rounded-lg border border-white/10 bg-navy px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple";

  async function save() {
    setBusy(true); setMsg(null);
    const res = await fetch(`/api/admin/variants/${variant.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label, priceCredits: Number(priceCredits), priceCents: Number(priceCents), stock: Number(stock) }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
    else { const d = await res.json().catch(() => ({})); setMsg(d.error ?? "Error"); }
  }

  async function toggleActive() {
    setBusy(true);
    await fetch(`/api/admin/variants/${variant.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !variant.active }),
    });
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`¿Eliminar variante "${variant.label}"?`)) return;
    setBusy(true);
    const res = await fetch(`/api/admin/variants/${variant.id}`, { method: "DELETE" });
    setBusy(false);
    if (res.ok) router.refresh();
    else { const d = await res.json().catch(() => ({})); setMsg(d.error ?? "Error"); }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/5 p-2.5">
      <input value={label} onChange={(e) => setLabel(e.target.value)} className={`${small} w-28`} placeholder="Etiqueta" />
      <input type="number" min={0} value={priceCredits} onChange={(e) => setPriceCredits(Number(e.target.value))} className={`${small} w-20`} placeholder="☾" />
      <input type="number" min={0} value={priceCents} onChange={(e) => setPriceCents(Number(e.target.value))} className={`${small} w-20`} placeholder="¢" />
      <input type="number" min={0} value={stock} onChange={(e) => setStock(Number(e.target.value))} className={`${small} w-20`} placeholder="Stock" />
      {!variant.active && <span className="text-xs text-white/40">Inactiva</span>}
      <button onClick={save} disabled={busy} className="rounded-lg bg-purple px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Guardar</button>
      <button onClick={toggleActive} disabled={busy} className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/60 disabled:opacity-50">
        {variant.active ? "Desactivar" : "Activar"}
      </button>
      <button onClick={remove} disabled={busy} className="rounded-lg border border-red-500/30 px-3 py-1.5 text-xs text-red-400 disabled:opacity-50">Eliminar</button>
      {msg && <span className="text-xs text-red-400">{msg}</span>}
    </div>
  );
}

function NewVariantForm({ productId }: { productId: string }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [priceCredits, setPriceCredits] = useState<number | "">("");
  const [priceCents, setPriceCents] = useState<number | "">("");
  const [stock, setStock] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const small = "rounded-lg border border-white/10 bg-navy px-2.5 py-1.5 text-xs text-white outline-none placeholder:text-white/30 focus:border-purple";

  async function create() {
    if (!label.trim() || priceCredits === "" || priceCents === "" || stock === "") return;
    setBusy(true); setMsg(null);
    const res = await fetch("/api/admin/variants", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, label, priceCredits: Number(priceCredits), priceCents: Number(priceCents), stock: Number(stock) }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setLabel(""); setPriceCredits(""); setPriceCents(""); setStock(""); router.refresh(); }
    else setMsg(d.error ?? "Error");
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-white/10 p-2.5">
      <input value={label} onChange={(e) => setLabel(e.target.value)} className={`${small} w-28`} placeholder="Etiqueta" />
      <input type="number" min={0} value={priceCredits} onChange={(e) => setPriceCredits(e.target.value === "" ? "" : Number(e.target.value))} className={`${small} w-20`} placeholder="☾" />
      <input type="number" min={0} value={priceCents} onChange={(e) => setPriceCents(e.target.value === "" ? "" : Number(e.target.value))} className={`${small} w-20`} placeholder="¢" />
      <input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value === "" ? "" : Number(e.target.value))} className={`${small} w-20`} placeholder="Stock" />
      <button onClick={create} disabled={busy} className="rounded-lg bg-gradient-to-tl from-purple to-purple-soft px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">+ Variante</button>
      {msg && <span className="text-xs text-red-400">{msg}</span>}
    </div>
  );
}
