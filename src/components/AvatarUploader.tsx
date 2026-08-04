"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import { IconCamera } from "./icons";

/** Avatar con botón de cámara para cambiar la foto de perfil. */
export default function AvatarUploader({
  src,
  className = "h-24 w-24 ring-2 ring-purple/40",
}: {
  src?: string | null;
  className?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

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
        body: JSON.stringify({ avatarUrl: ud.urls[0] }),
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
    <div className="relative shrink-0">
      <Avatar src={preview ?? src} className={className} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label="Cambiar foto de perfil"
        className="absolute -bottom-1 -right-1 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tl from-purple to-purple-soft text-white ring-2 ring-navy-2 transition hover:brightness-110 disabled:opacity-60"
      >
        <IconCamera className="text-[14px]" />
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={pick} />
    </div>
  );
}
