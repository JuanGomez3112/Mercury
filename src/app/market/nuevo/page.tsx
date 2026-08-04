import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import NewListingForm from "@/components/NewListingForm";

export const dynamic = "force-dynamic";

export default async function NuevoAnuncioPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, avatarUrl: true } });
  if (!me) redirect("/login");

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="mx-auto max-w-2xl space-y-4 max-sm:px-4">
        <h1 className="text-xl font-semibold text-white">Nuevo anuncio</h1>
        <NewListingForm />
        <p className="text-xs text-white/40">
          Vender está permitido según la política de la plataforma. El pago en efectivo lo negocian y liquidan comprador y vendedor por su cuenta;
          Mercury no es parte del trato ni responsable de él.
        </p>
      </div>
    </AppShell>
  );
}
