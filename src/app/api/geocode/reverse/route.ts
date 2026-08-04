import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";

/** Reverse-geocoding vía Nominatim (OSM). Devuelve una etiqueta corta legible. */
export async function GET(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: "Coordenadas inválidas" }, { status: 400 });
  }

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&accept-language=es`;
    const r = await fetch(url, {
      headers: { "User-Agent": "MercuryApp/1.0 (contacto@mercury.local)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) throw new Error("nominatim");
    const d = await r.json();
    const a = d.address ?? {};
    const primary =
      a.suburb || a.neighbourhood || a.city_district || a.town || a.village || a.city || a.county || a.state;
    const label = [primary, a.country].filter(Boolean).join(", ") || d.display_name?.split(",").slice(0, 2).join(",") || null;
    return NextResponse.json({ ok: true, label });
  } catch {
    // Fallback: coordenadas
    return NextResponse.json({ ok: true, label: `${lat.toFixed(3)}, ${lng.toFixed(3)}` });
  }
}
