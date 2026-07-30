import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getRecentChats } from "@/lib/queries";

export async function GET() {
  const session = await currentUser();
  if (!session) return NextResponse.json({ chats: [] });
  const chats = await getRecentChats(session.sub, 8);
  return NextResponse.json({ chats });
}
