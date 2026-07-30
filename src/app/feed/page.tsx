import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import MercuryMark from "@/components/MercuryMark";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, displayName: true, createdAt: true },
  });
  if (!user) redirect("/login");

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-navy/70 backdrop-blur">
        <nav className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/feed" className="flex items-center gap-2.5">
            <MercuryMark className="h-6 w-3" />
            <span className="text-lg font-semibold tracking-wide text-white">Mercury</span>
          </Link>
          <LogoutButton />
        </nav>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-7">
          <p className="text-sm text-purple-soft">Bienvenido</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">
            {user.displayName ?? user.username}
          </h1>
          <p className="mt-1 text-sm text-white/50">@{user.username}</p>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-white/15 p-10 text-center text-white/50">
          Tu feed aparecerá aquí.
          <br />
          <span className="text-sm">Publicaciones, contenido y comunidad — próximamente.</span>
        </div>
      </main>

      <footer className="border-t border-white/10 px-6 py-8 text-center text-xs text-white/40">
        Mercury · Comunidad 18+ · Esqueleto v0
      </footer>
    </>
  );
}
