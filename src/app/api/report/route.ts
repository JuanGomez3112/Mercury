import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { REPORT_TARGETS, REPORT_REASONS, isPriority } from "@/lib/moderation";

const schema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.string().min(1),
  reason: z.enum(REPORT_REASONS),
  note: z.string().trim().max(500).default(""),
});

/** Confirma que el target existe. No expone nada del reportado. */
async function targetExists(targetType: string, targetId: string): Promise<boolean> {
  switch (targetType) {
    case "post":
      return !!(await prisma.post.findUnique({ where: { id: targetId }, select: { id: true } }));
    case "comment":
      return !!(await prisma.comment.findUnique({ where: { id: targetId }, select: { id: true } }));
    case "message":
      return !!(await prisma.message.findUnique({ where: { id: targetId }, select: { id: true } }));
    case "user":
      return !!(await prisma.user.findUnique({ where: { id: targetId }, select: { id: true } }));
    default:
      return false;
  }
}

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Inválido" }, { status: 400 });
  }
  const { targetType, targetId, reason, note } = parsed.data;

  // No auto-reporte de la propia cuenta.
  if (targetType === "user" && targetId === session.sub) {
    return NextResponse.json({ error: "No puedes reportarte a ti mismo" }, { status: 400 });
  }

  if (!(await targetExists(targetType, targetId))) {
    return NextResponse.json({ error: "No existe" }, { status: 404 });
  }

  try {
    await prisma.report.create({
      data: {
        reporterId: session.sub,
        targetType,
        targetId,
        reason,
        note,
        priority: isPriority(reason),
      },
    });
  } catch (e) {
    // Ya reportado por este usuario (unique) → idempotente.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json({ ok: true, already: true });
    }
    throw e;
  }

  return NextResponse.json({ ok: true });
}
