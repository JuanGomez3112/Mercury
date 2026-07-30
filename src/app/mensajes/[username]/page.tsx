import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getThread } from "@/lib/queries";
import TopBar from "@/components/TopBar";
import Avatar from "@/components/Avatar";
import MessageComposer from "@/components/MessageComposer";
import { timeAgo } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { username } = await params;
  const [viewer, partner] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, avatarUrl: true } }),
    prisma.user.findUnique({ where: { username }, select: { id: true, username: true, displayName: true, avatarUrl: true } }),
  ]);
  if (!viewer || !partner) notFound();

  const messages = await getThread(session.sub, partner.id);

  return (
    <>
      <TopBar username={viewer.username} avatarUrl={viewer.avatarUrl} />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
        <div className="flex min-h-[70vh] flex-col rounded-2xl border border-white/10 bg-navy-2/50">
          {/* Cabecera */}
          <Link href={`/u/${partner.username}`} className="flex items-center gap-3 border-b border-white/10 p-4">
            <Avatar src={partner.avatarUrl} className="h-10 w-10" />
            <div>
              <div className="font-semibold text-white">{partner.displayName ?? partner.username}</div>
              <div className="text-xs text-white/40">@{partner.username}</div>
            </div>
          </Link>

          {/* Mensajes */}
          <div className="flex-1 space-y-2 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <p className="py-10 text-center text-sm text-white/40">
                No hay mensajes. Escribe el primero.
              </p>
            ) : (
              messages.map((m) => (
                <div key={m.id} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                      m.mine ? "bg-purple text-navy" : "bg-navy text-white"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
                    <span className={`mt-0.5 block text-[10px] ${m.mine ? "text-navy/60" : "text-white/40"}`}>
                      {timeAgo(m.createdAt)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <MessageComposer to={partner.username} />
        </div>
      </div>
    </>
  );
}
