import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { getFeedByTab, type FeedTab } from "@/lib/queries";

export async function GET(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const t = url.searchParams.get("tab");
  const tab: FeedTab = t === "feed" || t === "tabu" ? t : "explora";

  const posts = await getFeedByTab(session.sub, tab);
  return NextResponse.json({ posts });
}
