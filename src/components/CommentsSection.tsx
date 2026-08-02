"use client";

import { useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import { IconHeart, IconHeartFill } from "./icons";
import type { FeedPost, CommentDTO } from "@/lib/types";

type Preview = FeedPost["commentPreview"][number];
type Sort = "relevant" | "recent";

function LikeableComment({ c }: { c: CommentDTO }) {
  const [liked, setLiked] = useState(c.likedByMe);
  const [count, setCount] = useState(c.likeCount);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    // optimista
    setLiked((v) => !v);
    setCount((n) => n + (liked ? -1 : 1));
    const res = await fetch(`/api/comments/${c.id}/like`, { method: "POST" });
    if (res.ok) {
      const d = await res.json().catch(() => null);
      if (d) { setLiked(d.liked); setCount(d.count); }
    } else {
      // revertir
      setLiked((v) => !v);
      setCount((n) => n + (liked ? 1 : -1));
    }
    setBusy(false);
  }

  return (
    <div className="flex gap-2.5">
      <Avatar src={c.author.avatarUrl} className="h-8 w-8" />
      <div className="min-w-0 flex-1">
        <Link href={`/u/${c.author.username}`} className="text-sm font-semibold text-white hover:underline">
          {c.author.displayName ?? c.author.username}
        </Link>{" "}
        <span className="break-words text-sm text-white/80">{c.body}</span>
      </div>
      <button onClick={toggle} aria-label="Me gusta" className={`flex shrink-0 items-center gap-1 text-xs ${liked ? "text-purple" : "text-white/40 hover:text-white/70"}`}>
        {liked ? <IconHeartFill className="h-4 w-4" /> : <IconHeart className="h-4 w-4" />}
        {count > 0 && count}
      </button>
    </div>
  );
}

function PreviewRow({ c }: { c: Preview }) {
  return (
    <div className="flex gap-2.5">
      <Avatar src={c.avatarUrl} className="h-7 w-7" />
      <div className="min-w-0">
        <Link href={`/u/${c.username}`} className="text-sm font-semibold text-white hover:underline">
          {c.displayName ?? c.username}
        </Link>{" "}
        <span className="break-words text-sm text-white/80">{c.body}</span>
      </div>
    </div>
  );
}

export default function CommentsSection({
  postId,
  commentCount,
  preview,
}: {
  postId: string;
  commentCount: number;
  preview: Preview[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [sort, setSort] = useState<Sort>("relevant");
  const [comments, setComments] = useState<CommentDTO[] | null>(null);
  const [loading, setLoading] = useState(false);

  async function load(s: Sort) {
    setLoading(true);
    const res = await fetch(`/api/posts/${postId}/comments?sort=${s}`);
    const d = await res.json().catch(() => ({}));
    setComments(d.comments ?? []);
    setLoading(false);
  }

  async function expand() {
    setExpanded(true);
    if (!comments) await load(sort);
  }

  function changeSort(s: Sort) {
    if (s === sort) return;
    setSort(s);
    load(s);
  }

  if (commentCount === 0) return null;

  const tab = (s: Sort, label: string) => (
    <button
      onClick={() => changeSort(s)}
      className={sort === s ? "font-semibold text-purple" : "text-white/40 hover:text-white/70"}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-3 space-y-2">
      {!expanded ? (
        <>
          {preview.map((c) => <PreviewRow key={c.id} c={c} />)}
          {commentCount > preview.length && (
            <button onClick={expand} className="text-sm text-white/40 transition hover:text-white/70">
              Ver los {commentCount} comentarios
            </button>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center gap-2 text-xs">
            {tab("relevant", "Más relevantes")}
            <span className="text-white/20">·</span>
            {tab("recent", "Más recientes")}
          </div>
          {loading && !comments ? (
            <p className="text-sm text-white/40">Cargando…</p>
          ) : (
            comments?.map((c) => <LikeableComment key={c.id} c={c} />)
          )}
          <button onClick={() => setExpanded(false)} className="text-sm text-white/40 transition hover:text-white/70">
            Ocultar comentarios
          </button>
        </>
      )}
    </div>
  );
}
