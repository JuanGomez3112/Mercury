"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import { IconImage } from "./icons";

/* eslint-disable @next/next/no-img-element */
export default function GroupComposer({ groupId, pageId, avatarUrl, placeholder = "Escribe algo en el grupo…" }: { groupId?: string; pageId?: string; avatarUrl?: string | null; placeholder?: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);

  const previews = files.map((f) => URL.createObjectURL(f));
  const can = (body.trim() || files.length > 0) && !busy;

  async function submit() {
    if (!can) return;
    setBusy(true);
    try {
      let images: string[] = [];
      if (files.length > 0) {
        const fd = new FormData();
        files.forEach((f) => fd.append("files", f));
        const up = await fetch("/api/upload", { method: "POST", body: fd });
        const ud = await up.json().catch(() => ({}));
        if (!up.ok) throw new Error();
        images = ud.urls;
      }
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, images, groupId, pageId }),
      });
      if (!res.ok) throw new Error();
      setBody(""); setFiles([]);
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-4 max-sm:rounded-none max-sm:border-x-0">
      <div className="flex gap-3">
        <Avatar src={avatarUrl} className="h-10 w-10" />
        <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={placeholder} maxLength={2000} rows={2} className="flex-1 resize-none bg-transparent text-sm text-white outline-none placeholder:text-white/40" />
      </div>
      {previews.length > 0 && (
        <div className="mt-2 grid grid-cols-3 gap-2">
          {previews.map((u, i) => (
            <div key={u} className="relative">
              <img src={u} alt="" className="aspect-square w-full rounded-lg object-cover" />
              <button onClick={() => setFiles((p) => p.filter((_, idx) => idx !== i))} className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-navy text-xs text-white/80 ring-1 ring-white/20">×</button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between">
        <button onClick={() => fileRef.current?.click()} className="flex items-center gap-2 text-sm text-white/60 hover:text-white" aria-label="Añadir foto">
          <IconImage className="h-5 w-5 text-purple" /> Foto
        </button>
        <button onClick={submit} disabled={!can} className="rounded-full bg-gradient-to-tl from-purple to-purple-soft px-5 py-1.5 text-sm font-semibold text-white disabled:opacity-40">{busy ? "…" : "Publicar"}</button>
      </div>
      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" multiple hidden onChange={(e) => { setFiles((p) => [...p, ...Array.from(e.target.files ?? [])].slice(0, 6)); e.target.value = ""; }} />
    </div>
  );
}
