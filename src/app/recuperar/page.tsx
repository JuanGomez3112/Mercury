"use client";

import { useState } from "react";
import Link from "next/link";
import MercuryMark from "@/components/MercuryMark";

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
    setSent(true); // respuesta uniforme: siempre confirmamos
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-soft via-purple to-purple p-6">
      <div className="w-full max-w-md text-center">
        <div className="mb-8 flex justify-center text-navy"><MercuryMark className="h-20 w-12" /></div>

        {sent ? (
          <>
            <p className="text-lg font-bold text-navy">Si la cuenta existe, te enviamos un correo con las instrucciones para restablecer tu contraseña.</p>
            <p className="mt-2 text-sm text-navy/70">Revisa tu bandeja (y spam).</p>
            <Link href="/login" className="mt-6 inline-block text-sm font-semibold text-navy underline">Volver a iniciar sesión</Link>
          </>
        ) : (
          <>
            <p className="mb-8 text-lg font-bold text-navy">
              Escribe tu nombre de usuario o correo electrónico, te enviaremos un correo con las instrucciones para establecer tu contraseña.
            </p>
            <label className="block text-left">
              <span className="mb-1 block text-sm font-medium text-navy/80">Usuario ó Correo Electrónico</span>
              <input
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                className="w-full rounded-full border border-navy/20 bg-white/70 px-4 py-2.5 text-sm text-navy outline-none placeholder:text-navy/40 focus:border-navy"
                placeholder="usuario o email"
              />
            </label>
            <button onClick={submit} disabled={busy} className="mt-6 rounded-full bg-navy px-10 py-2.5 text-sm font-bold text-white disabled:opacity-50">
              {busy ? "Enviando…" : "Enviar"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
