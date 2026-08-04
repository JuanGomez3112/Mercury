"use client";

import { useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import type { Candidate, MatchUser } from "@/lib/match";

/* eslint-disable @next/next/no-img-element */
export default function MatchDeck({
  initial,
  matches,
}: {
  initial: Candidate[];
  matches: MatchUser[];
}) {
  const [deck, setDeck] = useState<Candidate[]>(initial);
  const [i, setI] = useState(0);
  const [busy, setBusy] = useState(false);
  const [matched, setMatched] = useState<MatchUser | null>(null);
  const [anim, setAnim] = useState<"" | "like" | "pass">("");

  const current = deck[i];

  async function act(liked: boolean) {
    if (!current || busy) return;
    setBusy(true);
    setAnim(liked ? "like" : "pass");
    const res = await fetch("/api/match/swipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetId: current.id, liked }),
    });
    const d = await res.json().catch(() => ({}));
    setTimeout(() => {
      setI((n) => n + 1);
      setAnim("");
      setBusy(false);
      if (d.match && d.target) setMatched(d.target);
    }, 220);
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      {/* Matches */}
      {matches.length > 0 && (
        <div>
          <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-white/40">Tus matches</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {matches.map((m) => (
              <Link key={m.id} href={`/mensajes/${m.username}`} className="flex w-16 shrink-0 flex-col items-center gap-1">
                <Avatar src={m.avatarUrl} className="h-14 w-14 ring-2 ring-purple/50" />
                <span className="w-full truncate text-center text-[11px] text-white/60">{m.displayName ?? m.username}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Card actual */}
      {current ? (
        <div className={`relative overflow-hidden rounded-3xl border border-white/10 bg-navy-2 transition-all duration-200 ${anim === "like" ? "translate-x-24 rotate-6 opacity-0" : anim === "pass" ? "-translate-x-24 -rotate-6 opacity-0" : ""}`}>
          <div className="relative h-96 w-full bg-gradient-to-tr from-purple/30 via-navy-2 to-purple-soft/20">
            {current.coverUrl && <img src={current.coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            {current.avatarUrl && <img src={current.avatarUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5">
              <Link href={`/u/${current.username}`} className="text-2xl font-bold text-white hover:underline">
                {current.displayName ?? current.username}
              </Link>
              <p className="text-sm text-white/60">@{current.username}</p>
              {current.bio && <p className="mt-1 line-clamp-2 text-sm text-white/80">{current.bio}</p>}
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 py-5">
            <button onClick={() => act(false)} disabled={busy} aria-label="Pasar"
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/15 text-2xl text-white/70 transition hover:border-white/40 hover:text-white disabled:opacity-50">
              ✕
            </button>
            <button onClick={() => act(true)} disabled={busy} aria-label="Me gusta"
              className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tl from-purple to-purple-soft text-2xl text-white shadow-lg shadow-purple/40 transition hover:brightness-110 disabled:opacity-50">
              ♥
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-white/10 bg-navy-2/50 py-24 text-center">
          <span className="text-4xl">🎭</span>
          <p className="text-white/70">No hay más personas por ahora</p>
          <p className="max-w-xs text-sm text-white/40">Vuelve más tarde para descubrir nuevos perfiles.</p>
        </div>
      )}

      {/* Overlay de match */}
      {matched && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur" onClick={() => setMatched(null)}>
          <div className="w-full max-w-xs space-y-4 rounded-3xl border border-purple/40 bg-navy-2 p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <p className="text-3xl">💜</p>
            <h2 className="text-xl font-bold text-white">¡Es un match!</h2>
            <div className="flex justify-center">
              <Avatar src={matched.avatarUrl} className="h-20 w-20 ring-2 ring-purple/50" />
            </div>
            <p className="text-sm text-white/70">Tú y {matched.displayName ?? matched.username} se gustan.</p>
            <div className="flex flex-col gap-2">
              <Link href={`/mensajes/${matched.username}`} className="rounded-full bg-gradient-to-tl from-purple to-purple-soft px-5 py-2.5 text-sm font-semibold text-white">
                Enviar mensaje
              </Link>
              <button onClick={() => setMatched(null)} className="rounded-full px-5 py-2.5 text-sm text-white/60 hover:text-white">
                Seguir descubriendo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
