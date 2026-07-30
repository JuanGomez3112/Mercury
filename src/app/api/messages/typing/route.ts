import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { setTyping } from "@/lib/typing";

const schema = z.object({ to: z.string().min(1) });

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const partner = await prisma.user.findUnique({
    where: { username: parsed.data.to },
    select: { id: true },
  });
  if (partner) setTyping(session.sub, partner.id);
  return NextResponse.json({ ok: true });
}
