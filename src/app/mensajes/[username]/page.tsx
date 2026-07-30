import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getThread } from "@/lib/queries";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import ChatThread from "@/components/ChatThread";

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

  // marca leídos al abrir
  await prisma.message.updateMany({
    where: { senderId: partner.id, recipientId: session.sub, readAt: null },
    data: { readAt: new Date() },
  });
  const messages = await getThread(session.sub, partner.id);

  return (
    <AppShell username={viewer.username} avatarUrl={viewer.avatarUrl}>
      <div className="flex min-h-[70vh] flex-col rounded-2xl border border-white/10 bg-navy-2/50">
          {/* Cabecera */}
          <Link href={`/u/${partner.username}`} className="flex items-center gap-3 border-b border-white/10 p-4">
            <Avatar src={partner.avatarUrl} className="h-10 w-10" />
            <div>
              <div className="font-semibold text-white">{partner.displayName ?? partner.username}</div>
              <div className="text-xs text-white/40">@{partner.username}</div>
            </div>
          </Link>

          {/* Mensajes (tiempo real) */}
          <ChatThread partner={partner.username} initial={messages} />
      </div>
    </AppShell>
  );
}
