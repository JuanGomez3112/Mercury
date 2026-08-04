"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AvatarUploader from "./AvatarUploader";

export default function ProfileEditForm({
  displayName,
  bio,
  avatarUrl,
}: {
  displayName: string;
  bio: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(displayName);
  const [about, setAbout] = useState(bio);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/me/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName: name.trim(), bio: about.trim() }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg({ ok: true, text: "Perfil actualizado" });
      router.refresh();
    } else {
      setMsg({ ok: false, text: d.error ?? "Error" });
    }
  }

  const input = "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple";

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-sm font-semibold text-white/70">Perfil</h2>

      <div className="flex items-center gap-4">
        <AvatarUploader src={avatarUrl} className="h-20 w-20 ring-2 ring-purple/40" />
        <p className="text-xs text-white/40">Toca la cámara para cambiar tu foto de perfil.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-white/50">Nombre</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" maxLength={50} className={input} />
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-white/50">Biografía</label>
        <textarea value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Cuéntanos sobre ti" maxLength={300} rows={3} className={`${input} resize-none`} />
      </div>

      <button type="submit" disabled={busy} className="rounded-xl bg-gradient-to-tl from-purple to-purple-soft px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "Guardando…" : "Guardar"}
      </button>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
    </form>
  );
}
