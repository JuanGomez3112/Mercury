import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getConfig } from "@/lib/token";
import { activeProvider } from "@/lib/payments";
import AppShell from "@/components/AppShell";
import RechargeForm from "@/components/RechargeForm";
import BuyCreditsForm from "@/components/BuyCreditsForm";

export const dynamic = "force-dynamic";

export default async function RecargarPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, avatarUrl: true, balance: true } });
  if (!me) redirect("/login");
  const cfg = await getConfig();
  const cryptoEnabled = activeProvider() !== null && !!process.env.BTCPAY_STORE_ID;
  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="mx-auto max-w-md space-y-4">
        <h1 className="text-xl font-semibold text-white max-sm:px-4">Recargar créditos</h1>
        <p className="text-sm text-white/50">Saldo actual: <b className="text-white">{me.balance} ☾</b></p>
        {cryptoEnabled && <BuyCreditsForm rateCents={cfg.rateCents} />}
        <RechargeForm />
      </div>
    </AppShell>
  );
}
