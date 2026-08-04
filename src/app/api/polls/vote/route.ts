import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

const schema = z.object({ optionId: z.string().min(1) });

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Inválido" }, { status: 400 });

  const option = await prisma.pollOption.findUnique({
    where: { id: parsed.data.optionId },
    select: { id: true, pollId: true },
  });
  if (!option) return NextResponse.json({ error: "Opción no existe" }, { status: 404 });

  const existing = await prisma.pollVote.findUnique({
    where: { pollId_userId: { pollId: option.pollId, userId: session.sub } },
    select: { optionId: true },
  });

  if (existing && existing.optionId === option.id) {
    // Clic en la misma opción => quitar voto
    await prisma.pollVote.delete({
      where: { pollId_userId: { pollId: option.pollId, userId: session.sub } },
    });
  } else {
    await prisma.pollVote.upsert({
      where: { pollId_userId: { pollId: option.pollId, userId: session.sub } },
      create: { pollId: option.pollId, optionId: option.id, userId: session.sub },
      update: { optionId: option.id },
    });
  }

  // Estado actualizado
  const opts = await prisma.pollOption.findMany({
    where: { pollId: option.pollId },
    orderBy: { order: "asc" },
    select: { id: true, text: true, _count: { select: { votes: true } } },
  });
  const mine = await prisma.pollVote.findUnique({
    where: { pollId_userId: { pollId: option.pollId, userId: session.sub } },
    select: { optionId: true },
  });
  return NextResponse.json({
    ok: true,
    options: opts.map((o) => ({ id: o.id, text: o.text, votes: o._count.votes })),
    totalVotes: opts.reduce((s, o) => s + o._count.votes, 0),
    myOptionId: mine?.optionId ?? null,
  });
}
