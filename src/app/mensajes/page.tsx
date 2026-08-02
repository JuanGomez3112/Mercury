import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getRecentChats } from "@/lib/queries";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import { timeAgo } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const viewer = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, avatarUrl: true },
  });
  if (!viewer) redirect("/login");

  const chats = await getRecentChats(session.sub, 50);

  return (
    <AppShell username={viewer.username} avatarUrl={viewer.avatarUrl}>
      <div>
        <h1 className="mb-4 text-xl font-semibold text-white">Mensajes</h1>
        <div className="rounded-2xl border border-white/10 bg-navy-2/50 max-sm:rounded-none max-sm:border-x-0">
          {chats.length === 0 ? (
            <p className="p-10 text-center text-sm text-white/40">Sin conversaciones todavía.</p>
          ) : (
            chats.map((c) => (
              <Link
                key={c.partner.username}
                href={`/mensajes/${c.partner.username}`}
                className="flex items-center gap-3 border-b border-white/5 p-4 transition last:border-0 hover:bg-white/5"
              >
                <Avatar src={c.partner.avatarUrl} className="h-12 w-12" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate font-medium text-white">{c.partner.displayName ?? c.partner.username}</span>
                    <span className="text-xs text-white/30">{timeAgo(c.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`block truncate text-sm ${c.unread > 0 ? "font-semibold text-white/90" : "text-white/50"}`}>
                      {c.mine && "Tú: "}
                      {c.body}
                    </span>
                    {c.unread > 0 && (
                      <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">
                        {c.unread}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
