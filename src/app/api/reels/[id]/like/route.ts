import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { notify } from "@/lib/notifications";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const reel = await prisma.reel.findUnique({ where: { id }, select: { authorId: true } });
  if (!reel) return NextResponse.json({ error: "No existe" }, { status: 404 });

  const existing = await prisma.reelLike.findUnique({
    where: { reelId_userId: { reelId: id, userId: session.sub } },
    select: { id: true },
  });

  let liked: boolean;
  if (existing) {
    await prisma.reelLike.delete({ where: { reelId_userId: { reelId: id, userId: session.sub } } });
    liked = false;
  } else {
    await prisma.reelLike.create({ data: { reelId: id, userId: session.sub } });
    liked = true;
    if (reel.authorId !== session.sub) await notify({ userId: reel.authorId, actorId: session.sub, type: "like" });
  }

  const likeCount = await prisma.reelLike.count({ where: { reelId: id } });
  return NextResponse.json({ ok: true, liked, likeCount });
}
