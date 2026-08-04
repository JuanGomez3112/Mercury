"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/AuthShell";

export default function ResetTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    setError("");
    if (password.length < 8) return setError("Mínimo 8 caracteres");
    if (password !== confirm) return setError("Las contraseñas no coinciden");
    setBusy(true);
    const res = await fetch("/api/auth/reset/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setBusy(false);
    if (res.ok) { setDone(true); setTimeout(() => router.push("/login"), 1500); }
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? "Error"); }
  }

  const input = "w-full rounded-lg border border-white/10 bg-navy px-3.5 py-2.5 text-white outline-none transition placeholder:text-white/30 focus:border-purple";
  const label = "mb-1.5 block text-sm text-purple-soft";

  return (
    <AuthShell titulo="Nueva contraseña" alt={{ texto: "¿Cambiaste de opinión?", href: "/login", label: "Iniciar sesión" }}>
      {done ? (
        <p className="text-center text-sm text-white/70">Contraseña actualizada. Redirigiendo…</p>
      ) : (
        <>
          <label className="mb-4 block"><span className={label}>Nueva contraseña</span>
            <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" /></label>
          <label className="mb-4 block"><span className={label}>Confirmar contraseña</span>
            <input className={input} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repite la contraseña" /></label>
          {error && <p className="mb-4 text-sm text-red-400">{error}</p>}
          <button onClick={submit} disabled={busy} className="w-full rounded-lg bg-purple py-2.5 font-medium text-navy transition hover:opacity-90 disabled:opacity-60">
            {busy ? "Guardando…" : "Establecer contraseña"}
          </button>
        </>
      )}
    </AuthShell>
  );
}
