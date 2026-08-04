import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import AppShell from "@/components/AppShell";
import PostComposer from "@/components/PostComposer";

export const dynamic = "force-dynamic";

/** Pantalla dedicada de publicación (cómoda, todas las opciones). Botón central del nav móvil. */
export default async function PublicarPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, displayName: true, avatarUrl: true, creatorMode: true },
  });
  if (!me) redirect("/login");

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-xl font-semibold text-white max-sm:px-4">Nueva publicación</h1>
        <PostComposer
          displayName={me.displayName ?? me.username}
          avatarUrl={me.avatarUrl}
          creatorMode={me.creatorMode}
          redirectTo="/feed"
        />
      </div>
    </AppShell>
  );
}
