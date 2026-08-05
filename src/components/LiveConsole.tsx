"use client";

import { useState } from "react";
import LivePublisher from "./LivePublisher";

export default function LiveConsole({ username, streamKey, initialTitle, rtmpUrl }: { username: string; streamKey: string; initialTitle: string; rtmpUrl: string }) {
  const [title, setTitle] = useState(initialTitle);
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"movil" | "obs">("movil");

  async function saveTitle() {
    await fetch("/api/live/setup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title.trim() }) });
    setSaved(true); setTimeout(() => setSaved(false), 1500);
  }

  const obsKey = `${username}?user=${username}&pass=${streamKey}`;
  const copy = (t: string) => navigator.clipboard?.writeText(t);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-4 max-sm:rounded-none max-sm:border-x-0">
        <label className="text-xs font-medium text-white/50">Título de la transmisión</label>
        <div className="mt-1 flex gap-2">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="¿De qué vas a hablar?" className="flex-1 rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple" />
          <button onClick={saveTitle} className="rounded-xl bg-gradient-to-tl from-purple to-purple-soft px-4 py-2.5 text-sm font-semibold text-white">{saved ? "✓" : "Guardar"}</button>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTab("movil")} className={`flex-1 rounded-xl border-2 py-2 text-sm font-medium ${tab === "movil" ? "border-purple bg-purple/15 text-white" : "border-white/10 text-white/60"}`}>Desde el móvil</button>
        <button onClick={() => setTab("obs")} className={`flex-1 rounded-xl border-2 py-2 text-sm font-medium ${tab === "obs" ? "border-purple bg-purple/15 text-white" : "border-white/10 text-white/60"}`}>OBS / cámara</button>
      </div>

      {tab === "movil" ? (
        <LivePublisher username={username} streamKey={streamKey} />
      ) : (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-navy-2/50 p-4 max-sm:rounded-none max-sm:border-x-0">
          <p className="text-sm text-white/60">En OBS → Ajustes → Emisión → Servicio "Personalizado":</p>
          <div>
            <p className="text-xs text-white/40">Servidor</p>
            <div className="flex gap-2"><code className="flex-1 truncate rounded-lg bg-navy px-3 py-2 text-sm text-white">{rtmpUrl}</code><button onClick={() => copy(rtmpUrl)} className="rounded-lg border border-white/15 px-3 text-xs text-white/70">Copiar</button></div>
          </div>
          <div>
            <p className="text-xs text-white/40">Clave de transmisión (secreta — no la compartas)</p>
            <div className="flex gap-2"><code className="flex-1 truncate rounded-lg bg-navy px-3 py-2 text-sm text-white">{obsKey}</code><button onClick={() => copy(obsKey)} className="rounded-lg border border-white/15 px-3 text-xs text-white/70">Copiar</button></div>
          </div>
          <p className="text-xs text-white/40">Al iniciar la emisión en OBS aparecerás en vivo automáticamente.</p>
        </div>
      )}
    </div>
  );
}
