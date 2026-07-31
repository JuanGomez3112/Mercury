"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import SlidePublish from "./SlidePublish";
import ComposerMenu from "./ComposerMenu";
import { IconFire, IconImage, IconLive, IconCamera, IconMusic, IconTag, IconPin, IconPoll, IconLink } from "./icons";

const MAX_FILES = 10;

export default function PostComposer({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ down: false, startX: 0, startScroll: 0, moved: false });
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [adult, setAdult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const previews = files.map((f) => ({ f, url: URL.createObjectURL(f) }));

  // Rueda del mouse (vertical) → scroll horizontal de los tags
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0) {
        el.scrollBy({ left: e.deltaY, behavior: "smooth" });
        e.preventDefault();
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // Click + arrastrar para desplazar los tags
  function dragDown(e: React.PointerEvent) {
    const el = scrollRef.current;
    if (!el) return;
    drag.current = { down: true, startX: e.clientX, startScroll: el.scrollLeft, moved: false };
  }
  function dragMove(e: React.PointerEvent) {
    if (!drag.current.down) return;
    const el = scrollRef.current;
    if (!el) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.startScroll - dx;
  }
  function dragEnd() {
    drag.current.down = false;
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    setFiles((prev) => [...prev, ...picked].slice(0, MAX_FILES));
    if (fileRef.current) fileRef.current.value = "";
  }
  function removeAt(i: number) {
    setFiles((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit() {
    if (!body.trim() && files.length === 0) return;
    setLoading(true);
    setError("");

    let images: string[] = [];
    if (files.length > 0) {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f));
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      if (!up.ok) {
        const d = await up.json().catch(() => ({}));
        setError(d.error ?? "Error al subir imagen");
        setLoading(false);
        return;
      }
      images = (await up.json()).urls;
    }

    const res = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, images, adult }),
    });
    setLoading(false);
    if (res.ok) {
      setBody("");
      setFiles([]);
      setAdult(false);
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Error al publicar");
    }
  }

  const pills = [
    { label: "Foto", icon: <IconImage className="h-4 w-4" />, onClick: () => fileRef.current?.click() },
    { label: "Video", icon: <IconLive className="h-4 w-4" />, onClick: () => videoRef.current?.click() },
    { label: "Video en vivo", icon: <IconLive className="h-4 w-4" /> },
    { label: "Cámara", icon: <IconCamera className="h-4 w-4" /> },
    { label: "Música", icon: <IconMusic className="h-4 w-4" /> },
    { label: "Etiqueta", icon: <IconTag className="h-4 w-4" /> },
    { label: "Ubicación", icon: <IconPin className="h-4 w-4" /> },
    { label: "Encuesta", icon: <IconPoll className="h-4 w-4" /> },
    { label: "Enlace", icon: <IconLink className="h-4 w-4" /> },
  ];

  return (
    <div className="group flex min-h-[200px] flex-col rounded-2xl border border-white/10 bg-navy-2/50 p-8 transition-colors duration-300 hover:border-purple/20 hover:bg-[#211a48]">
      <div className="flex items-start gap-4">
        <Avatar src={avatarUrl} className="h-10 w-10" />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`${displayName}, ¿qué te gustaría compartir?`}
          rows={2}
          maxLength={2000}
          className="min-h-[64px] flex-1 resize-none rounded-2xl border border-white/10 bg-navy px-4 py-3 text-[15px] text-white outline-none transition placeholder:text-white/40 focus:border-purple"
        />
        <SlidePublish
          onPublish={submit}
          loading={loading}
          disabled={!body.trim() && files.length === 0}
        />
      </div>

      {previews.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {previews.map((p, i) => (
            <div key={p.url} className="relative">
              {p.f.type.startsWith("video/") ? (
                <video src={p.url} className="h-20 w-full rounded-lg object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt="" className="h-20 w-full rounded-lg object-cover" />
              )}
              {p.f.type.startsWith("video/") && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-2xl text-white/90">▶</span>
              )}
              <button
                onClick={() => removeAt(i)}
                className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-navy text-xs text-white/80 ring-1 ring-white/20"
                aria-label="Quitar"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Fila de acciones: fuego (fijo izq) · pills scrollables · más (fijo der) */}
      <div className="mt-auto flex items-center gap-4 pt-4">
        <button
          type="button"
          onClick={() => setAdult((v) => !v)}
          aria-pressed={adult}
          title="Marcar como contenido para adultos (18+)"
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
            adult
              ? "bg-orange-500 text-white shadow-[0_0_14px] shadow-orange-500/50"
              : "bg-navy text-white/80 hover:bg-navy/80"
          }`}
        >
          <IconFire className="h-4 w-3.5" />
        </button>

        <div
          ref={scrollRef}
          onPointerDown={dragDown}
          onPointerMove={dragMove}
          onPointerUp={dragEnd}
          onPointerLeave={dragEnd}
          className="no-scrollbar flex min-w-0 flex-1 cursor-grab items-center gap-4 overflow-x-auto select-none active:cursor-grabbing"
        >
          {pills.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                if (drag.current.moved) return; // fue arrastre, no click
                p.onClick?.();
              }}
              className="flex shrink-0 items-center gap-2 rounded-full bg-navy px-4 py-3 text-sm text-white/80 transition hover:bg-navy/80 hover:text-white"
            >
              <span className="text-purple">{p.icon}</span>
              {p.label}
            </button>
          ))}
        </div>

        <ComposerMenu />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={onPick}
        className="hidden"
      />

      <input
        ref={videoRef}
        type="file"
        accept="video/mp4,video/webm"
        multiple
        onChange={onPick}
        className="hidden"
      />

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
