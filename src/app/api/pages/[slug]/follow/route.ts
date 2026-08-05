import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

/** Seguir / dejar de seguir una página (toggle). El dueño no puede dejar de seguir. */
export async function POST(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const { slug } = await params;

  const page = await prisma.page.findUnique({ where: { slug }, select: { id: true, ownerId: true } });
  if (!page) return NextResponse.json({ error: "No existe" }, { status: 404 });

  const existing = await prisma.pageFollow.findUnique({
    where: { pageId_userId: { pageId: page.id, userId: session.sub } },
    select: { id: true },
  });

  if (existing) {
    if (page.ownerId === session.sub) return NextResponse.json({ error: "El dueño no puede dejar de seguir" }, { status: 400 });
    await prisma.pageFollow.delete({ where: { pageId_userId: { pageId: page.id, userId: session.sub } } });
    return NextResponse.json({ ok: true, following: false });
  }
  await prisma.pageFollow.create({ data: { pageId: page.id, userId: session.sub } });
  return NextResponse.json({ ok: true, following: true });
}
