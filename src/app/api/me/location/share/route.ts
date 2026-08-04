import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

const schema = z.object({
  shareLocation: z.boolean().optional(),
  locationScope: z.enum(["friends", "public"]).optional(),
});

/** Ajusta preferencias de ubicación. Al desactivar, borra las coordenadas. */
export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inválido" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.shareLocation !== undefined) {
    data.shareLocation = parsed.data.shareLocation;
    if (!parsed.data.shareLocation) {
      data.lat = null;
      data.lng = null;
      data.locationAt = null;
    }
  }
  if (parsed.data.locationScope !== undefined) data.locationScope = parsed.data.locationScope;
  if (Object.keys(data).length === 0) return NextResponse.json({ error: "Sin cambios" }, { status: 400 });

  await prisma.user.update({ where: { id: session.sub }, data });
  return NextResponse.json({ ok: true });
}
