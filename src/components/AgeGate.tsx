"use client";

import { useEffect, useState } from "react";

const KEY = "mercury-age-ok";

export default function AgeGate() {
  const [confirmed, setConfirmed] = useState(true); // asume OK hasta montar (evita flash SSR)

  useEffect(() => {
    setConfirmed(localStorage.getItem(KEY) === "1");
  }, []);

  if (confirmed) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/95 backdrop-blur-sm p-6">
      <div className="w-full max-w-md rounded-2xl border border-purple/30 bg-navy-2/80 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-6 h-16 w-16">
          <span className="mercury-mark h-full w-auto mx-auto" aria-label="Mercury" />
        </div>
        <h1 className="text-2xl font-semibold text-white">Contenido para adultos</h1>
        <p className="mt-3 text-sm text-purple-soft">
          Mercury es una comunidad para mayores de 18 años. Al entrar confirmas que
          eres mayor de edad y aceptas ver contenido para adultos.
        </p>
        <div className="mt-7 flex flex-col gap-3">
          <button
            onClick={() => {
              localStorage.setItem(KEY, "1");
              setConfirmed(true);
            }}
            className="rounded-xl bg-purple px-5 py-3 font-medium text-navy transition hover:opacity-90"
          >
            Tengo 18 años o más — Entrar
          </button>
          <a
            href="https://www.google.com"
            className="rounded-xl border border-white/15 px-5 py-3 text-sm text-white/70 transition hover:bg-white/5"
          >
            Soy menor — Salir
          </a>
        </div>
        <p className="mt-5 text-[11px] leading-relaxed text-white/40">
          Verificación real de edad pendiente de integrar. Esto es un placeholder de
          cumplimiento, no un control legal definitivo.
        </p>
      </div>
    </div>
  );
}
