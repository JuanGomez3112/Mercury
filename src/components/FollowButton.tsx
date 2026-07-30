"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function FollowButton({
  username,
  initialFollowing,
}: {
  username: string;
  initialFollowing: boolean;
}) {
  const router = useRouter();
  const [following, setFollowing] = useState(initialFollowing);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/follow/${username}`, { method: "POST" });
    if (res.ok) {
      const d = await res.json();
      setFollowing(d.following);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${
        following
          ? "border border-white/15 text-white hover:bg-white/5"
          : "bg-purple text-navy hover:opacity-90"
      }`}
    >
      {following ? "Siguiendo" : "Seguir"}
    </button>
  );
}
