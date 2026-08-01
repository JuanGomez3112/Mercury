import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export default async function PedidosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, avatarUrl: true },
  });
  if (!me) redirect("/login");

  const orders = await prisma.order.findMany({
    where: { userId: session.sub },
    orderBy: { createdAt: "desc" },
  });

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="space-y-5">
        <h1 className="text-xl font-semibold text-white">Pedidos</h1>
        {orders.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-navy-2/50 p-8 text-center text-sm text-white/40">
            Aún no tienes pedidos.
          </p>
        ) : (
          <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-navy-2/50">
            {orders.map((o) => {
              const totalCredits = o.subtotalCredits + o.shippingCredits;
              const totalCents = o.subtotalCents + o.shippingCents;
              return (
                <Link
                  key={o.id}
                  href={`/pedidos/${o.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition hover:bg-white/5"
                >
                  <div>
                    <div className="text-sm text-white/80">Pedido #{o.id.slice(-8)}</div>
                    <div className="text-xs text-white/40">{o.createdAt.toLocaleDateString("es")}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-white/70">
                      {o.paymentMethod === "merycoin" ? `${totalCredits} ☾` : `$${(totalCents / 100).toFixed(2)}`}
                    </span>
                    <span className="rounded-full border border-white/10 bg-navy px-3 py-1 text-xs text-white/60">
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
