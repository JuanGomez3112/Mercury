import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getUserPosts } from "@/lib/queries";
import AppHeader from "@/components/AppHeader";
import PostCard from "@/components/PostCard";
import FollowButton from "@/components/FollowButton";
import MercuryMark from "@/components/MercuryMark";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const { username } = await params;
  const profile = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      displayName: true,
      bio: true,
      _count: { select: { posts: true, followers: true, following: true } },
    },
  });
  if (!profile) notFound();

  const isMe = profile.id === session.sub;
  const following = isMe
    ? false
    : (await prisma.follow.findUnique({
        where: {
          followerId_followingId: { followerId: session.sub, followingId: profile.id },
        },
        select: { followerId: true },
      })) !== null;

  const posts = await getUserPosts(profile.id, session.sub);
  const name = profile.displayName ?? profile.username;

  return (
    <>
      <AppHeader username={session.username} />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
        <section className="rounded-2xl border border-white/10 bg-navy-2/50 p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy">
                <MercuryMark className="h-7 w-3.5" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-white">{name}</h1>
                <p className="text-sm text-white/50">@{profile.username}</p>
              </div>
            </div>
            {!isMe && <FollowButton username={profile.username} initialFollowing={following} />}
          </div>

          {profile.bio && <p className="mt-4 text-sm text-white/80">{profile.bio}</p>}

          <div className="mt-4 flex gap-5 text-sm text-white/60">
            <span><b className="text-white">{profile._count.posts}</b> posts</span>
            <span><b className="text-white">{profile._count.followers}</b> seguidores</span>
            <span><b className="text-white">{profile._count.following}</b> siguiendo</span>
          </div>
        </section>

        <div className="mt-6 space-y-4">
          {posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/50">
              Sin publicaciones todavía.
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
