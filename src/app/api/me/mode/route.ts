import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

const schema = z.object({ mode: z.enum(["angel", "devil"]).nullable() });

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Modo inválido" }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.sub },
    data: { mode: parsed.data.mode },
  });
  return NextResponse.json({ ok: true, mode: parsed.data.mode });
}
