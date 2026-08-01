import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export async function GET() {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const agg = await prisma.cartItem.aggregate({ where: { userId: session.sub }, _sum: { qty: true } });
  return NextResponse.json({ count: agg._sum.qty ?? 0 });
}
