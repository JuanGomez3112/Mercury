import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser, ensureNotBlocked } from "@/lib/auth";

const schema = z.object({
  videoUrl: z.string().min(1),
  caption: z.string().trim().max(500).optional(),
});

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const blk = await ensureNotBlocked(session.sub);
  if (blk.blocked) return NextResponse.json({ error: blk.reason }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inválido" }, { status: 400 });

  const reel = await prisma.reel.create({
    data: { authorId: session.sub, videoUrl: parsed.data.videoUrl, caption: parsed.data.caption || null },
    select: { id: true },
  });
  return NextResponse.json({ ok: true, id: reel.id });
}
