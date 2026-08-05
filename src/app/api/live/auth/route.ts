import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/**
 * Autenticación externa de MediaMTX.
 * - action "publish": ruta = username, contraseña = streamKey del dueño. Solo el dueño publica.
 * - resto (read/playback/api…): permitido (transmisiones públicas).
 * MediaMTX espera 200 = permitido, cualquier otro = denegado.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({} as Record<string, unknown>));
  const action = String(body.action ?? "");

  if (action !== "publish") return NextResponse.json({ ok: true });

  const path = String(body.path ?? "");
  const password = String(body.password ?? "");
  if (!path || !password) return NextResponse.json({ error: "no" }, { status: 401 });

  const stream = await prisma.liveStream.findFirst({
    where: { broadcaster: { username: path } },
    select: { streamKey: true },
  });
  if (!stream || stream.streamKey !== password) {
    return NextResponse.json({ error: "no" }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
