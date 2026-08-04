"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ReportModal from "./ReportModal";

export default function MarketActions({
  listingId,
  sellerUsername,
  priceCredits,
  acceptsCredits,
  acceptsCash,
}: {
  listingId: string;
  sellerUsername: string;
  priceCredits: number;
  acceptsCredits: boolean;
  acceptsCash: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [reporting, setReporting] = useState(false);

  async function buy() {
    if (busy) return;
    if (!confirm(`¿Comprar por ${priceCredits} ☾? Se retienen en escrow hasta que confirmes que recibiste.`)) return;
    setBusy(true);
    setError("");
    const res = await fetch(`/api/market/listings/${listingId}/buy`, { method: "POST" });
    const d = await res.json().catch(() => ({}));
    setBusy(false);
    if (res.ok) router.push("/market/mis");
    else setError(d.error ?? "No se pudo comprar");
  }

  return (
    <div className="space-y-3">
      {acceptsCredits && (
        <button onClick={buy} disabled={busy} className="w-full rounded-full bg-purple py-3 text-sm font-semibold text-navy transition hover:opacity-90 disabled:opacity-50">
          {busy ? "Procesando…" : `Comprar por ${priceCredits} ☾ (con escrow)`}
        </button>
      )}
      {acceptsCash && (
        <Link href={`/mensajes/${sellerUsername}`} className="block w-full rounded-full border border-white/20 py-3 text-center text-sm font-semibold text-white transition hover:border-purple">
          Contactar para pago en efectivo
        </Link>
      )}
      <button onClick={() => setReporting(true)} className="w-full text-center text-xs text-white/40 hover:text-red-400">Reportar anuncio</button>
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
      {reporting && <ReportModal targetType="listing" targetId={listingId} onClose={() => setReporting(false)} />}
    </div>
  );
}
