"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import MercuryMark from "./MercuryMark";
import { IconImage, IconMusic, IconTag, IconPin, IconPoll, IconLink, IconMore } from "./icons";

const MAX_FILES = 4;

export default function PostComposer({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const previews = files.map((f) => ({ f, url: URL.createObjectURL(f) }));

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
      body: JSON.stringify({ body, images }),
    });
    setLoading(false);
    if (res.ok) {
      setBody("");
      setFiles([]);
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Error al publicar");
    }
  }

  const pills = [
    { label: "Música", icon: <IconMusic className="h-4 w-4" /> },
    { label: "Etiquetas", icon: <IconTag className="h-4 w-4" /> },
    { label: "Ubicación", icon: <IconPin className="h-4 w-4" /> },
    { label: "Encuesta", icon: <IconPoll className="h-4 w-4" /> },
    { label: "Enlace", icon: <IconLink className="h-4 w-4" /> },
  ];

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-4">
      <div className="flex items-center gap-3">
        <Avatar src={avatarUrl} className="h-10 w-10" />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={`${displayName}, ¿qué te gustaría compartir?`}
          rows={1}
          maxLength={2000}
          className="min-h-[46px] flex-1 resize-none rounded-2xl border border-white/10 bg-navy px-4 py-3 text-white outline-none transition placeholder:text-white/40 focus:border-purple"
        />
        <button
          onClick={submit}
          disabled={loading || (!body.trim() && files.length === 0)}
          aria-label="Publicar"
          className="flex h-14 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple text-navy transition hover:brightness-95 disabled:opacity-50"
        >
          <MercuryMark navy className="h-6 w-3" />
        </button>
      </div>

      {previews.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {previews.map((p, i) => (
            <div key={p.url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="h-20 w-full rounded-lg object-cover" />
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

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={files.length >= MAX_FILES}
          className="flex items-center gap-2 rounded-full bg-purple/20 px-4 py-2 text-sm font-medium text-purple transition hover:bg-purple/30 disabled:opacity-40"
        >
          <IconImage className="h-4 w-4" />
          Foto
        </button>
        {pills.map((p) => (
          <button
            key={p.label}
            type="button"
            className="flex items-center gap-2 rounded-full bg-navy px-4 py-2 text-sm text-white/80 transition hover:text-white"
          >
            <span className="text-purple">{p.icon}</span>
            {p.label}
          </button>
        ))}
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-navy text-white/70 transition hover:text-white"
          aria-label="Más"
        >
          <IconMore className="h-4 w-4" />
        </button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={onPick}
        className="hidden"
      />

      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
