"use client";

import { useState } from "react";
import AuthShell from "@/components/AuthShell";

export default function RecuperarPage() {
  const [identifier, setIdentifier] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit() {
    if (busy) return;
    setBusy(true);
    await fetch("/api/auth/reset/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: identifier.trim() }),
    });
    setBusy(false);
    setSent(true);
  }

  const input = "w-full rounded-lg border border-white/10 bg-navy px-3.5 py-2.5 text-white outline-none transition placeholder:text-white/30 focus:border-purple";

  return (
    <AuthShell titulo="Recuperar contraseña" alt={{ texto: "¿La recordaste?", href: "/login", label: "Iniciar sesión" }}>
      {sent ? (
        <p className="text-center text-sm text-white/70">
          Si la cuenta existe, te enviamos un correo con las instrucciones. Revisa tu bandeja (y spam).
        </p>
      ) : (
        <>
          <p className="mb-5 text-sm text-white/60">
            Escribe tu usuario o correo y te enviaremos un enlace para establecer una nueva contraseña.
          </p>
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm text-purple-soft">Usuario o correo</span>
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") submit(); }} className={input} placeholder="usuario o email" />
          </label>
          <button onClick={submit} disabled={busy} className="w-full rounded-lg bg-purple py-2.5 font-medium text-navy transition hover:opacity-90 disabled:opacity-60">
            {busy ? "Enviando…" : "Enviar"}
          </button>
        </>
      )}
    </AuthShell>
  );
}
