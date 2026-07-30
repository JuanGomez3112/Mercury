"use client";

import { useState } from "react";
import { IconHeart, IconHeartFill } from "./icons";

export default function LikeButton({
  postId,
  initialLiked,
  initialCount,
}: {
  postId: string;
  initialLiked: boolean;
  initialCount: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    // optimista
    setLiked((v) => !v);
    setCount((c) => c + (liked ? -1 : 1));
    const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      setLiked(d.liked);
      setCount(d.count);
    } else {
      // revierte
      setLiked((v) => !v);
      setCount((c) => c + (liked ? 1 : -1));
    }
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Me gusta"
      className={`flex items-center gap-1.5 text-sm transition ${
        liked ? "text-purple" : "text-white/60 hover:text-white"
      }`}
    >
      {liked ? <IconHeartFill className="h-5 w-5" /> : <IconHeart className="h-5 w-5" />}
      {count > 0 && count}
    </button>
  );
}
