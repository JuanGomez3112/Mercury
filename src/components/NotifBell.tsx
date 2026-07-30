"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import { IconBell } from "./icons";
import { useOutside } from "@/lib/useOutside";
import { timeAgo } from "@/lib/time";
import type { NotifItem } from "@/lib/queries";

const verb: Record<string, string> = {
  like: "le dio me gusta a tu publicación",
  comment: "comentó tu publicación",
  follow: "empezó a seguirte",
};

export default function NotifBell() {
  const [n, setN] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);

  useEffect(() => {
    const load = () =>
      fetch("/api/notifications/unread").then((r) => r.json()).then((d) => setN(d.count ?? 0)).catch(() => {});
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      const res = await fetch("/api/notifications");
      if (res.ok) setItems((await res.json()).notifications);
      setLoading(false);
      // marca leídas al abrir
      fetch("/api/notifications/read", { method: "POST" }).then(() => setN(0)).catch(() => {});
    }
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} className="relative text-purple transition hover:text-purple-soft" aria-label="Notificaciones">
        <IconBell className="h-6 w-6" />
        {n > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
            {n > 9 ? "9+" : n}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-2xl border border-white/10 bg-navy-2 shadow-2xl">
          <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">Notificaciones</div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="p-6 text-center text-sm text-white/40">Cargando…</p>
            ) : items.length === 0 ? (
              <p className="p-6 text-center text-sm text-white/40">Sin notificaciones.</p>
            ) : (
              items.map((it) => (
                <Link key={it.id} href={`/u/${it.actor.username}`} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/5">
                  <Avatar src={it.actor.avatarUrl} className="h-9 w-9" />
                  <div className="min-w-0 flex-1 text-sm text-white/80">
                    <span className="font-semibold text-white">{it.actor.displayName ?? it.actor.username}</span>{" "}
                    {verb[it.type] ?? "interactuó"}
                    <div className="text-xs text-white/40">{timeAgo(it.createdAt)}</div>
                  </div>
                </Link>
              ))
            )}
          </div>
          <Link href="/notificaciones" onClick={() => setOpen(false)} className="block border-t border-white/10 py-2.5 text-center text-sm font-medium text-purple hover:bg-white/5">
            Ver todas
          </Link>
        </div>
      )}
    </div>
  );
}
