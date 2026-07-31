import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export async function GET() {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { balance: true } });
  return NextResponse.json({ balance: me?.balance ?? 0 });
}
