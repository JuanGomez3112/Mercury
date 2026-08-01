import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { isAdminUnlocked } from "@/lib/session";
import AppShell from "@/components/AppShell";
import AdminUnlock from "@/components/AdminUnlock";
import ModerationQueue, { type ReportGroup } from "@/components/ModerationQueue";

export const dynamic = "force-dynamic";

export default async function ModeracionPage() {
  const admin = await requireAdmin();
  if (!admin) redirect("/");

  const me = await prisma.user.findUnique({
    where: { id: admin.id },
    select: { username: true, avatarUrl: true, adminPinHash: true },
  });
  if (!me) redirect("/");

  if (!(await isAdminUnlocked(admin.id))) {
    return (
      <AppShell username={me.username} avatarUrl={me.avatarUrl}>
        <AdminUnlock hasPin={me.adminPinHash !== null} />
      </AppShell>
    );
  }

  // Reportes pendientes: rojos (prioridad) al tope, luego más antiguos primero.
  const reports = await prisma.report.findMany({
    where: { status: "pending" },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    select: {
      id: true,
      targetType: true,
      targetId: true,
      reason: true,
      note: true,
      priority: true,
      createdAt: true,
      reporter: { select: { username: true } },
    },
  });

  // Agrupar por (targetType, targetId).
  const map = new Map<string, ReportGroup>();
  for (const r of reports) {
    const key = `${r.targetType}:${r.targetId}`;
    let g = map.get(key);
    if (!g) {
      g = {
        reportId: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        priority: r.priority,
        createdAt: r.createdAt.toISOString(),
        reports: [],
        preview: { exists: false },
      };
      map.set(key, g);
    }
    g.priority = g.priority || r.priority;
    g.reports.push({ reason: r.reason, note: r.note, reporter: r.reporter.username, at: r.createdAt.toISOString() });
  }
  const groups = [...map.values()];

  // Recolectar ids por tipo para previews en lote.
  const byType = (t: string) => groups.filter((g) => g.targetType === t).map((g) => g.targetId);
  const [posts, comments, messages, users] = await Promise.all([
    prisma.post.findMany({
      where: { id: { in: byType("post") } },
      select: { id: true, body: true, images: true, author: { select: { username: true } } },
    }),
    prisma.comment.findMany({
      where: { id: { in: byType("comment") } },
      select: { id: true, body: true, author: { select: { username: true } } },
    }),
    prisma.message.findMany({
      where: { id: { in: byType("message") } },
      select: { id: true, body: true, imageUrl: true, sender: { select: { username: true } } },
    }),
    prisma.user.findMany({
      where: { id: { in: byType("user") } },
      select: { id: true, username: true, displayName: true, banned: true, suspendedUntil: true },
    }),
  ]);
  const postMap = new Map(posts.map((p) => [p.id, p]));
  const commentMap = new Map(comments.map((c) => [c.id, c]));
  const msgMap = new Map(messages.map((m) => [m.id, m]));
  const userMap = new Map(users.map((u) => [u.id, u]));

  for (const g of groups) {
    if (g.targetType === "post") {
      const p = postMap.get(g.targetId);
      if (p) g.preview = { exists: true, text: p.body, image: p.images[0] ?? undefined, username: p.author.username };
    } else if (g.targetType === "comment") {
      const c = commentMap.get(g.targetId);
      if (c) g.preview = { exists: true, text: c.body, username: c.author.username };
    } else if (g.targetType === "message") {
      const m = msgMap.get(g.targetId);
      if (m) g.preview = { exists: true, text: m.body, image: m.imageUrl ?? undefined, username: m.sender.username };
    } else if (g.targetType === "user") {
      const u = userMap.get(g.targetId);
      if (u)
        g.preview = {
          exists: true,
          username: u.username,
          text: u.displayName ?? undefined,
          banned: u.banned,
          suspended: u.suspendedUntil ? u.suspendedUntil.toISOString() : undefined,
        };
    }
  }

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl} wide>
      <ModerationQueue groups={groups} />
    </AppShell>
  );
}
