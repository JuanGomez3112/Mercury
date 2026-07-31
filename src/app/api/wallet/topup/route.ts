import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { topup } from "@/lib/wallet";

const schema = z.object({ amount: z.number().int().min(1).max(100000) });

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Monto inválido" }, { status: 400 });
  await topup(session.sub, parsed.data.amount);
  return NextResponse.json({ ok: true });
}
