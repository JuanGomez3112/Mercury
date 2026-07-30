import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

const schema = z.object({
  body: z.string().trim().max(2000).default(""),
  images: z.array(z.string()).max(4).default([]),
});

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Inválido" }, { status: 400 });
  }
  const { body, images } = parsed.data;
  if (!body && images.length === 0) {
    return NextResponse.json({ error: "Publicación vacía" }, { status: 400 });
  }

  const post = await prisma.post.create({
    data: { authorId: session.sub, body, images },
  });
  return NextResponse.json({ ok: true, id: post.id });
}
