"use client";

import { useState } from "react";
import type { PollView } from "@/lib/types";

export default function PollCard({ poll }: { poll: PollView }) {
  const [state, setState] = useState<PollView>(poll);
  const [busy, setBusy] = useState(false);
  const voted = state.myOptionId !== null;

  async function vote(optionId: string) {
    if (busy) return;
    setBusy(true);
    const res = await fetch("/api/polls/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId }),
    });
    setBusy(false);
    if (res.ok) setState(await res.json());
  }

  return (
    <div className="mt-4 space-y-2">
      {state.options.map((o) => {
        const pct = state.totalVotes > 0 ? Math.round((o.votes / state.totalVotes) * 100) : 0;
        const mine = state.myOptionId === o.id;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => vote(o.id)}
            disabled={busy}
            className={`relative w-full overflow-hidden rounded-xl border px-4 py-2.5 text-left text-sm transition ${
              mine ? "border-purple text-white" : "border-white/10 text-white/85 hover:border-white/25"
            }`}
          >
            {voted && (
              <span
                className={`absolute inset-y-0 left-0 ${mine ? "bg-purple/25" : "bg-white/8"}`}
                style={{ width: `${pct}%` }}
              />
            )}
            <span className="relative flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                {mine && <span className="text-purple">✓</span>}
                {o.text}
              </span>
              {voted && <span className="text-white/50">{pct}%</span>}
            </span>
          </button>
        );
      })}
      <p className="text-xs text-white/40">
        {state.totalVotes} {state.totalVotes === 1 ? "voto" : "votos"}
        {!voted && " · toca para votar"}
      </p>
    </div>
  );
}
