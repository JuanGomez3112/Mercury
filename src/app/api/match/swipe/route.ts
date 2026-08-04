import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { notify } from "@/lib/notifications";
import { orderPair } from "@/lib/match";

const schema = z.object({ targetId: z.string().min(1), liked: z.boolean() });

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inválido" }, { status: 400 });
  const { targetId, liked } = parsed.data;
  if (targetId === session.sub) return NextResponse.json({ error: "No válido" }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: { id: true, username: true, displayName: true, avatarUrl: true },
  });
  if (!target) return NextResponse.json({ error: "Usuario no existe" }, { status: 404 });

  // Registrar/actualizar swipe
  await prisma.swipe.upsert({
    where: { swiperId_targetId: { swiperId: session.sub, targetId } },
    create: { swiperId: session.sub, targetId, liked },
    update: { liked },
  });

  let match = false;
  if (liked) {
    // ¿El otro ya me dio like?
    const reverse = await prisma.swipe.findUnique({
      where: { swiperId_targetId: { swiperId: targetId, targetId: session.sub } },
      select: { liked: true },
    });
    if (reverse?.liked) {
      const [a, b] = orderPair(session.sub, targetId);
      await prisma.match.upsert({
        where: { userAId_userBId: { userAId: a, userBId: b } },
        create: { userAId: a, userBId: b },
        update: {},
      });
      match = true;
      await notify({ userId: targetId, actorId: session.sub, type: "match" });
      await notify({ userId: session.sub, actorId: targetId, type: "match" });
    }
  }

  return NextResponse.json({ ok: true, match, target: match ? target : null });
}
