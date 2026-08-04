"use client";

import { useEffect, useState } from "react";

/** Diagnóstico de por qué la geolocalización no funciona. */
export default function LocationDiag() {
  const [secure, setSecure] = useState<boolean | null>(null);
  const [proto, setProto] = useState("");
  const [perm, setPerm] = useState("—");
  const [result, setResult] = useState("");

  useEffect(() => {
    setSecure(window.isSecureContext);
    setProto(window.location.protocol);
    const anyNav = navigator as Navigator & { permissions?: Permissions };
    anyNav.permissions
      ?.query({ name: "geolocation" as PermissionName })
      .then((p) => {
        setPerm(p.state);
        p.onchange = () => setPerm(p.state);
      })
      .catch(() => setPerm("no soportado"));
  }, []);

  function test() {
    setResult("Probando…");
    if (!("geolocation" in navigator)) {
      setResult("geolocation no disponible en este navegador");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => setResult(`✅ OK: ${p.coords.latitude.toFixed(4)}, ${p.coords.longitude.toFixed(4)}`),
      (e) => {
        const map: Record<number, string> = {
          1: "Permiso denegado (contexto no seguro, o el sitio está en 'bloquear')",
          2: "Posición no disponible (ubicación del sistema apagada / sin señal)",
          3: "Tiempo agotado",
        };
        setResult(`❌ Error ${e.code}: ${map[e.code] ?? e.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  const ok = (v: boolean) => (v ? "text-emerald-400" : "text-red-400");

  return (
    <div className="space-y-2 text-sm">
      <div className="flex justify-between"><span className="text-white/50">Protocolo</span><span className={ok(proto === "https:")}>{proto || "—"}</span></div>
      <div className="flex justify-between"><span className="text-white/50">Contexto seguro (cert de confianza)</span><span className={secure == null ? "text-white/40" : ok(secure)}>{secure == null ? "—" : secure ? "sí" : "no"}</span></div>
      <div className="flex justify-between"><span className="text-white/50">Permiso de ubicación</span><span className={perm === "granted" ? "text-emerald-400" : perm === "denied" ? "text-red-400" : "text-white/70"}>{perm}</span></div>
      <button onClick={test} className="mt-1 w-full rounded-full border border-white/15 py-2 text-sm text-white/85 transition hover:bg-white/5">Probar ubicación ahora</button>
      {result && <p className="break-words text-white/80">{result}</p>}
      {secure === false && (
        <p className="text-xs text-amber-400">El cert no quedó como de confianza: aún sale "no". En Android verifica que lo instalaste como <b>certificado de CA</b> (no "de usuario/VPN"); en iPhone activa la confianza total en Ajustes → General → Información → Ajustes de confianza.</p>
      )}
    </div>
  );
}
