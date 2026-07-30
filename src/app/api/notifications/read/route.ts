import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

export async function POST() {
  const session = await currentUser();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  await prisma.notification.updateMany({
    where: { userId: session.sub, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
