import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import LiveConsole from "@/components/LiveConsole";
import { getOrCreateMyStream } from "@/lib/live";

export const dynamic = "force-dynamic";

export default async function TransmitirPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, avatarUrl: true } });
  if (!me) redirect("/login");

  const stream = await getOrCreateMyStream(session.sub);
  const rtmpUrl = process.env.LIVE_RTMP_URL ?? "rtmp://192.168.1.106:1935";

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl} wide>
      <div className="mx-auto max-w-lg space-y-4">
        <Link href="/en-vivo" className="px-4 text-sm text-white/50 hover:text-white sm:px-0">‹ En vivo</Link>
        <h1 className="px-4 text-xl font-semibold text-white sm:px-0">Transmitir</h1>
        <LiveConsole username={me.username} streamKey={stream.streamKey} initialTitle={stream.title ?? ""} rtmpUrl={rtmpUrl} />
        {stream.isLive && (
          <p className="px-4 text-center text-sm text-emerald-400 sm:px-0">Estás en vivo · <Link href={`/en-vivo/${me.username}`} className="underline">ver tu transmisión</Link></p>
        )}
      </div>
    </AppShell>
  );
}
