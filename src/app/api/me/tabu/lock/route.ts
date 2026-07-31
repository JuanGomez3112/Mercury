import { NextResponse } from "next/server";
import { clearTabuUnlock } from "@/lib/session";

export async function POST() {
  await clearTabuUnlock();
  return NextResponse.json({ ok: true });
}
