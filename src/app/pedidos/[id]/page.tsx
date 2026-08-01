import { redirect, notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import AppShell from "@/components/AppShell";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  paid: "Pagado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

const TIMELINE_STEPS: { key: string; label: string }[] = [
  { key: "pending", label: "Pendiente" },
  { key: "paid", label: "Pagado" },
  { key: "shipped", label: "Enviado" },
  { key: "delivered", label: "Entregado" },
];

export default async function PedidoDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, avatarUrl: true },
  });
  if (!me) redirect("/login");

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!order) notFound();

  if (order.userId !== session.sub) {
    const admin = await requireAdmin();
    if (!admin) notFound();
  }

  const totalCredits = order.subtotalCredits + order.shippingCredits;
  const totalCents = order.subtotalCents + order.shippingCents;
  const stepIndex = TIMELINE_STEPS.findIndex((s) => s.key === order.status);

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-white">Pedido #{order.id.slice(-8)}</h1>
          <span className="rounded-full border border-white/10 bg-navy px-3 py-1 text-xs text-white/60">
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>

        {order.status === "cancelled" ? (
          <p className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
            Este pedido fue cancelado.
          </p>
        ) : (
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-navy-2/50 p-4">
            {TIMELINE_STEPS.map((s, i) => (
              <div key={s.key} className="flex flex-1 items-center gap-2">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`h-3 w-3 rounded-full ${
                      i <= stepIndex ? "bg-purple" : "bg-white/15"
                    }`}
                  />
                  <span className={`text-[11px] ${i <= stepIndex ? "text-white/80" : "text-white/30"}`}>{s.label}</span>
                </div>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div className={`h-px flex-1 ${i < stepIndex ? "bg-purple" : "bg-white/15"}`} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-white/70">Envío</h2>
          <div className="space-y-0.5 text-sm text-white/70">
            <p>{order.shipName}</p>
            <p>{order.shipLine1}</p>
            {order.shipLine2 && <p>{order.shipLine2}</p>}
            <p>
              {order.shipCity}
              {order.shipState ? `, ${order.shipState}` : ""} {order.shipZip ?? ""}
            </p>
            <p>{order.shipCountry}</p>
            {order.shipPhone && <p>{order.shipPhone}</p>}
          </div>
        </div>

        <div className="divide-y divide-white/5 rounded-2xl border border-white/10 bg-navy-2/50">
          {order.items.map((it) => (
            <div key={it.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div>
                <div className="text-sm text-white/80">{it.nameSnapshot}</div>
                <div className="text-xs text-white/40">
                  {it.labelSnapshot} · x{it.qty}
                </div>
              </div>
              <span className="text-sm text-white/70">
                {order.paymentMethod === "merycoin"
                  ? `${it.priceCreditsSnapshot * it.qty} ☾`
                  : `$${((it.priceCentsSnapshot * it.qty) / 100).toFixed(2)}`}
              </span>
            </div>
          ))}
        </div>

        <div className="space-y-1 rounded-2xl border border-white/10 bg-navy-2/50 p-4 text-sm">
          <div className="flex justify-between text-white/60">
            <span>Subtotal</span>
            <span>
              {order.paymentMethod === "merycoin" ? `${order.subtotalCredits} ☾` : `$${(order.subtotalCents / 100).toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between text-white/60">
            <span>Envío</span>
            <span>
              {order.paymentMethod === "merycoin" ? `${order.shippingCredits} ☾` : `$${(order.shippingCents / 100).toFixed(2)}`}
            </span>
          </div>
          <div className="flex justify-between border-t border-white/10 pt-2 font-semibold text-white">
            <span>Total</span>
            <span>{order.paymentMethod === "merycoin" ? `${totalCredits} ☾` : `$${(totalCents / 100).toFixed(2)}`}</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
