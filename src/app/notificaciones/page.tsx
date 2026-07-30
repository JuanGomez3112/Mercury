import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getNotifications } from "@/lib/queries";
import TopBar from "@/components/TopBar";
import Avatar from "@/components/Avatar";
import { timeAgo } from "@/lib/time";

export const dynamic = "force-dynamic";

const verb: Record<string, string> = {
  like: "le dio me gusta a tu publicación",
  comment: "comentó tu publicación",
  follow: "empezó a seguirte",
};

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const viewer = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, avatarUrl: true },
  });
  if (!viewer) redirect("/login");

  const notifs = await getNotifications(session.sub, 50);
  // marca todas como leídas al abrir
  await prisma.notification.updateMany({
    where: { userId: session.sub, readAt: null },
    data: { readAt: new Date() },
  });

  return (
    <>
      <TopBar username={viewer.username} avatarUrl={viewer.avatarUrl} />
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        <h1 className="mb-4 text-xl font-semibold text-white">Notificaciones</h1>
        <div className="rounded-2xl border border-white/10 bg-navy-2/50">
          {notifs.length === 0 ? (
            <p className="p-10 text-center text-sm text-white/40">Sin notificaciones.</p>
          ) : (
            notifs.map((n) => (
              <Link
                key={n.id}
                href={`/u/${n.actor.username}`}
                className={`flex items-center gap-3 border-b border-white/5 p-4 transition last:border-0 hover:bg-white/5 ${
                  n.readAt ? "" : "bg-purple/5"
                }`}
              >
                <Avatar src={n.actor.avatarUrl} className="h-11 w-11" />
                <div className="min-w-0 flex-1 text-sm text-white/80">
                  <span className="font-semibold text-white">{n.actor.displayName ?? n.actor.username}</span>{" "}
                  {verb[n.type] ?? "interactuó contigo"}
                  <div className="text-xs text-white/40">{timeAgo(n.createdAt)}</div>
                </div>
                {!n.readAt && <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" />}
              </Link>
            ))
          )}
        </div>
      </div>
    </>
  );
}
