import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import RechargeForm from "@/components/RechargeForm";

export const dynamic = "force-dynamic";

export default async function RecargarPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, avatarUrl: true, balance: true } });
  if (!me) redirect("/login");
  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-xl font-semibold text-white">Recargar créditos</h1>
        <p className="text-sm text-white/50">Saldo actual: <b className="text-white">{me.balance} ☾</b></p>
        <RechargeForm />
      </div>
    </AppShell>
  );
}
