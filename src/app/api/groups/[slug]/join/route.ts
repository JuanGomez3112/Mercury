import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

/** Unirse / salir de un grupo (toggle). El dueño no puede salir. */
export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { slug } = await params;

  const group = await prisma.group.findUnique({ where: { slug }, select: { id: true, ownerId: true } });
  if (!group) return NextResponse.json({ error: "No existe" }, { status: 404 });

  const existing = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: group.id, userId: session.sub } },
    select: { id: true },
  });

  if (existing) {
    if (group.ownerId === session.sub) return NextResponse.json({ error: "El dueño no puede salir" }, { status: 400 });
    await prisma.groupMember.delete({ where: { groupId_userId: { groupId: group.id, userId: session.sub } } });
    return NextResponse.json({ ok: true, member: false });
  }
  await prisma.groupMember.create({ data: { groupId: group.id, userId: session.sub } });
  return NextResponse.json({ ok: true, member: true });
}
