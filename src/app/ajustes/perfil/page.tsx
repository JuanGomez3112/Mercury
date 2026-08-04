import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import ProfileEditForm from "@/components/ProfileEditForm";

export const dynamic = "force-dynamic";

export default async function AjustesPerfilPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, displayName: true, bio: true, avatarUrl: true, email: true },
  });
  if (!me) redirect("/login");

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="mx-auto max-w-lg space-y-4">
        <Link href="/ajustes" className="inline-flex items-center gap-1 px-4 text-sm text-white/50 hover:text-white sm:px-0">‹ Ajustes</Link>
        <h1 className="px-4 text-xl font-semibold text-white sm:px-0">Editar perfil</h1>
        <section className="rounded-2xl border border-white/10 bg-navy-2/50 p-6 max-sm:rounded-none max-sm:border-x-0">
          <ProfileEditForm displayName={me.displayName ?? ""} bio={me.bio ?? ""} avatarUrl={me.avatarUrl} />
          <div className="mt-4 border-t border-white/10 pt-3 text-sm text-white/50">
            <span className="text-white/30">Usuario:</span> @{me.username}
            <span className="mx-2 text-white/20">·</span>
            <span className="text-white/30">Email:</span> {me.email ?? "—"}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
