import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

const schema = z.object({
  creatorMode: z.boolean(),
  subPriceCredits: z.number().int().min(1).max(100000).nullable().optional(),
  collaborators: z
    .array(z.object({ username: z.string().trim().min(1), percent: z.number().int().min(1).max(99) }))
    .max(5)
    .optional(),
});

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { creatorMode, subPriceCredits, collaborators } = parsed.data;

  // Resolver colaboradores de suscripción (solo en modo creador)
  const collabRows: { creatorId: string; userId: string; percent: number }[] = [];
  if (creatorMode && collaborators && collaborators.length > 0) {
    const sum = collaborators.reduce((s, c) => s + c.percent, 0);
    if (sum > 99) return NextResponse.json({ error: "La suma de porcentajes debe dejar al menos 1% para ti" }, { status: 400 });
    const names = collaborators.map((c) => c.username.replace(/^@/, ""));
    const users = await prisma.user.findMany({ where: { username: { in: names } }, select: { id: true, username: true } });
    const byName = new Map(users.map((u) => [u.username.toLowerCase(), u.id]));
    for (const c of collaborators) {
      const uid = byName.get(c.username.replace(/^@/, "").toLowerCase());
      if (!uid) return NextResponse.json({ error: `@${c.username} no existe` }, { status: 400 });
      if (uid === session.sub) return NextResponse.json({ error: "No puedes añadirte como colaborador" }, { status: 400 });
      if (collabRows.some((x) => x.userId === uid)) return NextResponse.json({ error: "Colaborador repetido" }, { status: 400 });
      collabRows.push({ creatorId: session.sub, userId: uid, percent: c.percent });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.sub },
      data: { creatorMode, subPriceCredits: creatorMode ? (subPriceCredits ?? null) : null },
    });
    // Reemplazar colaboradores de suscripción
    await tx.subCollaborator.deleteMany({ where: { creatorId: session.sub } });
    if (collabRows.length > 0) await tx.subCollaborator.createMany({ data: collabRows });
  });
  return NextResponse.json({ ok: true });
}
