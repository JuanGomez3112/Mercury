import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getFeed } from "@/lib/queries";
import AppHeader from "@/components/AppHeader";
import PostComposer from "@/components/PostComposer";
import PostCard from "@/components/PostCard";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { id: true, username: true },
  });
  if (!user) redirect("/login");

  const posts = await getFeed(user.id);

  return (
    <>
      <AppHeader username={user.username} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
        <PostComposer />

        <div className="mt-6 space-y-4">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/50">
              Tu feed está vacío.
              <br />
              <span className="text-sm">
                Publica algo o sigue a otras personas para ver contenido.
              </span>
            </div>
          ) : (
            posts.map((p) => <PostCard key={p.id} post={p} />)
          )}
        </div>
      </main>
      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-white/40">
        Mercury · Comunidad 18+ · Esqueleto v0
      </footer>
    </>
  );
}
