import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import ModeToggle from "@/components/ModeToggle";
import LogoutButton from "@/components/LogoutButton";
import PasswordForm from "@/components/PasswordForm";
import TabuPinForm from "@/components/TabuPinForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, displayName: true, avatarUrl: true, email: true, mode: true, passwordHash: true, tabuPinHash: true },
  });
  if (!me) redirect("/login");

  const mode = me.mode === "angel" || me.mode === "devil" ? me.mode : null;

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-white">Ajustes</h1>

        <section className="rounded-2xl border border-white/10 bg-navy-2/50 p-6">
          <h2 className="mb-3 text-sm font-semibold text-white/70">Cuenta</h2>
          <div className="space-y-1 text-sm text-white/70">
            <div><span className="text-white/40">Nombre:</span> {me.displayName ?? "—"}</div>
            <div><span className="text-white/40">Usuario:</span> @{me.username}</div>
            <div><span className="text-white/40">Email:</span> {me.email ?? "—"}</div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-navy-2/50 p-6">
          <ModeToggle initial={mode} />
        </section>

        <section className="rounded-2xl border border-white/10 bg-navy-2/50 p-6">
          <h2 className="mb-3 text-sm font-semibold text-white/70">Sesión</h2>
          <LogoutButton />
        </section>

        <section className="rounded-2xl border border-white/10 bg-navy-2/50 p-6">
          <PasswordForm hasPassword={me.passwordHash !== null} />
        </section>

        <section className="rounded-2xl border border-white/10 bg-navy-2/50 p-6">
          <TabuPinForm hasPin={me.tabuPinHash !== null} />
        </section>

        <p className="text-center text-xs text-white/30">
          Verificación de edad y privacidad — próximamente.
        </p>
      </div>
    </AppShell>
  );
}
