import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import ModeToggle from "@/components/ModeToggle";
import LogoutButton from "@/components/LogoutButton";
import PasswordForm from "@/components/PasswordForm";
import TabuPinForm from "@/components/TabuPinForm";
import CreatorModeForm from "@/components/CreatorModeForm";
import AdminPinForm from "@/components/AdminPinForm";
import ProfileEditForm from "@/components/ProfileEditForm";

export const dynamic = "force-dynamic";

const card = "rounded-2xl border border-white/10 bg-navy-2/50 p-6 max-sm:rounded-none max-sm:border-x-0";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, displayName: true, bio: true, avatarUrl: true, email: true, mode: true, passwordHash: true, tabuPinHash: true, creatorMode: true, subPriceCredits: true, isAdmin: true, adminPinHash: true },
  });
  if (!me) redirect("/login");

  const mode = me.mode === "angel" || me.mode === "devil" ? me.mode : null;

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="space-y-4">
        <h1 className="px-4 text-xl font-semibold text-white sm:px-0">Ajustes</h1>

        {/* Perfil: nombre, foto, bio */}
        <section className={card}>
          <ProfileEditForm displayName={me.displayName ?? ""} bio={me.bio ?? ""} avatarUrl={me.avatarUrl} />
          <div className="mt-4 border-t border-white/10 pt-3 text-sm text-white/50">
            <span className="text-white/30">Usuario:</span> @{me.username}
            <span className="mx-2 text-white/20">·</span>
            <span className="text-white/30">Email:</span> {me.email ?? "—"}
          </div>
        </section>

        {/* Modo ángel / diablito */}
        <section className={card}>
          <ModeToggle initial={mode} />
        </section>

        {/* Modo creador */}
        <section className={card}>
          <CreatorModeForm initialMode={me.creatorMode} initialPrice={me.subPriceCredits} />
        </section>

        {/* Seguridad */}
        <section className={card}>
          <PasswordForm hasPassword={me.passwordHash !== null} />
        </section>

        <section className={card}>
          <TabuPinForm hasPin={me.tabuPinHash !== null} />
        </section>

        {me.isAdmin && (
          <section className={card}>
            <AdminPinForm hasPin={me.adminPinHash !== null} />
          </section>
        )}

        <section className={card}>
          <h2 className="mb-3 text-sm font-semibold text-white/70">Sesión</h2>
          <LogoutButton />
        </section>

        <p className="text-center text-xs text-white/30">
          Verificación de edad y privacidad — próximamente.
        </p>
      </div>
    </AppShell>
  );
}
