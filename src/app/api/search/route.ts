import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { searchAll, type SearchType } from "@/lib/search";

const TYPES: SearchType[] = ["all", "users", "posts", "tags", "tabu", "reels"];

export async function GET(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const typeParam = url.searchParams.get("type") ?? "all";
  const type: SearchType = (TYPES as string[]).includes(typeParam) ? (typeParam as SearchType) : "all";

  const result = await searchAll(session.sub, q, type);
  return NextResponse.json(result);
}
