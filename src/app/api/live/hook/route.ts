import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Webhook llamado por MediaMTX (runOnReady / runOnNotReady) para marcar en vivo. */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const secret = searchParams.get("secret");
  if (!secret || secret !== process.env.LIVE_HOOK_SECRET) {
    return NextResponse.json({ error: "no" }, { status: 403 });
  }
  const path = searchParams.get("path");
  const event = searchParams.get("event");
  if (!path) return NextResponse.json({ error: "no path" }, { status: 400 });

  // path = username del broadcaster
  const stream = await prisma.liveStream.findFirst({ where: { broadcaster: { username: path } }, select: { id: true } });
  if (!stream) return NextResponse.json({ ok: true, ignored: true });

  if (event === "ready") {
    await prisma.liveStream.update({ where: { id: stream.id }, data: { isLive: true, startedAt: new Date(), endedAt: null } });
  } else {
    await prisma.liveStream.update({ where: { id: stream.id }, data: { isLive: false, endedAt: new Date() } });
  }
  return NextResponse.json({ ok: true });
}
