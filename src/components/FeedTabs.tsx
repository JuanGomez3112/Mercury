"use client";

import { useState } from "react";
import Tabs from "./Tabs";
import PostCard from "./PostCard";
import type { FeedPost } from "@/lib/types";
import type { FeedTab } from "@/lib/queries";

const empty: Record<FeedTab, string> = {
  feed: "Aún no hay nada en tu feed. Sigue a personas o publica algo.",
  explora: "No hay contenido nuevo para explorar por ahora.",
  tabu: "Sin contenido para adultos todavía.",
};

export default function FeedTabs({
  initialTab,
  initialPosts,
  viewerAvatarUrl,
}: {
  initialTab: FeedTab;
  initialPosts: FeedPost[];
  viewerAvatarUrl?: string | null;
}) {
  const [tab, setTab] = useState<FeedTab>(initialTab);
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [loading, setLoading] = useState(false);

  async function select(next: FeedTab) {
    if (next === tab) return;
    setTab(next); // highlight instantáneo
    setLoading(true);
    try {
      const res = await fetch(`/api/feed?tab=${next}`, { cache: "no-store" });
      if (res.ok) setPosts((await res.json()).posts);
      // refleja el tab en la URL sin recargar
      window.history.replaceState(null, "", `/feed?tab=${next}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-2/30 p-8">
      <Tabs active={tab} onSelect={select} />
      <div className="mt-8 space-y-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-purple border-t-transparent" />
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-white/50">
            {empty[tab]}
          </div>
        ) : (
          posts.map((p) => <PostCard key={p.id} post={p} viewerAvatarUrl={viewerAvatarUrl} fireLike={tab === "tabu"} />)
        )}
      </div>
    </div>
  );
}
