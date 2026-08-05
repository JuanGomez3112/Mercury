"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PageFollowButton({ slug, initialFollowing, isOwner }: { slug: string; initialFollowing: boolean; isOwner: boolean }) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  if (isOwner) {
    return <span className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/60">Tu página</span>;
  }

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/pages/${slug}/follow`, { method: "POST" });
    setBusy(false);
    if (res.ok) { const d = await res.json(); setFollowing(d.following); router.refresh(); }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-full px-5 py-2 text-sm font-semibold transition disabled:opacity-50 ${
        following ? "border-2 border-white/20 text-white hover:border-red-400 hover:text-red-400" : "bg-gradient-to-tl from-purple to-purple-soft text-white"
      }`}
    >
      {following ? "Siguiendo" : "Seguir"}
    </button>
  );
}
