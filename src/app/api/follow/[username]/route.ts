import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { notify, unnotify } from "@/lib/notifications";

// POST /api/follow/:username — toggle seguir/dejar de seguir
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { username } = await params;
  const target = await prisma.user.findUnique({ where: { username }, select: { id: true } });
  if (!target) return NextResponse.json({ error: "No existe" }, { status: 404 });
  if (target.id === session.sub) {
    return NextResponse.json({ error: "No puedes seguirte a ti mismo" }, { status: 400 });
  }

  const key = {
    followerId_followingId: { followerId: session.sub, followingId: target.id },
  };
  const existing = await prisma.follow.findUnique({ where: key });

  if (existing) {
    await prisma.follow.delete({ where: key });
    await unnotify({ userId: target.id, actorId: session.sub, type: "follow" });
  } else {
    await prisma.follow.create({
      data: { followerId: session.sub, followingId: target.id },
    });
    await notify({ userId: target.id, actorId: session.sub, type: "follow" });
  }

  const count = await prisma.follow.count({ where: { followingId: target.id } });
  return NextResponse.json({ ok: true, following: !existing, followers: count });
}
