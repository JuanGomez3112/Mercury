"use client";

import { useState } from "react";
import { IconHeart } from "./icons";
import { HeartGrad } from "./GradientIcons";

export default function LikeButton({
  postId,
  initialLiked,
}: {
  postId: string;
  initialLiked: boolean;
  initialCount?: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setLiked((v) => !v); // optimista
    const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      setLiked(d.liked);
    } else {
      setLiked((v) => !v); // revierte
    }
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      aria-label="Me gusta"
      className={`transition ${liked ? "" : "text-white/60 hover:text-white"}`}
    >
      {liked ? <HeartGrad className="h-7 w-7" /> : <IconHeart className="text-[28px]" />}
    </button>
  );
}
