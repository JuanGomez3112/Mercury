"use client";
import { useState, type ReactNode } from "react";

export default function AdminTabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 border-b border-white/10 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              active === t.id ? "bg-gradient-to-tl from-purple to-purple-soft text-white" : "text-white/50 hover:text-white/80"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.id} className={active === t.id ? "block" : "hidden"}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
