"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export type CheckoutItem = { productName: string; label: string; priceCredits: number; priceCents: number; qty: number };
export type CheckoutZone = { id: string; countries: string[]; priceCredits: number; priceCents: number; isDefault: boolean };

const input =
  "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple";

export default function CheckoutForm({
  items,
  zones,
  balance,
  rateCents,
}: {
  items: CheckoutItem[];
  zones: CheckoutZone[];
  balance: number;
  rateCents: number;
}) {
  const router = useRouter();
  const [shipName, setShipName] = useState("");
  const [shipLine1, setShipLine1] = useState("");
  const [shipLine2, setShipLine2] = useState("");
  const [shipCity, setShipCity] = useState("");
  const [shipState, setShipState] = useState("");
  const [shipCountry, setShipCountry] = useState("");
  const [shipZip, setShipZip] = useState("");
  const [shipPhone, setShipPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"merycoin" | "external">("merycoin");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [done, setDone] = useState<{ orderId: string } | null>(null);

  const subtotalCredits = useMemo(() => items.reduce((a, it) => a + it.priceCredits * it.qty, 0), [items]);
  const subtotalCents = useMemo(() => items.reduce((a, it) => a + it.priceCents * it.qty, 0), [items]);

  const zone = useMemo(() => {
    const code = shipCountry.trim().toUpperCase();
    if (code) {
      const byCountry = zones.find((z) => z.countries.includes(code));
      if (byCountry) return byCountry;
    }
    return zones.find((z) => z.isDefault) ?? null;
  }, [shipCountry, zones]);

  const shippingCredits = zone?.priceCredits ?? 0;
  const shippingCents = zone?.priceCents ?? 0;
  const totalCredits = subtotalCredits + shippingCredits;
  const totalCents = subtotalCents + shippingCents;
  const equivalentCents = Math.round((totalCredits * rateCents) / 100);

  const canSubmit =
    !busy &&
    shipName.trim() &&
    shipLine1.trim() &&
    shipCity.trim() &&
    shipCountry.trim() &&
    (paymentMethod !== "merycoin" || totalCredits <= balance);

  async function confirm() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod,
          shipName: shipName.trim(),
          shipLine1: shipLine1.trim(),
          shipLine2: shipLine2.trim() || undefined,
          shipCity: shipCity.trim(),
          shipState: shipState.trim() || undefined,
          shipCountry: shipCountry.trim().toUpperCase(),
          shipZip: shipZip.trim() || undefined,
          shipPhone: shipPhone.trim() || undefined,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ ok: false, text: d.error ?? "Error" });
        return;
      }
      if (paymentMethod === "external") {
        setDone({ orderId: d.orderId });
      } else {
        router.push(`/pedidos/${d.orderId}`);
      }
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="space-y-3 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-6 text-center">
        <p className="text-sm text-orange-300">
          Pago externo próximamente. Tu pedido quedó registrado como pendiente de pago.
        </p>
        <Link href={`/pedidos/${done.orderId}`} className="inline-block text-sm font-semibold text-purple hover:underline">
          Ver pedido
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3 rounded-2xl border border-white/10 bg-navy-2/50 p-5">
        <h2 className="text-sm font-semibold text-white/70">Dirección de envío</h2>
        <input value={shipName} onChange={(e) => setShipName(e.target.value)} placeholder="Nombre completo" className={input} />
        <input value={shipLine1} onChange={(e) => setShipLine1(e.target.value)} placeholder="Dirección" className={input} />
        <input value={shipLine2} onChange={(e) => setShipLine2(e.target.value)} placeholder="Dirección (línea 2, opcional)" className={input} />
        <div className="grid grid-cols-2 gap-2">
          <input value={shipCity} onChange={(e) => setShipCity(e.target.value)} placeholder="Ciudad" className={input} />
          <input value={shipState} onChange={(e) => setShipState(e.target.value)} placeholder="Estado (opcional)" className={input} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={shipCountry}
            onChange={(e) => setShipCountry(e.target.value)}
            placeholder="País (código, ej. MX)"
            maxLength={2}
            className={`${input} uppercase`}
          />
          <input value={shipZip} onChange={(e) => setShipZip(e.target.value)} placeholder="Código postal (opcional)" className={input} />
        </div>
        <input value={shipPhone} onChange={(e) => setShipPhone(e.target.value)} placeholder="Teléfono (opcional)" className={input} />
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-navy-2/50 p-5">
        <h2 className="text-sm font-semibold text-white/70">Método de pago</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setPaymentMethod("merycoin")}
            className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
              paymentMethod === "merycoin" ? "border-purple bg-purple/15 text-white" : "border-white/10 text-white/60 hover:bg-white/5"
            }`}
          >
            MeryCoin ☾
          </button>
          <button
            onClick={() => setPaymentMethod("external")}
            className={`flex-1 rounded-xl border px-4 py-2.5 text-sm font-semibold transition ${
              paymentMethod === "external" ? "border-purple bg-purple/15 text-white" : "border-white/10 text-white/60 hover:bg-white/5"
            }`}
          >
            Pago externo
          </button>
        </div>
        {paymentMethod === "external" && (
          <p className="text-xs text-orange-300">Próximamente. El pedido se crea pendiente de pago.</p>
        )}
        {paymentMethod === "merycoin" && totalCredits > balance && (
          <p className="text-xs text-red-400">Saldo insuficiente (tienes {balance} ☾).</p>
        )}
      </div>

      <div className="space-y-1.5 rounded-2xl border border-white/10 bg-navy-2/50 p-5">
        <div className="flex justify-between text-sm text-white/60">
          <span>Subtotal</span>
          <span>{paymentMethod === "merycoin" ? `${subtotalCredits} ☾` : `$${(subtotalCents / 100).toFixed(2)}`}</span>
        </div>
        <div className="flex justify-between text-sm text-white/60">
          <span>Envío{zone?.isDefault ? " (predeterminado)" : ""}</span>
          <span>{paymentMethod === "merycoin" ? `${shippingCredits} ☾` : `$${(shippingCents / 100).toFixed(2)}`}</span>
        </div>
        <div className="flex justify-between border-t border-white/10 pt-2 text-base font-semibold text-white">
          <span>Total</span>
          <span>{paymentMethod === "merycoin" ? `${totalCredits} ☾` : `$${(totalCents / 100).toFixed(2)}`}</span>
        </div>
        {paymentMethod === "merycoin" && (
          <p className="text-right text-xs text-white/30">≈ ${(equivalentCents / 100).toFixed(2)}</p>
        )}
      </div>

      <button
        onClick={confirm}
        disabled={!canSubmit}
        className="w-full rounded-xl bg-gradient-to-tl from-purple to-purple-soft px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
      >
        {busy ? "Procesando…" : "Confirmar pedido"}
      </button>
      {msg && <p className={`text-center text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
    </div>
  );
}
