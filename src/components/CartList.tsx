"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type CartRow = {
  variantId: string;
  qty: number;
  stock: number;
  label: string;
  priceCredits: number;
  priceCents: number;
  productId: string;
  productName: string;
  image: string | null;
};

export default function CartList({ items }: { items: CartRow[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setQty(variantId: string, qty: number) {
    setBusyId(variantId);
    await fetch(`/api/cart/${variantId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qty }),
    });
    setBusyId(null);
    router.refresh();
  }

  async function remove(variantId: string) {
    setBusyId(variantId);
    await fetch(`/api/cart/${variantId}`, { method: "DELETE" });
    setBusyId(null);
    router.refresh();
  }

  const subtotalCredits = items.reduce((a, it) => a + it.priceCredits * it.qty, 0);
  const subtotalCents = items.reduce((a, it) => a + it.priceCents * it.qty, 0);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {items.map((it) => (
          <div key={it.variantId} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-navy-2/50 p-3">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl bg-navy">
              {it.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image} alt={it.productName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xl text-white/20">☾</div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{it.productName}</p>
              <p className="text-xs text-white/40">{it.label}</p>
              <p className="mt-0.5 text-sm text-white/70">
                {it.priceCredits} ☾ <span className="text-xs text-white/40">/ ${(it.priceCents / 100).toFixed(2)}</span>
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setQty(it.variantId, it.qty - 1)}
                disabled={busyId === it.variantId}
                className="h-7 w-7 rounded-lg border border-white/10 text-sm text-white/70 hover:bg-white/5 disabled:opacity-40"
              >
                −
              </button>
              <span className="w-6 text-center text-sm text-white">{it.qty}</span>
              <button
                onClick={() => setQty(it.variantId, it.qty + 1)}
                disabled={busyId === it.variantId || it.qty >= it.stock}
                className="h-7 w-7 rounded-lg border border-white/10 text-sm text-white/70 hover:bg-white/5 disabled:opacity-40"
              >
                +
              </button>
            </div>
            <button
              onClick={() => remove(it.variantId)}
              disabled={busyId === it.variantId}
              className="text-xs text-white/40 hover:text-red-400 disabled:opacity-40"
            >
              Quitar
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-navy-2/50 p-4">
        <div>
          <p className="text-xs text-white/40">Subtotal</p>
          <p className="text-lg font-semibold text-white">
            {subtotalCredits} ☾ <span className="text-sm font-normal text-white/40">/ ${(subtotalCents / 100).toFixed(2)}</span>
          </p>
        </div>
        <Link
          href="/carrito/pagar"
          className="rounded-xl bg-gradient-to-tl from-purple to-purple-soft px-5 py-2.5 text-sm font-semibold text-white"
        >
          Ir a pagar
        </Link>
      </div>
    </div>
  );
}
