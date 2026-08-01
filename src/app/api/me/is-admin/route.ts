import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export async function GET() {
  const session = await currentUser();
  if (!session) return NextResponse.json({ isAdmin: false });
  const u = await prisma.user.findUnique({ where: { id: session.sub }, select: { isAdmin: true } });
  return NextResponse.json({ isAdmin: u?.isAdmin ?? false });
}
