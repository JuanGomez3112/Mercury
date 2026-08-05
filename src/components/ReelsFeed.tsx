"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import { IconHeart, IconHeartFill, IconPlus } from "./icons";
import type { ReelItem } from "@/lib/reels";

/* eslint-disable @next/next/no-img-element */
function ReelCard({ reel, muted, onToggleMute }: { reel: ReelItem; muted: boolean; onToggleMute: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(reel.likedByMe);
  const [count, setCount] = useState(reel.likeCount);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) v.play().catch(() => {});
        else { v.pause(); v.currentTime = 0; }
      },
      { threshold: 0.6 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  async function like() {
    if (busy) return;
    setBusy(true);
    const optimistic = !liked;
    setLiked(optimistic);
    setCount((c) => c + (optimistic ? 1 : -1));
    const res = await fetch(`/api/reels/${reel.id}/like`, { method: "POST" });
    setBusy(false);
    if (res.ok) { const d = await res.json(); setLiked(d.liked); setCount(d.likeCount); }
  }

  function togglePlay() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  }

  return (
    <div className="relative h-[100dvh] w-full shrink-0 snap-start bg-black">
      <video ref={ref} src={reel.videoUrl} loop playsInline muted={muted} onClick={togglePlay} className="h-full w-full object-contain" />

      {/* Acciones (derecha) */}
      <div className="absolute bottom-28 right-3 flex flex-col items-center gap-5">
        <button onClick={like} className="flex flex-col items-center text-white" aria-label="Me gusta">
          {liked ? <IconHeartFill className="text-[34px] text-red-500" /> : <IconHeart className="text-[34px]" />}
          <span className="text-xs">{count}</span>
        </button>
        <button onClick={onToggleMute} className="flex h-11 w-11 items-center justify-center rounded-full bg-white/15 text-lg text-white backdrop-blur" aria-label={muted ? "Activar sonido" : "Silenciar"}>
          {muted ? "🔇" : "🔊"}
        </button>
      </div>

      {/* Autor + caption (abajo) */}
      <div className="absolute inset-x-0 bottom-20 bg-gradient-to-t from-black/70 to-transparent px-4 pb-4 pt-10">
        <Link href={`/u/${reel.author.username}`} className="flex items-center gap-2">
          <Avatar src={reel.author.avatarUrl} className="h-9 w-9 ring-2 ring-white/40" />
          <span className="font-semibold text-white">{reel.author.displayName ?? reel.author.username}</span>
        </Link>
        {reel.caption && <p className="mt-2 max-w-md text-sm text-white/90">{reel.caption}</p>}
      </div>
    </div>
  );
}

export default function ReelsFeed({ reels }: { reels: ReelItem[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [muted, setMuted] = useState(true);
  const [pending, setPending] = useState<{ file: File; url: string } | null>(null);
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) setPending({ file, url: URL.createObjectURL(file) });
  }

  async function publish() {
    if (!pending || busy) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("files", pending.file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const ud = await up.json().catch(() => ({}));
      if (!up.ok || !ud.urls?.[0]) throw new Error();
      const res = await fetch("/api/reels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl: ud.urls[0], caption: caption.trim() || undefined }),
      });
      if (!res.ok) throw new Error();
      setPending(null); setCaption("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 bg-black">
      {/* Feed */}
      <div className="no-scrollbar mx-auto h-full max-w-[500px] snap-y snap-mandatory overflow-y-scroll">
        {reels.length === 0 ? (
          <div className="flex h-[100dvh] flex-col items-center justify-center gap-3 text-center">
            <span className="text-4xl">🎬</span>
            <p className="text-white/70">Aún no hay reels</p>
            <button onClick={() => fileRef.current?.click()} className="rounded-full bg-gradient-to-tl from-purple to-purple-soft px-5 py-2.5 text-sm font-semibold text-white">Sube el primero</button>
          </div>
        ) : (
          reels.map((r) => <ReelCard key={r.id} reel={r} muted={muted} onToggleMute={() => setMuted((m) => !m)} />)
        )}
      </div>

      {/* Barra superior */}
      <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-4">
        <Link href="/feed" aria-label="Volver" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-xl text-white backdrop-blur">‹</Link>
        <span className="font-semibold text-white drop-shadow">Reels</span>
        <button onClick={() => fileRef.current?.click()} aria-label="Crear reel" className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur">
          <IconPlus className="h-4 w-4" />
        </button>
      </div>

      <input ref={fileRef} type="file" accept="video/mp4,video/webm" hidden onChange={pick} />

      {/* Overlay de creación */}
      {pending && (
        <div className="absolute inset-0 z-40 flex flex-col bg-black">
          <div className="flex items-center justify-between p-4">
            <button onClick={() => { setPending(null); setCaption(""); }} className="text-xl text-white/80">×</button>
            <span className="text-sm font-semibold text-white">Nuevo reel</span>
            <button onClick={publish} disabled={busy} className="rounded-full bg-gradient-to-tl from-purple to-purple-soft px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "…" : "Publicar"}</button>
          </div>
          <div className="flex flex-1 items-center justify-center">
            <video src={pending.url} className="max-h-full max-w-full" autoPlay loop muted playsInline />
          </div>
          <div className="p-4">
            <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={500} placeholder="Añade una descripción…" className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/40" />
          </div>
        </div>
      )}
    </div>
  );
}
