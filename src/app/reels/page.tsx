import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import { IconReels } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function ReelsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, avatarUrl: true },
  });
  if (!me) redirect("/login");

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tl from-purple to-purple-soft text-white">
          <IconReels className="text-[26px]" />
        </span>
        <h1 className="text-xl font-semibold text-white">Reels</h1>
        <p className="max-w-xs text-sm text-white/50">
          Video corto en pantalla completa. Muy pronto podrás crear y descubrir reels aquí.
        </p>
        <span className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/40">Próximamente</span>
      </div>
    </AppShell>
  );
}
