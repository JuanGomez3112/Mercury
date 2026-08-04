"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import { useOutside } from "@/lib/useOutside";
import { IconSearch } from "./icons";
import type { SearchResult } from "@/lib/search";

export default function SearchBar() {
  const router = useRouter();
  const [openInput, setOpenInput] = useState(false);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<SearchResult | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useOutside(ref, () => { if (!q) setOpenInput(false); setRes(null); }, openInput);

  useEffect(() => {
    if (!q.trim()) { setRes(null); return; }
    let ignore = false;
    const t = setTimeout(async () => {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!ignore && r.ok) setRes(await r.json());
    }, 250);
    return () => { ignore = true; clearTimeout(t); };
  }, [q]);

  function reveal() {
    setOpenInput(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }
  function go(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/buscar?q=${encodeURIComponent(q.trim())}`);
    setRes(null);
  }

  if (!openInput) {
    return (
      <button
        onClick={reveal}
        aria-label="Buscar"
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-navy transition hover:brightness-95"
      >
        <IconSearch className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <form onSubmit={go} className="flex h-10 items-center gap-2 rounded-full bg-white px-4 text-navy">
        <IconSearch className="h-4 w-4 opacity-60" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape" && !q) setOpenInput(false); }}
          placeholder="Buscar"
          className="w-32 bg-transparent text-sm outline-none placeholder:text-navy/40 sm:w-56"
        />
      </form>

      {res && (q.trim().length > 0) && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-2xl border border-white/10 bg-navy-2 py-2 shadow-2xl">
          {res.users.length === 0 && res.posts.length === 0 && res.tags.length === 0 && (
            <p className="px-4 py-3 text-sm text-white/40">Sin resultados</p>
          )}
          {res.users.length > 0 && (
            <div className="py-1">
              <p className="px-4 pb-1 text-xs font-semibold uppercase text-white/30">Personas</p>
              {res.users.map((u) => (
                <Link key={u.username} href={`/u/${u.username}`} onClick={() => setRes(null)} className="flex items-center gap-3 px-4 py-2 hover:bg-white/5">
                  <Avatar src={u.avatarUrl} className="h-8 w-8" />
                  <span className="text-sm text-white">{u.displayName ?? u.username} <span className="text-white/40">@{u.username}</span></span>
                </Link>
              ))}
            </div>
          )}
          {res.tags.length > 0 && (
            <div className="py-1">
              <p className="px-4 pb-1 text-xs font-semibold uppercase text-white/30">Hashtags</p>
              {res.tags.map((t) => (
                <Link key={t.tag} href={`/buscar?q=${encodeURIComponent(t.tag)}&type=tags`} onClick={() => setRes(null)} className="flex items-center justify-between px-4 py-2 hover:bg-white/5">
                  <span className="text-sm text-purple">{t.tag}</span>
                  <span className="text-xs text-white/30">{t.count}</span>
                </Link>
              ))}
            </div>
          )}
          {q.trim() && (
            <Link href={`/buscar?q=${encodeURIComponent(q.trim())}`} onClick={() => setRes(null)} className="mt-1 block border-t border-white/10 px-4 py-2.5 text-sm text-purple hover:bg-white/5">
              Ver todos los resultados
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
