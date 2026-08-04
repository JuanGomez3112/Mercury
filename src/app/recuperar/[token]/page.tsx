"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import MercuryMark from "@/components/MercuryMark";

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

  const input = "w-full rounded-full border border-navy/20 bg-white/70 px-4 py-2.5 text-sm text-navy outline-none placeholder:text-navy/40 focus:border-navy";

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-soft via-purple to-purple p-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center text-navy"><MercuryMark className="h-20 w-12" /></div>
        {done ? (
          <p className="text-lg font-bold text-navy">Contraseña actualizada. Redirigiendo…</p>
        ) : (
          <>
            <p className="mb-8 text-lg font-bold text-navy">Establece tu nueva contraseña</p>
            <div className="space-y-3 text-left">
              <label className="block"><span className="mb-1 block text-sm font-medium text-navy/80">Nueva contraseña</span>
                <input className={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" /></label>
              <label className="block"><span className="mb-1 block text-sm font-medium text-navy/80">Confirmar contraseña</span>
                <input className={input} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••" /></label>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <button onClick={submit} disabled={busy} className="mt-6 rounded-full bg-navy px-10 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {busy ? "Guardando…" : "Establecer contraseña"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
