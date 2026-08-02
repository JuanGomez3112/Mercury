"use client";

import { useEffect, useState } from "react";
import Tabs from "./Tabs";
import PostCard from "./PostCard";
import TabuGate from "./TabuGate";
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
  tabuUnlocked,
  hasPin,
}: {
  initialTab: FeedTab;
  initialPosts: FeedPost[];
  viewerAvatarUrl?: string | null;
  tabuUnlocked: boolean;
  hasPin: boolean;
}) {
  const [tab, setTab] = useState<FeedTab>(initialTab);
  const [posts, setPosts] = useState<FeedPost[]>(initialPosts);
  const [loading, setLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(tabuUnlocked);
  const [showGate, setShowGate] = useState(false);

  // Re-bloquear Tabú al ir a segundo plano (vuelve a pedir clave al volver).
  useEffect(() => {
    function onVis() {
      if (document.hidden) {
        setUnlocked(false);
        navigator.sendBeacon?.("/api/me/tabu/lock") ||
          fetch("/api/me/tabu/lock", { method: "POST", keepalive: true });
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Estando en Tabú sin desbloquear (entrada directa o re-bloqueo), pedir clave.
  useEffect(() => {
    if (tab === "tabu" && !unlocked) setShowGate(true);
  }, [tab, unlocked]);

  async function load(next: FeedTab) {
    setLoading(true);
    try {
      const res = await fetch(`/api/feed?tab=${next}`, { cache: "no-store" });
      if (res.ok) setPosts((await res.json()).posts);
      window.history.replaceState(null, "", `/feed?tab=${next}`);
    } finally {
      setLoading(false);
    }
  }

  function select(next: FeedTab) {
    if (next === tab) return;
    setTab(next); // highlight instantáneo
    if (next === "tabu" && !unlocked) return; // el efecto abre el gate; no carga aún
    load(next);
  }

  function onUnlocked() {
    setUnlocked(true);
    setShowGate(false);
    load("tabu");
  }

  function closeGate() {
    setShowGate(false);
    setTab("explora");
    load("explora");
  }

  const gated = tab === "tabu" && !unlocked;

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-2/30 p-8 max-sm:rounded-none max-sm:border-0 max-sm:bg-transparent max-sm:p-0">
      <div className="max-sm:px-4">
        <Tabs active={tab} onSelect={select} />
      </div>
      <div className="mt-8 space-y-8 max-sm:mt-3 max-sm:space-y-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-purple border-t-transparent" />
          </div>
        ) : gated ? (
          <div className="rounded-2xl border border-dashed border-orange-500/20 p-10 text-center text-sm text-white/40">
            Contenido Tabú bloqueado. Introduce tu clave para verlo.
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-sm text-white/50">
            {empty[tab]}
          </div>
        ) : (
          posts.map((p) => <PostCard key={p.id} post={p} viewerAvatarUrl={viewerAvatarUrl} fireLike={tab === "tabu"} />)
        )}
      </div>

      {showGate && <TabuGate hasPin={hasPin} onUnlocked={onUnlocked} onClose={closeGate} />}
    </div>
  );
}
