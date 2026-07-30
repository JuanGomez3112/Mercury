import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/session";
import { exchangeCode, fetchGoogleUser, uniqueUsername } from "@/lib/google";

export async function GET(req: Request) {
  const appUrl = process.env.APP_URL ?? "";
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const jar = await cookies();
  const saved = jar.get("oauth_state")?.value;
  jar.delete("oauth_state");

  if (!code || !state || !saved || state !== saved) {
    return NextResponse.redirect(`${appUrl}/login?error=oauth`);
  }

  try {
    const tokens = await exchangeCode(code);
    const gu = await fetchGoogleUser(tokens.access_token);
    if (!gu.sub) throw new Error("sin sub");

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: gu.sub }, ...(gu.email ? [{ email: gu.email }] : [])],
      },
    });

    if (!user) {
      const username = await uniqueUsername(gu.email ?? gu.name ?? "user");
      user = await prisma.user.create({
        data: {
          googleId: gu.sub,
          email: gu.email,
          username,
          displayName: gu.name ?? username,
          avatarUrl: gu.picture,
          ageVerified: false,
        },
      });
    } else if (!user.googleId) {
      // enlaza cuenta existente (mismo email) con Google
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: gu.sub, avatarUrl: user.avatarUrl ?? gu.picture },
      });
    }

    await createSession({ sub: user.id, username: user.username });
    return NextResponse.redirect(`${appUrl}/feed`);
  } catch {
    return NextResponse.redirect(`${appUrl}/login?error=oauth`);
  }
}
