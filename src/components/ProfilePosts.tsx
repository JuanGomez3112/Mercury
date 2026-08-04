"use client";

import { useState } from "react";
import PostCard from "./PostCard";
import type { FeedPost } from "@/lib/types";

/** Posts del perfil separados: normales vs Tabú (adulto). No se mezclan. */
export default function ProfilePosts({
  posts,
  viewerAvatarUrl,
}: {
  posts: FeedPost[];
  viewerAvatarUrl?: string | null;
}) {
  const [tab, setTab] = useState<"normal" | "tabu">("normal");
  const normal = posts.filter((p) => !p.isAdult);
  const tabu = posts.filter((p) => p.isAdult);
  const list = tab === "normal" ? normal : tabu;

  const btn = (id: "normal" | "tabu", label: string, n: number) => (
    <button
      onClick={() => setTab(id)}
      className={`border-b-2 pb-2 text-sm font-semibold transition ${
        tab === id ? "border-purple text-white" : "border-transparent text-white/40 hover:text-white/70"
      }`}
    >
      {label} <span className="text-white/40">{n}</span>
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex gap-6 border-b border-white/10 max-sm:px-4">
        {btn("normal", "Publicaciones", normal.length)}
        {btn("tabu", "Tabú", tabu.length)}
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/50 max-sm:mx-4">
          {tab === "normal" ? "Sin publicaciones todavía." : "Sin contenido Tabú."}
        </div>
      ) : (
        list.map((p) => <PostCard key={p.id} post={p} viewerAvatarUrl={viewerAvatarUrl} fireLike={tab === "tabu"} />)
      )}
    </div>
  );
}
