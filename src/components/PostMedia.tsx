"use client";

import { useEffect, useState } from "react";
import Avatar from "./Avatar";
import { IconHeart, IconHeartFill, IconComment, IconShare } from "./icons";
import { timeAgo } from "@/lib/time";
import type { FeedPost, CommentDTO } from "@/lib/types";
import UnlockButton from "./UnlockButton";
import ReportModal from "./ReportModal";

/* eslint-disable @next/next/no-img-element */

const VIDEO_RE = /\.(mp4|webm)(\?|$)/i;
function isVideo(url: string) { return VIDEO_RE.test(url); }

function Tile({ src, plus, onOpen }: { src: string; plus?: number; onOpen: () => void }) {
  const video = isVideo(src);
  return (
    <button type="button" onClick={onOpen} className="relative aspect-square w-full overflow-hidden">
      {video ? (
        <video src={src} className="h-full w-full object-cover" muted preload="metadata" />
      ) : (
        <img src={src} alt="" className="h-full w-full object-cover transition hover:opacity-90" />
      )}
      {video && !plus && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-4xl text-white/90">▶</span>
      )}
      {plus ? (
        <div className="absolute inset-0 flex items-center justify-center bg-navy/[0.64] text-3xl font-bold text-white">+{plus}</div>
      ) : null}
    </button>
  );
}

export default function PostMedia({ post, viewerAvatarUrl }: { post: FeedPost; viewerAvatarUrl?: string | null }) {
  const images = post.images;
  const [open, setOpen] = useState<number | null>(null);

  // Comentarios / likes del panel
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [loadingC, setLoadingC] = useState(false);
  const [text, setText] = useState("");
  const [liked, setLiked] = useState(post.likedByMe);
  const [likeCount, setLikeCount] = useState(post.likeCount);
  const [reportComment, setReportComment] = useState<string | null>(null);
  const [mComments, setMComments] = useState(false); // móvil: comentarios abiertos en el lightbox

  useEffect(() => {
    if (open === null) return;
    setLoadingC(true);
    fetch(`/api/posts/${post.id}/comments`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments ?? []))
      .finally(() => setLoadingC(false));
  }, [open, post.id]);

  useEffect(() => {
    if (open === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % images.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + images.length) % images.length));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, images.length]);

  async function sendComment() {
    if (!text.trim()) return;
    const res = await fetch(`/api/posts/${post.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: text }),
    });
    if (res.ok) {
      const d = await res.json();
      setComments((c) => [...c, d.comment]);
      setText("");
    }
  }

  async function toggleLike() {
    setLiked((v) => !v);
    setLikeCount((c) => c + (liked ? -1 : 1));
    const res = await fetch(`/api/posts/${post.id}/like`, { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      setLiked(d.liked);
      setLikeCount(d.count);
    }
  }

  if (post.locked) {
    return (
      <div className="relative mt-4 flex h-80 w-full items-center justify-center overflow-hidden rounded-xl border border-purple/20 bg-navy">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,#171334,#171334_12px,#1d1840_12px,#1d1840_24px)] opacity-60" />
        <div className="relative flex flex-col items-center gap-3 text-center">
          <span className="text-3xl">🔒</span>
          <p className="text-sm text-white/60">Contenido de pago</p>
          <UnlockButton kind="post" id={post.id} price={post.priceCredits ?? 0} />
        </div>
      </div>
    );
  }

  if (images.length === 0) return null;

  const grid =
    images.length === 1 ? (
      <button type="button" onClick={() => setOpen(0)} className="mt-4 block h-[640px] w-full overflow-hidden rounded-xl bg-navy max-sm:h-[420px]">
        {isVideo(images[0]) ? (
          <video src={images[0]} className="h-full w-full object-contain" controls preload="metadata" />
        ) : (
          <img src={images[0]} alt="" className="h-full w-full object-contain" />
        )}
      </button>
    ) : (
      (() => {
        const top = images.slice(0, 2);
        const bottom = images.slice(2, 5);
        const extra = images.length - 5;
        return (
          <div className="mt-4 w-full overflow-hidden rounded-xl">
            <div className="grid grid-cols-2 gap-0.5">
              {top.map((s, i) => <Tile key={s} src={s} onOpen={() => setOpen(i)} />)}
            </div>
            {bottom.length > 0 && (
              <div className="mt-0.5 grid grid-cols-3 gap-0.5">
                {bottom.map((s, i) => (
                  <Tile key={s} src={s} plus={i === bottom.length - 1 && extra > 0 ? extra : undefined} onOpen={() => setOpen(2 + i)} />
                ))}
              </div>
            )}
          </div>
        );
      })()
    );

  const authorName = post.author.displayName ?? post.author.username;

  return (
    <>
      {grid}

      {open !== null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4 max-sm:p-0" onClick={() => setOpen(null)}>
          <button className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20" onClick={() => setOpen(null)} aria-label="Cerrar">×</button>

          <div className="flex max-h-[90vh] w-full max-w-6xl overflow-hidden rounded-2xl bg-navy-2 max-sm:h-[100dvh] max-sm:max-h-none max-sm:flex-col max-sm:rounded-none" onClick={(e) => e.stopPropagation()}>
            {/* Contenedor 1: foto */}
            <div className="relative flex flex-1 items-center justify-center bg-black max-sm:w-full">
              {isVideo(images[open]) ? (
                <video src={images[open]} className="max-h-[90vh] max-w-full object-contain" controls autoPlay />
              ) : (
                <img src={images[open]} alt="" className="max-h-[90vh] max-w-full object-contain" />
              )}
              {images.length > 1 && (
                <>
                  <button className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20" onClick={() => setOpen((i) => (i === null ? i : (i - 1 + images.length) % images.length))} aria-label="Anterior">‹</button>
                  <button className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white hover:bg-white/20" onClick={() => setOpen((i) => (i === null ? i : (i + 1) % images.length))} aria-label="Siguiente">›</button>
                  <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">{open + 1} / {images.length}</span>
                </>
              )}
            </div>

            {/* Contenedor 2: comentarios + acciones */}
            <div className="flex w-[380px] shrink-0 flex-col border-l border-white/10 max-sm:w-full max-sm:border-l-0 max-sm:border-t">
              <div className="flex items-center gap-3 border-b border-white/10 p-4 max-sm:hidden">
                <Avatar src={post.author.avatarUrl} className="h-10 w-10" />
                <div className="leading-tight">
                  <div className="font-semibold text-white">{authorName}</div>
                  <div className="text-xs text-white/40">@{post.author.username}</div>
                </div>
              </div>

              <div className={`flex-1 space-y-4 overflow-y-auto p-4 ${mComments ? "" : "max-sm:hidden"}`}>
                {post.body && <p className="text-sm text-white/90">{post.body}</p>}
                {loadingC && <p className="text-sm text-white/40">Cargando comentarios…</p>}
                {!loadingC && comments.length === 0 && <p className="text-sm text-white/40">Sé el primero en comentar.</p>}
                {comments.map((c) => (
                  <div key={c.id} className="group flex gap-2.5">
                    <Avatar src={c.author.avatarUrl} className="h-8 w-8" />
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-white">{c.author.displayName ?? c.author.username}</span>{" "}
                      <span className="text-sm text-white/80">{c.body}</span>
                      <div className="flex items-center gap-2 text-xs text-white/30">
                        <span>{timeAgo(c.createdAt)}</span>
                        <button
                          onClick={() => setReportComment(c.id)}
                          className="opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                        >
                          reportar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 p-4">
                <div className="mb-3 flex items-center gap-5 text-white/60">
                  <button onClick={toggleLike} aria-label="Me gusta" className={liked ? "text-purple" : "hover:text-white"}>
                    {liked ? <IconHeartFill className="text-[26px]" /> : <IconHeart className="text-[26px]" />}
                  </button>
                  <button
                    onClick={() => setMComments((v) => !v)}
                    aria-label="Comentar"
                    className="hover:text-white sm:hidden"
                  >
                    <IconComment className="text-[26px]" />
                  </button>
                  <button
                    onClick={() => { navigator.clipboard?.writeText(`${location.origin}/p/${post.id}`).catch(() => {}); }}
                    aria-label="Compartir"
                    className="hover:text-white"
                  >
                    <IconShare className="text-[22px]" />
                  </button>
                  <span className="text-sm text-white/70">{likeCount} me gusta</span>
                </div>
                <div className={`flex items-center gap-2 ${mComments ? "" : "max-sm:hidden"}`}>
                  <Avatar src={viewerAvatarUrl} className="h-8 w-8" />
                  <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); sendComment(); } }}
                    placeholder="Escribe un comentario"
                    className="flex-1 rounded-full border border-white/10 bg-navy px-4 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {reportComment && (
        <ReportModal targetType="comment" targetId={reportComment} onClose={() => setReportComment(null)} />
      )}
    </>
  );
}
