"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconImage } from "./icons";

export default function MessageComposer({ to, creatorMode = false }: { to: string; creatorMode?: boolean }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [paid, setPaid] = useState(false);
  const [price, setPrice] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = "";
    if (!f) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("files", f);
    if (creatorMode && paid) fd.append("private", "1");
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    setUploading(false);
    if (res.ok) {
      const d = await res.json();
      setImageUrl(d.urls[0]);
    }
  }

  async function send() {
    if ((!body.trim() && !imageUrl) || busy || uploading) return;
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
      body: JSON.stringify({ to, body, imageUrl: imageUrl || undefined, priceCredits }),
    });
    setBusy(false);
    if (res.ok) {
      setBody("");
      setImageUrl("");
      setPaid(false);
      setPrice("");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Error al enviar");
    }
  }

  return (
    <div className="border-t border-white/10 p-4">
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
          disabled={busy || uploading || (!body.trim() && !imageUrl)}
          className="rounded-full bg-purple px-5 py-2.5 text-sm font-medium text-navy transition hover:brightness-95 disabled:opacity-50"
        >
          Enviar
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onPick} className="hidden" />
    </div>
  );
}
