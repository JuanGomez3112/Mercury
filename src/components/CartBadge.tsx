"use client";
import { useEffect, useState } from "react";

/** Insignia con el nº de ítems en el carrito. Pensada para ir junto al ítem "Tienda" del nav. */
export default function CartBadge() {
  const [n, setN] = useState(0);

  useEffect(() => {
    const load = () =>
      fetch("/api/cart/count").then((r) => r.json()).then((d) => setN(d.count ?? 0)).catch(() => {});
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  if (n <= 0) return null;

  return (
    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
      {n > 99 ? "99+" : n}
    </span>
  );
}
