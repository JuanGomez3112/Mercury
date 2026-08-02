import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getFeedPostsByWhere } from "@/lib/queries";
import AppShell from "@/components/AppShell";
import PostCard from "@/components/PostCard";

export const dynamic = "force-dynamic";

/** Permalink de una publicación. Compartible (usado por "Copiar enlace"). */
export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;

  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, avatarUrl: true } });
  if (!me) redirect("/login");

  const posts = await getFeedPostsByWhere(session.sub, { id }, 1);
  const post = posts[0];
  if (!post) notFound();

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="mx-auto max-w-2xl">
        <PostCard post={post} viewerAvatarUrl={me.avatarUrl} />
      </div>
    </AppShell>
  );
}
