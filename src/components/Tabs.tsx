"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconPlus, IconHeart, IconFire } from "./icons";
import type { FeedTab } from "@/lib/queries";

const tabs: { key: FeedTab; label: string; icon: typeof IconPlus }[] = [
  { key: "explora", label: "Explora", icon: IconPlus },
  { key: "feed", label: "Feed", icon: IconHeart },
  { key: "tabu", label: "Tabú", icon: IconFire },
];

export default function Tabs({ active }: { active: FeedTab }) {
  const router = useRouter();
  const [pending, setPending] = useState<FeedTab | null>(null);
  const current = pending ?? active;

  function go(key: FeedTab) {
    if (key === current) return;
    setPending(key); // highlight instantáneo
    router.push(`/feed?tab=${key}`);
  }

  return (
    <div className="flex">
      {tabs.map(({ key, label, icon: Icon }) => {
        const on = key === current;
        const onColor = key === "tabu" ? "border-orange-500 text-orange-400" : "border-purple text-purple";
        return (
          <button
            key={key}
            onClick={() => go(key)}
            className={`flex flex-1 items-center justify-center gap-2 border-b-2 pb-3 text-sm font-medium transition ${
              on ? onColor : "border-transparent text-white/40 hover:text-white/70"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </div>
  );
}
