"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/** Contenedor MeryCoin del panel derecho (calca Home.svg): título + pill de saldo. */
export default function MeryCoinCard() {
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    let ignore = false;
    fetch("/api/wallet/balance")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!ignore && d) setBalance(d.balance);
      });
    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="border-b border-white/10 pb-5">
      <h2 className="mb-3 text-sm font-semibold text-white/70">MeryCoin</h2>
      <Link
        href="/cartera"
        className="inline-flex items-center gap-2 rounded-full bg-purple/15 px-4 py-2 text-sm font-semibold text-purple transition hover:bg-purple/25"
        aria-label="Cartera"
      >
        <span className="h-3.5 w-3.5 rounded-[3px] bg-gradient-to-tl from-purple to-purple-soft" />
        {balance ?? "—"}
      </Link>
    </div>
  );
}
