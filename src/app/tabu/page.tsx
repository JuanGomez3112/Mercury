import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import MatchDeck from "@/components/MatchDeck";
import { getCandidates, getMatches } from "@/lib/match";

export const dynamic = "force-dynamic";

export default async function TabuPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, avatarUrl: true },
  });
  if (!me) redirect("/login");

  const [candidates, matches] = await Promise.all([
    getCandidates(session.sub),
    getMatches(session.sub),
  ]);

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl} wide>
      <div className="space-y-4">
        <div className="px-4 sm:px-0">
          <h1 className="text-xl font-semibold text-white">Tabú</h1>
          <p className="text-sm text-white/40">Desliza para descubrir gente. Si ambos se gustan, ¡es un match!</p>
        </div>
        <MatchDeck initial={candidates} matches={matches} />
      </div>
    </AppShell>
  );
}
