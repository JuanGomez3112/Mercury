import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import PasswordForm from "@/components/PasswordForm";
import TabuPinForm from "@/components/TabuPinForm";
import AdminPinForm from "@/components/AdminPinForm";

export const dynamic = "force-dynamic";

const card = "rounded-2xl border border-white/10 bg-navy-2/50 p-6 max-sm:rounded-none max-sm:border-x-0";

export default async function AjustesSeguridadPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, avatarUrl: true, passwordHash: true, tabuPinHash: true, isAdmin: true, adminPinHash: true },
  });
  if (!me) redirect("/login");

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="mx-auto max-w-lg space-y-4">
        <Link href="/ajustes" className="inline-flex items-center gap-1 px-4 text-sm text-white/50 hover:text-white sm:px-0">‹ Ajustes</Link>
        <h1 className="px-4 text-xl font-semibold text-white sm:px-0">Seguridad</h1>
        <section className={card}><PasswordForm hasPassword={me.passwordHash !== null} /></section>
        <section className={card}><TabuPinForm hasPin={me.tabuPinHash !== null} /></section>
        {me.isAdmin && <section className={card}><AdminPinForm hasPin={me.adminPinHash !== null} /></section>}
      </div>
    </AppShell>
  );
}
