"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Avatar from "./Avatar";
import { IconInbox } from "./icons";
import { useOutside } from "@/lib/useOutside";
import type { ChatPreview } from "@/lib/queries";

export default function InboxLink() {
  const [n, setN] = useState(0);
  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState<ChatPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);

  useEffect(() => {
    const load = () =>
      fetch("/api/messages/unread").then((r) => r.json()).then((d) => setN(d.count ?? 0)).catch(() => {});
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      const res = await fetch("/api/messages/recent");
      if (res.ok) setChats((await res.json()).chats);
      setLoading(false);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={toggle} className="relative text-purple transition hover:text-purple-soft" aria-label="Mensajes">
        <IconInbox className="h-7 w-7" />
        {n > 0 && (
          <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
            {n > 9 ? "9+" : n}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-2xl border border-white/10 bg-navy-2 shadow-2xl">
          <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">Mensajes</div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="p-6 text-center text-sm text-white/40">Cargando…</p>
            ) : chats.length === 0 ? (
              <p className="p-6 text-center text-sm text-white/40">Sin conversaciones.</p>
            ) : (
              chats.map((c) => (
                <Link key={c.partner.username} href={`/mensajes/${c.partner.username}`} onClick={() => setOpen(false)} className="flex items-center gap-3 px-4 py-3 transition hover:bg-white/5">
                  <Avatar src={c.partner.avatarUrl} className="h-9 w-9" />
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-white">{c.partner.displayName ?? c.partner.username}</span>
                    <span className={`block truncate text-xs ${c.unread > 0 ? "font-semibold text-white/80" : "text-white/40"}`}>
                      {c.mine && "Tú: "}
                      {c.body}
                    </span>
                  </div>
                  {c.unread > 0 && <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" />}
                </Link>
              ))
            )}
          </div>
          <Link href="/mensajes" onClick={() => setOpen(false)} className="block border-t border-white/10 py-2.5 text-center text-sm font-medium text-purple hover:bg-white/5">
            Ver todos
          </Link>
        </div>
      )}
    </div>
  );
}
