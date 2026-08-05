import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** Webhook de MediaMTX (runOnAvailable/runOnUnavailable). Ruta sin '&' para evitar problemas de shell. */
export async function GET(req: Request, { params }: { params: Promise<{ event: string; username: string }> }) {
  const { searchParams } = new URL(req.url);
  if (searchParams.get("secret") !== process.env.LIVE_HOOK_SECRET) {
    return NextResponse.json({ error: "no" }, { status: 403 });
  }
  const { event, username } = await params;

  const stream = await prisma.liveStream.findFirst({ where: { broadcaster: { username } }, select: { id: true } });
  if (!stream) return NextResponse.json({ ok: true, ignored: true });

  if (event === "ready") {
    await prisma.liveStream.update({ where: { id: stream.id }, data: { isLive: true, startedAt: new Date(), endedAt: null } });
  } else {
    await prisma.liveStream.update({ where: { id: stream.id }, data: { isLive: false, endedAt: new Date() } });
  }
  return NextResponse.json({ ok: true });
}
