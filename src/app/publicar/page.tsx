import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import PublishScreen from "@/components/PublishScreen";

export const dynamic = "force-dynamic";

/** Pantalla dedicada de publicación, a pantalla completa. Botón central del nav móvil. */
export default async function PublicarPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, displayName: true, avatarUrl: true, creatorMode: true },
  });
  if (!me) redirect("/login");

  return <PublishScreen displayName={me.displayName ?? me.username} avatarUrl={me.avatarUrl} creatorMode={me.creatorMode} />;
}
