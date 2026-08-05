"use client";

import { useRouter } from "next/navigation";

const CHIPS: { key: string; label: string; enabled: boolean }[] = [
  { key: "all", label: "Todo", enabled: true },
  { key: "users", label: "Personas", enabled: true },
  { key: "posts", label: "Post", enabled: true },
  { key: "tags", label: "Hashtag", enabled: true },
  { key: "tabu", label: "Tabú", enabled: true },
  { key: "reels", label: "Reels", enabled: true },
  { key: "paginas", label: "Páginas", enabled: true },
  { key: "grupos", label: "Grupos", enabled: true },
];

export default function SearchFilters({ q, active }: { q: string; active: string }) {
  const router = useRouter();
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      {CHIPS.map((c) => {
        const isActive = c.key === active;
        if (!c.enabled) {
          return (
            <span key={c.key} className="shrink-0 cursor-not-allowed rounded-full border border-white/5 px-4 py-1.5 text-sm text-white/25" title="Pronto">
              {c.label} <span className="text-[10px]">pronto</span>
            </span>
          );
        }
        return (
          <button
            key={c.key}
            onClick={() => router.push(`/buscar?q=${encodeURIComponent(q)}&type=${c.key}`)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition ${
              isActive ? "border-purple bg-purple/15 text-white" : "border-white/10 text-white/60 hover:text-white"
            }`}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
