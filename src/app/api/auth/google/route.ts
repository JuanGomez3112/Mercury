import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";
import { googleAuthUrl, googleConfigured } from "@/lib/google";

export async function GET(req: Request) {
  const base = process.env.APP_URL || new URL(req.url).origin;

  if (!googleConfigured()) {
    return NextResponse.redirect(`${base}/login?error=oauth_config`);
  }

  const state = randomBytes(16).toString("hex");
  const jar = await cookies();
  jar.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "1",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(googleAuthUrl(state));
}
