import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser, ensureNotBlocked } from "@/lib/auth";
import { uniquePageSlug } from "@/lib/pages";

const schema = z.object({
  name: z.string().trim().min(2, "Nombre muy corto").max(50),
  description: z.string().trim().max(300).optional(),
});

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const blk = await ensureNotBlocked(session.sub);
  if (blk.blocked) return NextResponse.json({ error: blk.reason }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Inválido" }, { status: 400 });

  const slug = await uniquePageSlug(parsed.data.name);
  const page = await prisma.page.create({
    data: {
      slug,
      name: parsed.data.name,
      description: parsed.data.description || null,
      ownerId: session.sub,
      followers: { create: { userId: session.sub } }, // el dueño sigue su propia página
    },
    select: { slug: true },
  });
  return NextResponse.json({ ok: true, slug: page.slug });
}
