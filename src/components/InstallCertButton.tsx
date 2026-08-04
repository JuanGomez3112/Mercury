"use client";

/**
 * Botón que descarga la Root CA de Mercury desde el propio servidor (vía HTTP,
 * sin aviso de certificado). Tras instalarla como CA de confianza, la
 * geolocalización queda habilitada en HTTPS.
 */
export default function InstallCertButton({ className = "" }: { className?: string }) {
  const host = typeof window !== "undefined" ? window.location.hostname : "192.168.1.106";
  const href = `http://${host}/mercury-rootCA.crt`;
  return (
    <a
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-tl from-purple to-purple-soft px-4 py-2 text-sm font-semibold text-white ${className}`}
    >
      🔒 Activar ubicación (instalar certificado)
    </a>
  );
}
