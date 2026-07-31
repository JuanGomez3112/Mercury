"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

export default function WalletBadge() {
  const [balance, setBalance] = useState<number | null>(null);
  useEffect(() => {
    let ignore = false;
    fetch("/api/wallet/balance").then((r) => r.ok ? r.json() : null).then((d) => { if (!ignore && d) setBalance(d.balance); });
    return () => { ignore = true; };
  }, []);
  return (
    <Link href="/cartera" className="flex h-9 items-center gap-1.5 rounded-full bg-purple/15 px-3 text-sm font-semibold text-purple transition hover:bg-purple/25" aria-label="Cartera">
      <span>{balance ?? "—"}</span><span>☾</span>
    </Link>
  );
}
