import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

/** Marcar una historia como vista. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const story = await prisma.story.findUnique({ where: { id }, select: { id: true } });
  if (!story) return NextResponse.json({ error: "No existe" }, { status: 404 });

  await prisma.storyView.upsert({
    where: { storyId_viewerId: { storyId: id, viewerId: session.sub } },
    create: { storyId: id, viewerId: session.sub },
    update: {},
  });
  return NextResponse.json({ ok: true });
}

/** Borrar mi propia historia. */
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { id } = await params;

  const story = await prisma.story.findUnique({ where: { id }, select: { authorId: true } });
  if (!story) return NextResponse.json({ error: "No existe" }, { status: 404 });
  if (story.authorId !== session.sub) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  await prisma.story.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
