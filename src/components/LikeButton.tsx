"use client";

import { useState } from "react";
import { IconHeart, IconFire } from "./icons";
import { HeartGrad } from "./GradientIcons";

export default function LikeButton({
  postId,
  initialLiked,
  variant = "heart",
}: {
  postId: string;
  initialLiked: boolean;
  initialCount?: number;
  variant?: "heart" | "fire";
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setLiked((v) => !v);
    const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      setLiked(d.liked);
    } else {
      setLiked((v) => !v);
    }
    setBusy(false);
  }

  if (variant === "fire") {
    return (
      <button
        onClick={toggle}
        aria-label="Me gusta"
        className={`transition ${liked ? "text-orange-500" : "text-white/60 hover:text-white"}`}
      >
        <IconFire className="text-[28px]" />
      </button>
    );
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
