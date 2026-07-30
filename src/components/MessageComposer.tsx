"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MessageComposer({ to }: { to: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  async function send() {
    if (!body.trim() || busy) return;
    setBusy(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to, body }),
    });
    setBusy(false);
    if (res.ok) {
      setBody("");
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-3 border-t border-white/10 p-4">
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            send();
          }
        }}
        placeholder="Escribe un mensaje…"
        className="flex-1 rounded-full border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple"
      />
      <button
        onClick={send}
        disabled={busy || !body.trim()}
        className="rounded-full bg-purple px-5 py-2.5 text-sm font-medium text-navy transition hover:brightness-95 disabled:opacity-50"
      >
        Enviar
      </button>
    </div>
  );
}
