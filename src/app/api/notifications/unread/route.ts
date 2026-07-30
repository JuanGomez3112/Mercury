import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getUnreadNotifCount } from "@/lib/queries";

export async function GET() {
  const session = await currentUser();
  if (!session) return NextResponse.json({ count: 0 });
  const count = await getUnreadNotifCount(session.sub);
  return NextResponse.json({ count });
}
