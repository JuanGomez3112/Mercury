import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdminUnlocked } from "@/lib/admin";

const schema = z.object({
  action: z.enum(["remove", "ban", "suspend", "dismiss"]),
  suspendDays: z.union([z.literal(1), z.literal(7), z.literal(30)]).optional(),
});

/** Resuelve el id del autor a sancionar según el tipo de target. */
async function resolveAuthor(tx: Prisma.TransactionClient, targetType: string, targetId: string): Promise<string | null> {
  switch (targetType) {
    case "post": {
      const p = await tx.post.findUnique({ where: { id: targetId }, select: { authorId: true } });
      return p?.authorId ?? null;
    }
    case "comment": {
      const c = await tx.comment.findUnique({ where: { id: targetId }, select: { authorId: true } });
      return c?.authorId ?? null;
    }
    case "message": {
      const m = await tx.message.findUnique({ where: { id: targetId }, select: { senderId: true } });
      return m?.senderId ?? null;
    }
    case "listing": {
      const l = await tx.listing.findUnique({ where: { id: targetId }, select: { sellerId: true } });
      return l?.sellerId ?? null;
    }
    case "user":
      return targetId;
    default:
      return null;
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdminUnlocked();
  if (!admin) return NextResponse.json({ error: "Prohibido" }, { status: 403 });

  const { id } = await params;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inválido" }, { status: 400 });
  const { action, suspendDays } = parsed.data;

  if (action === "suspend" && !suspendDays) {
    return NextResponse.json({ error: "Falta duración" }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const report = await tx.report.findUnique({ where: { id }, select: { targetType: true, targetId: true } });
      if (!report) throw new Error("NF");
      const { targetType, targetId } = report;

      if (action === "remove") {
        if (targetType === "user") throw new Error("BADREMOVE");
        // Borra el target (idempotente: si ya no existe, deleteMany no falla).
        if (targetType === "post") await tx.post.deleteMany({ where: { id: targetId } });
        else if (targetType === "comment") await tx.comment.deleteMany({ where: { id: targetId } });
        else if (targetType === "message") await tx.message.deleteMany({ where: { id: targetId } });
        else if (targetType === "listing") await tx.listing.updateMany({ where: { id: targetId }, data: { status: "removed" } });
      } else if (action === "ban") {
        const authorId = await resolveAuthor(tx, targetType, targetId);
        if (!authorId) throw new Error("NOAUTHOR");
        await tx.user.update({ where: { id: authorId }, data: { banned: true } });
      } else if (action === "suspend") {
        const authorId = await resolveAuthor(tx, targetType, targetId);
        if (!authorId) throw new Error("NOAUTHOR");
        const until = new Date(Date.now() + suspendDays! * 24 * 60 * 60 * 1000);
        await tx.user.update({ where: { id: authorId }, data: { suspendedUntil: until } });
      }
      // dismiss → nada al target.

      // Una acción resuelve TODOS los reportes pendientes del mismo target.
      await tx.report.updateMany({
        where: { targetType, targetId, status: "pending" },
        data: {
          status: action === "dismiss" ? "dismissed" : "resolved",
          action,
          resolvedById: admin.id,
          resolvedAt: new Date(),
        },
      });
    });
  } catch (e) {
    if (e instanceof Error && e.message === "NF") return NextResponse.json({ error: "No existe" }, { status: 404 });
    if (e instanceof Error && e.message === "BADREMOVE")
      return NextResponse.json({ error: "Para usuarios usa banear o suspender" }, { status: 400 });
    if (e instanceof Error && e.message === "NOAUTHOR")
      return NextResponse.json({ error: "El contenido ya no existe; usa descartar" }, { status: 400 });
    throw e;
  }

  return NextResponse.json({ ok: true });
}
