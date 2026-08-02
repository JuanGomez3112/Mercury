import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import SendCreditsForm from "@/components/SendCreditsForm";
import WithdrawForm from "@/components/WithdrawForm";
import { getConfig } from "@/lib/token";
import { timeAgo } from "@/lib/time";

export const dynamic = "force-dynamic";

const label: Record<string, string> = {
  welcome: "Bienvenida", topup: "Recarga", purchase: "Compra", sale: "Venta",
  tip_out: "Propina enviada", tip_in: "Propina recibida", sub_out: "Suscripción", sub_in: "Suscriptor",
  transfer_out: "Enviado", transfer_in: "Recibido", store_purchase: "Compra tienda", withdraw: "Retiro", withdraw_refund: "Retiro reembolsado",
};

export default async function CarteraPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, avatarUrl: true, balance: true, earnings: true } });
  if (!me) redirect("/login");
  const cfg = await getConfig();
  const tx = await prisma.walletTransaction.findMany({ where: { userId: session.sub }, orderBy: { createdAt: "desc" }, take: 100 });

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-navy-2/50 max-sm:rounded-none max-sm:border-x-0 p-8 text-center">
            <p className="text-sm text-white/50">Gastable</p>
            <p className="my-1 text-4xl font-bold text-white">{me.balance} ☾</p>
            <Link href="/recargar" className="mt-2 inline-block rounded-xl bg-gradient-to-tl from-purple to-purple-soft px-5 py-2.5 text-sm font-semibold text-white">Recargar</Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-navy-2/50 max-sm:rounded-none max-sm:border-x-0 p-8 text-center">
            <p className="text-sm text-white/50">Ganancias</p>
            <p className="my-1 text-4xl font-bold text-white">{me.earnings} ☾</p>
            <p className="text-xs text-white/40">≈ ${((me.earnings * cfg.rateCents) / 100).toFixed(2)}</p>
            <WithdrawForm max={me.earnings} launched={cfg.launched} rateCents={cfg.rateCents} />
          </div>
        </div>
        <SendCreditsForm />
        <div className="rounded-2xl border border-white/10 bg-navy-2/50 max-sm:rounded-none max-sm:border-x-0">
          <h2 className="border-b border-white/10 p-4 text-sm font-semibold text-white/70">Historial</h2>
          {tx.length === 0 ? (
            <p className="p-8 text-center text-sm text-white/40">Sin movimientos.</p>
          ) : tx.map((t) => (
            <div key={t.id} className="flex items-center justify-between border-b border-white/5 px-4 py-3 last:border-0">
              <div>
                <div className="text-sm text-white/80">{label[t.type] ?? t.type}</div>
                <div className="text-xs text-white/40">{timeAgo(t.createdAt)}</div>
              </div>
              <div className={`text-sm font-semibold ${t.delta >= 0 ? "text-emerald-400" : "text-white/60"}`}>{t.delta >= 0 ? "+" : ""}{t.delta} ☾</div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
