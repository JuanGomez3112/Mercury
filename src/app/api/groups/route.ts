import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser, ensureNotBlocked } from "@/lib/auth";
import { uniqueSlug } from "@/lib/groups";

const schema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto").max(50),
  description: z.string().trim().max(300).optional(),
  isPrivate: z.boolean().default(false),
});

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const blk = await ensureNotBlocked(session.sub);
  if (blk.blocked) return NextResponse.json({ error: blk.reason }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Inválido" }, { status: 400 });

  const slug = await uniqueSlug(parsed.data.name);
  const group = await prisma.group.create({
    data: {
      slug,
      name: parsed.data.name,
      description: parsed.data.description || null,
      isPrivate: parsed.data.isPrivate,
      ownerId: session.sub,
      members: { create: { userId: session.sub, role: "owner" } },
    },
    select: { slug: true },
  });
  return NextResponse.json({ ok: true, slug: group.slug });
}
