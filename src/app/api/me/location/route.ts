import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { getVisibleLocations } from "@/lib/geo";

const schema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/** Actualiza mi ubicación (solo si tengo compartir activado) y devuelve gente visible. */
export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Coordenadas inválidas" }, { status: 400 });

  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { shareLocation: true } });
  if (me?.shareLocation) {
    await prisma.user.update({
      where: { id: session.sub },
      data: { lat: parsed.data.lat, lng: parsed.data.lng, locationAt: new Date() },
    });
  }

  const nearby = await getVisibleLocations(session.sub);
  return NextResponse.json({ ok: true, nearby });
}
