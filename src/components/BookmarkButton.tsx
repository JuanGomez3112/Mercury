"use client";

import { useState } from "react";
import { IconBookmark } from "./icons";

export default function BookmarkButton({ postId, initialSaved }: { postId: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setSaved((v) => !v);
    const res = await fetch(`/api/posts/${postId}/bookmark`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      const d = await res.json();
      setSaved(d.saved);
    } else {
      setSaved((v) => !v);
    }
  }

  return (
    <button
      onClick={toggle}
      className={`ml-auto transition ${saved ? "text-purple" : "hover:text-white"}`}
      aria-label={saved ? "Quitar de guardados" : "Guardar"}
      aria-pressed={saved}
    >
      <IconBookmark className="text-[28px]" />
    </button>
  );
}
