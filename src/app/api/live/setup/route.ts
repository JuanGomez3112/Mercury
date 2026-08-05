import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { getOrCreateMyStream } from "@/lib/live";

const schema = z.object({ title: z.string().trim().max(120).optional() });

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => ({})));
  const stream = await getOrCreateMyStream(session.sub);

  if (parsed.success && parsed.data.title !== undefined) {
    await prisma.liveStream.update({ where: { id: stream.id }, data: { title: parsed.data.title || null } });
  }
  return NextResponse.json({ ok: true, streamKey: stream.streamKey });
}
