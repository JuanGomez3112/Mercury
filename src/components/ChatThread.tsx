"use client";

import { useEffect, useRef, useState } from "react";
import { timeAgo } from "@/lib/time";
import { IconImage } from "./icons";
import type { ThreadMessage } from "@/lib/queries";
import UnlockButton from "./UnlockButton";
import ReportModal from "./ReportModal";

export default function ChatThread({
  partner,
  initial,
  creatorMode = false,
}: {
  partner: string;
  initial: ThreadMessage[];
  creatorMode?: boolean;
}) {
  const [messages, setMessages] = useState<ThreadMessage[]>(initial);
  const [syncedInitial, setSyncedInitial] = useState(initial);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [image, setImage] = useState<{ url: string; preview: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [paid, setPaid] = useState(false);
  const [price, setPrice] = useState<number | "">("");
  const [error, setError] = useState("");
  const [reportMsg, setReportMsg] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastPing = useRef(0);

  // Re-sincroniza con lo que envíe el servidor (p.ej. tras router.refresh() de UnlockButton
  // al desbloquear un mensaje de pago) sin depender de un efecto: se ajusta durante el render,
  // como recomienda React para "adjusting state when a prop changes".
  if (initial !== syncedInitial) {
    setSyncedInitial(initial);
    setMessages(initial);
  }

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!f) return;
    const preview = URL.createObjectURL(f);
    setImage({ url: "", preview });
    setUploading(true);
    const fd = new FormData();
    fd.append("files", f);
    if (creatorMode && paid) fd.append("private", "1");
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
      setMessages(d.messages);
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
    if (creatorMode && paid && (price === "" || Number(price) < 1)) {
      setError("Pon un precio para el contenido de pago");
      return;
    }
    setBusy(true);
    setError("");
    const priceCredits = creatorMode && paid && price !== "" ? Number(price) : null;
    const res = await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: partner, body, imageUrl: image?.url || undefined, priceCredits }),
    });
    setBusy(false);
    if (res.ok) {
      setBody("");
      setImage(null);
      setPaid(false);
      setPrice("");
      await load();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Error al enviar");
    }
  }

  // "Visto": id del último mensaje mío que el interlocutor ya leyó.
  const lastReadMineId = [...messages].reverse().find((m) => m.mine && m.readAt)?.id ?? null;

  return (
    <>
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-white/40">No hay mensajes. Escribe el primero.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id}>
            <div className={`group flex items-center gap-2 ${m.mine ? "justify-end" : "justify-start"}`}>
              {m.locked ? (
                <div className="flex max-w-[75%] flex-col items-center gap-2 rounded-2xl border border-purple/20 bg-navy px-4 py-4 text-sm text-white">
                  <span className="text-2xl">🔒</span>
                  <p className="text-white/60">Contenido de pago</p>
                  <UnlockButton kind="message" id={m.id} price={m.priceCredits ?? 0} />
                </div>
              ) : (
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
              )}
              {!m.mine && !m.locked && (
                <button
                  onClick={() => setReportMsg(m.id)}
                  title="Reportar mensaje"
                  className="shrink-0 text-[10px] text-white/25 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                >
                  reportar
                </button>
              )}
            </div>
            {m.id === lastReadMineId && (
              <div className="mt-0.5 pr-1 text-right text-[10px] text-white/35">Visto ✓✓</div>
            )}
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
        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple/20 text-purple transition hover:bg-purple/30"
            aria-label="Adjuntar imagen"
          >
            <IconImage className="h-5 w-5" />
          </button>
          {creatorMode && (
            <button
              type="button"
              onClick={() => setPaid((v) => !v)}
              aria-pressed={paid}
              title="Marcar como contenido de pago"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base transition ${
                paid ? "bg-purple text-white shadow-[0_0_14px] shadow-purple/50" : "bg-navy text-white/80 hover:bg-navy/80"
              }`}
            >
              💰
            </button>
          )}
          {creatorMode && paid && (
            <input
              type="number"
              min={1}
              max={100000}
              value={price}
              onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="Precio ☾"
              className="w-20 shrink-0 rounded-full border border-white/10 bg-navy px-3 py-2 text-sm text-white outline-none placeholder:text-white/40 focus:border-purple"
            />
          )}
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

      {reportMsg && <ReportModal targetType="message" targetId={reportMsg} onClose={() => setReportMsg(null)} />}
    </>
  );
}
