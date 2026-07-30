"use client";

import { useEffect, useRef, useState } from "react";
import { timeAgo } from "@/lib/time";
import { IconImage } from "./icons";
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
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [image, setImage] = useState<{ url: string; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastPing = useRef(0);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!f) return;
    const preview = URL.createObjectURL(f);
    setImage({ url: "", preview });
    setUploading(true);
    const fd = new FormData();
    fd.append("files", f);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) {
      const d = await res.json();
      setImage({ url: d.urls[0], preview });
    } else {
      setImage(null);
    }
  }

  function scrollDown() {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }

  async function load() {
    const res = await fetch(`/api/messages/${partner}`, { cache: "no-store" });
    if (res.ok) {
      const d = await res.json();
      setPartnerTyping(!!d.typing);
      setMessages((prev) => (d.messages.length !== prev.length ? d.messages : prev));
    }
  }

  function pingTyping() {
    const now = Date.now();
    if (now - lastPing.current < 2000) return; // throttle
    lastPing.current = now;
    fetch("/api/messages/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: partner }),
    }).catch(() => {});
  }

  // polling tiempo real
  useEffect(() => {
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner]);

  useEffect(() => {
    scrollDown();
  }, [messages.length, partnerTyping]);

  async function send() {
    if ((!body.trim() && !image?.url) || busy || uploading) return;
    setBusy(true);
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: partner, body, imageUrl: image?.url || undefined }),
    });
    setBusy(false);
    if (res.ok) {
      setBody("");
      setImage(null);
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
              <div className={`max-w-[75%] overflow-hidden rounded-2xl text-sm ${m.mine ? "bg-purple text-navy" : "bg-navy text-white"}`}>
                {m.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a href={m.imageUrl} target="_blank" rel="noreferrer">
                    <img src={m.imageUrl} alt="" className="max-h-72 w-full object-cover" />
                  </a>
                )}
                <div className="px-4 py-2">
                  {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                  <span className={`mt-0.5 block text-[10px] ${m.mine ? "text-navy/60" : "text-white/40"}`}>
                    {timeAgo(m.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
        {partnerTyping && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1 rounded-2xl bg-navy px-4 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60 [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60 [animation-delay:-0.1s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/60" />
              <span className="ml-1 text-xs text-white/40">escribiendo…</span>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-white/10 p-4">
        {image && (
          <div className="relative mb-3 w-fit">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.preview} alt="" className={`h-24 rounded-lg object-cover ${uploading ? "opacity-50" : ""}`} />
            {uploading && <span className="absolute inset-0 flex items-center justify-center text-xs text-white">Subiendo…</span>}
            <button
              onClick={() => setImage(null)}
              className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-navy text-xs text-white/80 ring-1 ring-white/20"
              aria-label="Quitar"
            >
              ×
            </button>
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple/20 text-purple transition hover:bg-purple/30"
            aria-label="Adjuntar imagen"
          >
            <IconImage className="h-5 w-5" />
          </button>
          <input
            value={body}
            onChange={(e) => { setBody(e.target.value); pingTyping(); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
            placeholder="Escribe un mensaje…"
            className="flex-1 rounded-full border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple"
          />
          <button
            onClick={send}
            disabled={busy || uploading || (!body.trim() && !image?.url)}
            className="rounded-full bg-purple px-5 py-2.5 text-sm font-medium text-navy transition hover:brightness-95 disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onPick} className="hidden" />
      </div>
    </>
  );
}
