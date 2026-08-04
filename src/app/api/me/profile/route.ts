import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

const schema = z.object({
  displayName: z.string().trim().min(1, "Nombre requerido").max(50).optional(),
  bio: z.string().trim().max(300).optional(),
  avatarUrl: z.string().min(1).optional(),
  coverUrl: z.string().min(1).nullable().optional(),
});

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }

  const data = parsed.data;
  // Solo campos presentes; bio vacío => null
  const patch: Record<string, unknown> = {};
  if (data.displayName !== undefined) patch.displayName = data.displayName;
  if (data.bio !== undefined) patch.bio = data.bio === "" ? null : data.bio;
  if (data.avatarUrl !== undefined) patch.avatarUrl = data.avatarUrl;
  if (data.coverUrl !== undefined) patch.coverUrl = data.coverUrl;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Sin cambios" }, { status: 400 });
  }

  await prisma.user.update({ where: { id: session.sub }, data: patch });
  return NextResponse.json({ ok: true });
}
