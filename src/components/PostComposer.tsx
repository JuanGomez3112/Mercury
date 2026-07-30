"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

const MAX_FILES = 4;

export default function PostComposer() {
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

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-4">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="¿Qué estás pensando?"
        maxLength={2000}
        rows={3}
        className="w-full resize-none rounded-lg border border-white/10 bg-navy px-3.5 py-2.5 text-white outline-none transition placeholder:text-white/30 focus:border-purple"
      />

      {previews.length > 0 && (
        <div className="mt-2 grid grid-cols-4 gap-2">
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

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            disabled={files.length >= MAX_FILES}
            className="text-sm text-purple transition hover:opacity-80 disabled:opacity-40"
          >
            + Imagen
          </button>
          <span className="text-xs text-white/30">{body.length}/2000</span>
        </div>
        <button
          onClick={submit}
          disabled={loading || (!body.trim() && files.length === 0)}
          className="rounded-lg bg-purple px-5 py-2 text-sm font-medium text-navy transition hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Publicando…" : "Publicar"}
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
