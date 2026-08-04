"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Map as LMap, Marker as LMarker } from "leaflet";
import type { NearbyUser } from "@/lib/geo";

type Share = { shareLocation: boolean; locationScope: "friends" | "public" };

function fmtDist(km: number | null): string {
  if (km == null) return "";
  if (km < 1) return `a ${Math.round(km * 1000)} m`;
  return `a ${km.toFixed(1)} km`;
}

/* eslint-disable @next/next/no-img-element */
export default function MapView({ initialShare, initialNearby, myAvatarUrl = null }: { initialShare: Share; initialNearby: NearbyUser[]; myAvatarUrl?: string | null }) {
  const [share, setShare] = useState(initialShare.shareLocation);
  const [scope, setScope] = useState<Share["locationScope"]>(initialShare.locationScope);
  const [nearby, setNearby] = useState<NearbyUser[]>(initialNearby);
  const [status, setStatus] = useState<"idle" | "locating" | "denied" | "ready">("idle");
  const [myPos, setMyPos] = useState<{ lat: number; lng: number } | null>(null);

  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LMap | null>(null);
  const markersRef = useRef<LMarker[]>([]);

  // Pedir ubicación del navegador y publicarla
  function locate() {
    if (!("geolocation" in navigator)) return setStatus("denied");
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setMyPos({ lat, lng });
        setStatus("ready");
        const res = await fetch("/api/me/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lat, lng }),
        });
        if (res.ok) setNearby((await res.json()).nearby);
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  // Nota: NO pedimos ubicación automáticamente. En móvil, el mapa pintándose al
  // mismo tiempo puede descartar el cartel de permiso. Se pide con gesto (botón).

  // Inicializar / actualizar el mapa Leaflet
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapEl.current) return;
      const center: [number, number] = myPos ? [myPos.lat, myPos.lng] : nearby[0] ? [nearby[0].lat, nearby[0].lng] : [4.711, -74.072];

      if (!mapRef.current) {
        mapRef.current = L.map(mapEl.current, { zoomControl: false, attributionControl: false }).setView(center, 13);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(mapRef.current);
      } else {
        mapRef.current.setView(center, mapRef.current.getZoom());
      }

      // Reset markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      const avatarIcon = (src: string | null, ring: string) =>
        L.divIcon({
          className: "",
          html: `<div style="width:44px;height:44px;border-radius:9999px;border:3px solid ${ring};overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.5);background:#1a1830;display:flex;align-items:center;justify-content:center;color:#ffffff66;font-size:20px">${src ? `<img src="${src}" style="width:100%;height:100%;object-fit:cover" onerror="this.style.display='none';this.parentNode.innerHTML='👤'"/>` : "👤"}</div>`,
          iconSize: [44, 44],
          iconAnchor: [22, 22],
        });

      if (myPos) {
        markersRef.current.push(L.marker([myPos.lat, myPos.lng], { icon: avatarIcon(myAvatarUrl, "#7c5cff"), zIndexOffset: 1000 }).addTo(mapRef.current!).bindPopup("Tú"));
      }
      for (const u of nearby) {
        const mk = L.marker([u.lat, u.lng], { icon: avatarIcon(u.avatarUrl, u.isFriend ? "#7c5cff" : "#ffffff55") })
          .addTo(mapRef.current!)
          .bindPopup(`${u.displayName ?? u.username}${u.distanceKm != null ? " · " + fmtDist(u.distanceKm) : ""}`);
        markersRef.current.push(mk);
      }
    })();
    return () => { cancelled = true; };
  }, [myPos, nearby, myAvatarUrl]);

  useEffect(() => () => { mapRef.current?.remove(); mapRef.current = null; }, []);

  async function saveShare(next: Partial<Share>) {
    const body = { ...next };
    await fetch("/api/me/location/share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (next.shareLocation) locate(); // republica al activar
  }

  const nearOnes = nearby.filter((u) => u.distanceKm != null && u.distanceKm <= 2);

  return (
    <div className="space-y-4">
      {/* Banner: activar ubicación (siempre visible) */}
      <Link href="/activar-ubicacion" className="flex items-center justify-between gap-3 rounded-2xl border border-purple/30 bg-purple/10 px-4 py-3 transition hover:bg-purple/15 max-sm:rounded-none max-sm:border-x-0">
        <span className="text-sm text-white/85">🔒 ¿La ubicación no pide permiso? <b className="text-white">Actívala aquí</b></span>
        <span className="text-purple">›</span>
      </Link>

      {/* Mapa */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 max-sm:rounded-none max-sm:border-x-0">
        <div ref={mapEl} className="h-[320px] w-full bg-navy-2" />
        {!myPos && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-navy/85 p-6 text-center">
            {status === "locating" ? (
              <p className="text-sm text-white/70">Buscando tu ubicación… toca <b>Permitir</b>.</p>
            ) : (
              <>
                <p className="text-sm text-white/80">Muéstrate en el mapa</p>
                <button onClick={locate} className="rounded-full bg-gradient-to-tl from-purple to-purple-soft px-5 py-2.5 text-sm font-semibold text-white">📍 Activar mi ubicación</button>
                {status === "denied" && (
                  <>
                    <p className="max-w-xs text-xs text-amber-400">No se pudo obtener tu ubicación. Revisa el permiso o instala el certificado.</p>
                    <Link href="/activar-ubicacion" className="text-sm text-purple underline">Ayuda para activar</Link>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Alerta de cercanía */}
      {nearOnes.length > 0 && (
        <div className="rounded-2xl border border-purple/30 bg-purple/10 p-4 max-sm:rounded-none max-sm:border-x-0">
          <p className="text-sm text-white">
            📍 <b>{nearOnes[0].displayName ?? nearOnes[0].username}</b>
            {nearOnes.length > 1 ? ` y ${nearOnes.length - 1} más están` : " está"} cerca de ti
          </p>
        </div>
      )}

      {/* Privacidad */}
      <div className="space-y-3 rounded-2xl border border-white/10 bg-navy-2/50 p-5 max-sm:rounded-none max-sm:border-x-0">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-white/70">Tu ubicación</h2>
          <Link href="/activar-ubicacion" className="text-xs text-purple underline">
            ¿No funciona? Activar
          </Link>
        </div>
        <label className="flex items-center justify-between gap-3 text-sm text-white/85">
          <span>Compartir mi ubicación</span>
          <button
            onClick={() => { const v = !share; setShare(v); saveShare({ shareLocation: v }); }}
            className={`h-6 w-11 rounded-full p-0.5 transition ${share ? "bg-purple" : "bg-white/15"}`}
            aria-label="Compartir ubicación"
          >
            <span className={`block h-5 w-5 rounded-full bg-white transition ${share ? "translate-x-5" : ""}`} />
          </button>
        </label>

        {share && (
          <div>
            <p className="mb-2 text-xs text-white/40">¿Quién puede ver tu ubicación?</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setScope("friends"); saveShare({ locationScope: "friends" }); }}
                className={`rounded-xl border-2 py-2 text-sm font-medium transition ${scope === "friends" ? "border-purple bg-purple/15 text-white" : "border-white/10 text-white/60"}`}>
                Solo amigos
              </button>
              <button onClick={() => { setScope("public"); saveShare({ locationScope: "public" }); }}
                className={`rounded-xl border-2 py-2 text-sm font-medium transition ${scope === "public" ? "border-purple bg-purple/15 text-white" : "border-white/10 text-white/60"}`}>
                Público
              </button>
            </div>
            <p className="mt-2 text-xs text-white/30">
              {scope === "public" ? "Todos en Mercury podrán ver dónde estás." : "Solo quienes se siguen mutuamente podrán verte."}
            </p>
          </div>
        )}
      </div>

      {/* Lista de cercanos */}
      <div className="space-y-2">
        <p className="px-4 text-xs font-semibold uppercase tracking-wide text-white/40 sm:px-0">Cerca de ti</p>
        {nearby.length === 0 && <p className="px-4 text-sm text-white/40 sm:px-0">Nadie visible por ahora.</p>}
        {nearby.map((u) => (
          <Link key={u.id} href={`/u/${u.username}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-navy-2/50 px-4 py-3 transition hover:bg-navy-2 max-sm:rounded-none max-sm:border-x-0">
            <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-navy ring-2 ring-purple/30">
              {u.avatarUrl && <img src={u.avatarUrl} alt="" className="h-full w-full object-cover" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-white">{u.displayName ?? u.username}</p>
              <p className="text-xs text-white/40">@{u.username}{u.isFriend ? " · amigo" : ""}</p>
            </div>
            {u.distanceKm != null && (
              <span className={`shrink-0 text-xs ${u.distanceKm <= 2 ? "text-purple" : "text-white/40"}`}>{fmtDist(u.distanceKm)}</span>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
