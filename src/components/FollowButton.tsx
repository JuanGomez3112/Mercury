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
      className={`rounded-[1.25rem] px-5 py-2 text-sm font-black transition disabled:opacity-60 ${
        following
          ? "border-2 border-white/20 text-white hover:border-purple hover:text-purple"
          : "bg-purple text-navy hover:brightness-95"
      }`}
    >
      {following ? "Siguiendo" : "Seguir"}
    </button>
  );
}
