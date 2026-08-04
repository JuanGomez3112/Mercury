"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconCamera } from "./icons";

/** Portada del perfil. Muestra la imagen (o degradado) y, si editable, permite cambiarla. */
export default function CoverUploader({
  src,
  editable = false,
}: {
  src?: string | null;
  editable?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const current = preview ?? src;

  async function pick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("files", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const ud = await up.json().catch(() => ({}));
      if (!up.ok || !ud.urls?.[0]) throw new Error();
      const res = await fetch("/api/me/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coverUrl: ud.urls[0] }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative h-40 w-full overflow-hidden bg-gradient-to-tr from-purple/30 via-navy-2 to-purple-soft/20 sm:h-52 sm:rounded-2xl">
      {current && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={current} alt="" className="h-full w-full object-cover" />
      )}
      {editable && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="absolute bottom-3 right-3 z-10 flex items-center gap-2 rounded-full bg-navy/70 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur transition hover:bg-navy disabled:opacity-60"
          >
            <IconCamera className="text-[13px]" />
            {busy ? "Subiendo…" : "Portada"}
          </button>
          <input ref={inputRef} type="file" accept="image/*" hidden onChange={pick} />
        </>
      )}
    </div>
  );
}
