import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import InstallCertButton from "@/components/InstallCertButton";
import LocationDiag from "@/components/LocationDiag";

export const dynamic = "force-dynamic";

export default async function ActivarUbicacionPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await prisma.user.findUnique({ where: { id: session.sub }, select: { username: true, avatarUrl: true } });
  if (!me) redirect("/login");

  const step = "rounded-2xl border border-white/10 bg-navy-2/50 p-5 max-sm:rounded-none max-sm:border-x-0";

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="mx-auto max-w-lg space-y-4">
        <div className="px-4 sm:px-0">
          <h1 className="text-xl font-semibold text-white">Activar ubicación</h1>
          <p className="mt-1 text-sm text-white/50">
            Para que Publicar y el Radar detecten dónde estás, tu navegador necesita confiar en Mercury. Se instala un certificado <b>una sola vez por dispositivo</b>.
          </p>
        </div>

        <section className={step}>
          <p className="mb-3 text-sm font-semibold text-white/80">Diagnóstico</p>
          <LocationDiag />
        </section>

        <section className={step}>
          <p className="mb-3 text-sm font-semibold text-white/80">Paso 1 · Descarga el certificado</p>
          <InstallCertButton className="w-full py-3 text-base" />
          <p className="mt-2 text-xs text-white/40">Se descarga desde el propio Mercury, sin avisos.</p>
        </section>

        <section className={step}>
          <p className="mb-3 text-sm font-semibold text-white/80">Paso 2 · Instálalo como de confianza</p>
          <ul className="space-y-2 text-sm text-white/70">
            <li><b className="text-white/85">Android:</b> normalmente salta a "Instalar certificado de CA" → confirma. Si no, Ajustes → Seguridad → Cifrado y credenciales → Instalar certificado → CA.</li>
            <li><b className="text-white/85">iPhone:</b> se descarga un perfil → Ajustes → <i>Perfil descargado</i> → Instalar. Luego Ajustes → General → Información → Ajustes de confianza del certificado → activa <b>Mercury Local CA</b>.</li>
            <li><b className="text-white/85">Windows:</b> doble clic en el archivo → Instalar → <b>Entidades de certificación raíz de confianza</b>.</li>
          </ul>
        </section>

        <section className={step}>
          <p className="mb-3 text-sm font-semibold text-white/80">Paso 3 · Vuelve y activa</p>
          <p className="text-sm text-white/70">Recarga la app. Ahora al abrir el Radar o tocar "Añadir mi ubicación" en Publicar, el navegador te pedirá permiso de ubicación.</p>
          <div className="mt-3 flex gap-2">
            <Link href="/radar" className="rounded-full bg-gradient-to-tl from-purple to-purple-soft px-4 py-2 text-sm font-semibold text-white">Ir al Radar</Link>
            <Link href="/publicar" className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/80">Ir a Publicar</Link>
          </div>
        </section>

        <p className="px-4 text-center text-xs text-white/30 sm:px-0">
          Cuando Mercury tenga un dominio propio, esto desaparece y no habrá que instalar nada.
        </p>
      </div>
    </AppShell>
  );
}
