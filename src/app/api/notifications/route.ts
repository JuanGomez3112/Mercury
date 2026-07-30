import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getNotifications } from "@/lib/queries";

export async function GET() {
  const session = await currentUser();
  if (!session) return NextResponse.json({ notifications: [] });
  const notifications = await getNotifications(session.sub, 10);
  return NextResponse.json({ notifications });
}
