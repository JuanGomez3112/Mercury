"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import { IconFire, IconImage, IconCamera, IconMusic, IconTag, IconPin, IconPoll, IconLink } from "./icons";

const MAX_FILES = 10;

/** Pantalla completa de publicación: cómoda, opciones organizadas. No es el composer compacto del feed. */
export default function PublishScreen({
  displayName,
  avatarUrl,
  creatorMode = false,
}: {
  displayName: string;
  avatarUrl?: string | null;
  creatorMode?: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [adult, setAdult] = useState(false);
  const [paid, setPaid] = useState(false);
  const [price, setPrice] = useState<number | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Ubicación (geolocalización real), enlace, encuesta
  const [location, setLocation] = useState("");
  const [locBusy, setLocBusy] = useState(false);
  const [locErr, setLocErr] = useState("");
  const [showLink, setShowLink] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [showPoll, setShowPoll] = useState(false);
  const [pollOpts, setPollOpts] = useState<string[]>(["", ""]);

  function insertMention() {
    setBody((b) => (b.endsWith(" ") || b === "" ? b : b + " ") + "@");
    setTimeout(() => bodyRef.current?.focus(), 0);
  }

  function detectLocation() {
    if (!("geolocation" in navigator)) { setLocErr("Geolocalización no disponible"); return; }
    setLocBusy(true); setLocErr("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const r = await fetch(`/api/geocode/reverse?lat=${latitude}&lng=${longitude}`);
          const d = await r.json();
          setLocation(d.label || `${latitude.toFixed(3)}, ${longitude.toFixed(3)}`);
        } catch {
          setLocation(`${latitude.toFixed(3)}, ${longitude.toFixed(3)}`);
        }
        setLocBusy(false);
      },
      () => { setLocErr("Activa el permiso de ubicación"); setLocBusy(false); },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const previews = files.map((f) => ({ f, url: URL.createObjectURL(f) }));
  const pollValid = showPoll && pollOpts.filter((o) => o.trim()).length >= 2;
  const canPublish = (body.trim() || files.length > 0 || pollValid) && !loading;

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_FILES));
    e.target.value = "";
  }

  async function submit() {
    if (!canPublish) return;
    if (paid && (price === "" || Number(price) < 1)) return setError("Pon un precio válido");
    let link: string | null = null;
    if (showLink && linkUrl.trim()) {
      link = /^https?:\/\//i.test(linkUrl.trim()) ? linkUrl.trim() : `https://${linkUrl.trim()}`;
    }
    const pollPayload = pollValid ? { options: pollOpts.map((o) => o.trim()).filter(Boolean) } : null;
    setLoading(true);
    setError("");
    let images: string[] = [];
    if (files.length > 0) {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      if (paid) fd.append("private", "1");
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      if (!up.ok) { const d = await up.json().catch(() => ({})); setError(d.error ?? "Error al subir"); setLoading(false); return; }
      images = (await up.json()).urls;
    }
    const priceCredits = paid && price !== "" ? Number(price) : null;
    const res = await fetch("/api/posts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body, images, adult, priceCredits,
        location: location.trim() || null,
        linkUrl: link,
        poll: pollPayload,
      }),
    });
    setLoading(false);
    if (res.ok) { router.push("/feed"); router.refresh(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? "Error al publicar"); }
  }

  const optRow = "flex w-full items-center gap-3 rounded-xl border border-white/10 bg-navy-2/40 px-4 py-3.5 text-left text-sm text-white/85 transition hover:bg-navy-2";
  const soon = "flex w-full items-center justify-between gap-3 rounded-xl border border-white/5 bg-navy-2/20 px-4 py-3.5 text-left text-sm text-white/35";

  return (
    <div className="flex min-h-[100dvh] flex-col bg-navy">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-navy/95 px-4 py-3 backdrop-blur">
        <button onClick={() => router.back()} aria-label="Cancelar" className="flex h-9 w-9 items-center justify-center rounded-full text-xl text-white/70 hover:bg-white/10">×</button>
        <span className="text-sm font-semibold text-white">Nueva publicación</span>
        <button onClick={submit} disabled={!canPublish} className="rounded-full bg-gradient-to-tl from-purple to-purple-soft px-5 py-1.5 text-sm font-semibold text-white disabled:opacity-40">
          {loading ? "…" : "Publicar"}
        </button>
      </header>

      {/* Cuerpo */}
      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <div className="flex gap-3">
          <Avatar src={avatarUrl} className="h-11 w-11" />
          <textarea
            ref={bodyRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`${displayName}, ¿qué te gustaría compartir?`}
            maxLength={2000}
            className="min-h-[160px] flex-1 resize-none bg-transparent text-[16px] text-white outline-none placeholder:text-white/40"
            autoFocus
          />
        </div>

        {previews.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {previews.map((p, i) => (
              <div key={p.url} className="relative">
                {p.f.type.startsWith("video/")
                  ? <video src={p.url} className="aspect-square w-full rounded-lg object-cover" muted />
                  /* eslint-disable-next-line @next/next/no-img-element */
                  : <img src={p.url} alt="" className="aspect-square w-full rounded-lg object-cover" />}
                <button onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))} className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-navy text-xs text-white/80 ring-1 ring-white/20" aria-label="Quitar">×</button>
              </div>
            ))}
          </div>
        )}

        {/* Opciones organizadas */}
        <div className="space-y-2">
          <button type="button" onClick={() => fileRef.current?.click()} className={optRow}>
            <IconImage className="h-5 w-5 text-purple" /> Foto | Video
          </button>
          <button type="button" onClick={() => camRef.current?.click()} className={optRow}>
            <IconCamera className="h-5 w-5 text-purple" /> Cámara
          </button>

          <button type="button" onClick={() => { const n = !adult; setAdult(n); if (!n) { setPaid(false); setPrice(""); } }}
            className={`${optRow} ${adult ? "border-orange-500/50 bg-orange-500/10" : ""}`}>
            <IconFire className={`h-5 w-4 ${adult ? "text-orange-400" : "text-white/60"}`} />
            <span className="flex-1">Contenido para adultos (18+)</span>
            <span className={`h-5 w-9 rounded-full p-0.5 transition ${adult ? "bg-orange-500" : "bg-white/15"}`}>
              <span className={`block h-4 w-4 rounded-full bg-white transition ${adult ? "translate-x-4" : ""}`} />
            </span>
          </button>

          {creatorMode && adult && (
            <button type="button" onClick={() => setPaid((v) => !v)}
              className={`${optRow} ${paid ? "border-purple/50 bg-purple/10" : ""}`}>
              <span className="text-lg">💰</span>
              <span className="flex-1">Contenido de pago</span>
              <span className={`h-5 w-9 rounded-full p-0.5 transition ${paid ? "bg-purple" : "bg-white/15"}`}>
                <span className={`block h-4 w-4 rounded-full bg-white transition ${paid ? "translate-x-4" : ""}`} />
              </span>
            </button>
          )}

          {creatorMode && adult && (
            <div className={`overflow-hidden transition-all duration-300 ${paid ? "max-h-16 opacity-100" : "max-h-0 opacity-0"}`}>
              <input type="number" min={1} max={100000} value={price} onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Precio ☾" className="w-full rounded-xl border border-purple/50 bg-purple/10 px-4 py-3 text-sm text-white outline-none placeholder:text-purple/50 focus:border-purple" />
            </div>
          )}

          {/* Etiqueta: inserta @ para mencionar */}
          <button type="button" onClick={insertMention} className={optRow}>
            <IconTag className="h-5 w-5 text-purple" /> Etiquetar persona (@)
          </button>

          {/* Ubicación real (geolocalización del dispositivo) */}
          {location ? (
            <div className={`${optRow} border-purple/50 bg-purple/10`}>
              <IconPin className="h-5 w-5 text-purple" />
              <span className="flex-1">{location}</span>
              <button type="button" onClick={() => setLocation("")} aria-label="Quitar ubicación" className="text-white/40 hover:text-white">×</button>
            </div>
          ) : (
            <button type="button" onClick={detectLocation} disabled={locBusy} className={optRow}>
              <IconPin className="h-5 w-5 text-purple" /> {locBusy ? "Detectando ubicación…" : "Añadir mi ubicación"}
            </button>
          )}
          {locErr && <p className="text-xs text-red-400">{locErr}</p>}

          {/* Enlace */}
          <button type="button" onClick={() => setShowLink((v) => !v)} className={`${optRow} ${showLink ? "border-purple/50 bg-purple/10" : ""}`}>
            <IconLink className="h-5 w-5 text-purple" /> Enlace
          </button>
          {showLink && (
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} inputMode="url" maxLength={500} placeholder="https://…"
              className="w-full rounded-xl border border-white/10 bg-navy px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple" />
          )}

          {/* Encuesta */}
          <button type="button" onClick={() => setShowPoll((v) => !v)} className={`${optRow} ${showPoll ? "border-purple/50 bg-purple/10" : ""}`}>
            <IconPoll className="h-5 w-5 text-purple" /> Encuesta
          </button>
          {showPoll && (
            <div className="space-y-2 rounded-xl border border-white/10 bg-navy/60 p-3">
              {pollOpts.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input value={opt} onChange={(e) => setPollOpts((prev) => prev.map((o, idx) => idx === i ? e.target.value : o))}
                    maxLength={80} placeholder={`Opción ${i + 1}`}
                    className="w-full rounded-lg border border-white/10 bg-navy px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple" />
                  {pollOpts.length > 2 && (
                    <button type="button" onClick={() => setPollOpts((prev) => prev.filter((_, idx) => idx !== i))} className="text-white/40 hover:text-white" aria-label="Quitar opción">×</button>
                  )}
                </div>
              ))}
              {pollOpts.length < 6 && (
                <button type="button" onClick={() => setPollOpts((prev) => [...prev, ""])} className="text-sm text-purple hover:underline">+ Añadir opción</button>
              )}
            </div>
          )}

          {/* Próximamente */}
          <div className={soon}>
            <span className="flex items-center gap-3"><IconMusic className="h-5 w-5" /> Música</span>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px]">pronto</span>
          </div>
        </div>

        {error && <p className="text-center text-sm text-red-400">{error}</p>}
      </div>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple onChange={onPick} className="hidden" />
      <input ref={camRef} type="file" accept="image/*,video/*" capture="environment" onChange={onPick} className="hidden" />
    </div>
  );
}
