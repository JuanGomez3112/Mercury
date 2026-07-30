"use client";

import { useEffect, useRef, useState } from "react";
import { timeAgo } from "@/lib/time";
import type { ThreadMessage } from "@/lib/queries";

export default function ChatThread({
  partner,
  initial,
}: {
  partner: string;
  initial: ThreadMessage[];
}) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initial);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  function scrollDown() {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function load() {
    const res = await fetch(`/api/messages/${partner}`, { cache: "no-store" });
    if (res.ok) {
      const d = await res.json();
      setMessages((prev) => {
        if (d.messages.length !== prev.length) return d.messages;
        return prev;
      });
    }
  }

  // polling tiempo real
  useEffect(() => {
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner]);

  useEffect(() => {
    scrollDown();
  }, [messages.length]);

  async function send() {
    if (!body.trim() || busy) return;
    setBusy(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: partner, body }),
    });
    setBusy(false);
    if (res.ok) {
      setBody("");
      await load();
    }
  }

  return (
    <>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-white/40">No hay mensajes. Escribe el primero.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${m.mine ? "bg-purple text-navy" : "bg-navy text-white"}`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <span className={`mt-0.5 block text-[10px] ${m.mine ? "text-navy/60" : "text-white/40"}`}>
                  {timeAgo(m.createdAt)}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="flex items-center gap-3 border-t border-white/10 p-4">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
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
    </>
  );
}
