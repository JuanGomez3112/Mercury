"use client";
import { useMemo, useState } from "react";

type Variant = { id: string; label: string; priceCredits: number; priceCents: number; stock: number };

const select =
  "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none focus:border-purple disabled:opacity-40";

export default function AddToCart({ variants }: { variants: Variant[] }) {
  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [variantId, setVariantId] = useState<string | undefined>(firstAvailable?.id);
  const [qty, setQty] = useState(1);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const variant = useMemo(() => variants.find((v) => v.id === variantId), [variants, variantId]);
  const soldOut = !variant || variant.stock <= 0;

  async function add() {
    if (!variant || soldOut) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variantId: variant.id, qty }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Error");
      setMsg({ ok: true, text: "Añadido al carrito" });
    } catch (e) {
      setMsg({ ok: false, text: e instanceof Error ? e.message : "Error" });
    } finally {
      setBusy(false);
    }
  }

  if (variants.length === 0) {
    return (
      <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-6 text-center text-sm text-white/40">
        Sin variantes disponibles.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-2xl border border-white/10 bg-navy-2/50 p-6">
      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-white/40">Variante</label>
        <select
          value={variantId}
          onChange={(e) => {
            const next = variants.find((v) => v.id === e.target.value);
            setVariantId(e.target.value);
            if (next) setQty((q) => Math.min(q, next.stock) || 1);
          }}
          className={select}
        >
          {variants.map((v) => (
            <option key={v.id} value={v.id} disabled={v.stock <= 0}>
              {v.label} {v.stock <= 0 ? "— agotada" : `(${v.stock} disp.)`}
            </option>
          ))}
        </select>
      </div>

      {variant && (
        <p className="text-lg font-semibold text-white">
          {variant.priceCredits} ☾ <span className="text-sm font-normal text-white/40">/ ${(variant.priceCents / 100).toFixed(2)}</span>
        </p>
      )}

      <div className="space-y-1.5">
        <label className="text-xs font-semibold uppercase tracking-wide text-white/40">Cantidad</label>
        <input
          type="number"
          min={1}
          max={variant ? Math.max(variant.stock, 1) : 1}
          value={qty}
          disabled={soldOut}
          onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
          className={`${select} w-24`}
        />
      </div>

      <button
        onClick={add}
        disabled={busy || soldOut}
        className="w-full rounded-xl bg-gradient-to-tl from-purple to-purple-soft px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
      >
        {soldOut ? "Agotada" : busy ? "Añadiendo…" : "Añadir al carrito"}
      </button>

      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
    </div>
  );
}
