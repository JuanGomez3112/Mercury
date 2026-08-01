import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentUser, ensureNotBlocked } from "@/lib/auth";
import { getConfig } from "@/lib/token";
import { activeProvider } from "@/lib/payments";

const schema = z.object({ credits: z.number().int().min(1).max(10_000_000) });

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const blk = await ensureNotBlocked(session.sub);
  if (blk.blocked) return NextResponse.json({ error: blk.reason }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  const { credits } = parsed.data;

  const provider = activeProvider();
  if (!provider) return NextResponse.json({ error: "Pago no configurado" }, { status: 503 });

  const cfg = await getConfig();
  const amountCents = credits * cfg.rateCents;

  // Cobrar primero para obtener el providerRef (idempotencia); recién entonces persistir el Payment.
  let charge: { redirectUrl?: string; providerRef: string };
  try {
    charge = await provider.createCharge({
      amountCents,
      currency: "USD",
      ref: session.sub,
      metadata: { userId: session.sub, credits: String(credits) },
    });
  } catch (e) {
    if (e instanceof Error && e.message.includes("no configurado")) {
      return NextResponse.json({ error: "Pago no configurado" }, { status: 503 });
    }
    return NextResponse.json({ error: "No se pudo iniciar el pago" }, { status: 502 });
  }

  await prisma.payment.create({
    data: {
      userId: session.sub,
      provider: provider.name,
      providerRef: charge.providerRef,
      kind: "buy_credits",
      credits,
      amountCents,
      status: "pending",
    },
  });

  return NextResponse.json({ ok: true, redirectUrl: charge.redirectUrl });
}
