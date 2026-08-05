import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import HlsPlayer from "@/components/HlsPlayer";
import { getLiveByUsername } from "@/lib/live";

export const dynamic = "force-dynamic";

export default async function VerEnVivoPage({ params }: { params: Promise<{ username: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { username } = await params;
  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, avatarUrl: true } });
  if (!me) redirect("/login");

  const live = await getLiveByUsername(username);
  if (!live) notFound();

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl} wide flush>
      <div className="mx-auto max-w-2xl space-y-3">
        {live.isLive ? (
          <HlsPlayer src={`/hls/${username}/index.m3u8`} />
        ) : (
          <div className="flex aspect-video items-center justify-center rounded-2xl bg-navy-2 text-white/50 max-sm:rounded-none">
            {live.displayName ?? live.username} no está en vivo ahora.
          </div>
        )}
        <div className="flex items-center gap-3 px-4 sm:px-0">
          <Link href={`/u/${live.username}`}><Avatar src={live.avatarUrl} className="h-11 w-11 ring-2 ring-purple/40" /></Link>
          <div className="min-w-0">
            <p className="truncate font-semibold text-white">{live.title || "Transmisión en vivo"}</p>
            <Link href={`/u/${live.username}`} className="truncate text-sm text-white/50 hover:underline">{live.displayName ?? live.username}</Link>
          </div>
          {live.isLive && <span className="ml-auto rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">● EN VIVO</span>}
        </div>
      </div>
    </AppShell>
  );
}
