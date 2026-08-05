import { prisma } from "./db";

export type GroupCard = {
  slug: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  isPrivate: boolean;
  memberCount: number;
  isMember: boolean;
};

export type GroupDetail = GroupCard & {
  id: string;
  isOwner: boolean;
};

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "grupo";
}

/** Genera un slug único (añade sufijo si choca). */
export async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  for (let i = 0; i < 50; i++) {
    const exists = await prisma.group.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) return slug;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function getGroups(viewerId: string): Promise<GroupCard[]> {
  const groups = await prisma.group.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      slug: true,
      name: true,
      description: true,
      coverUrl: true,
      isPrivate: true,
      _count: { select: { members: true } },
      members: { where: { userId: viewerId }, select: { id: true } },
    },
  });
  return groups.map((g) => ({
    slug: g.slug,
    name: g.name,
    description: g.description,
    coverUrl: g.coverUrl,
    isPrivate: g.isPrivate,
    memberCount: g._count.members,
    isMember: g.members.length > 0,
  }));
}

export async function getGroupBySlug(slug: string, viewerId: string): Promise<GroupDetail | null> {
  const g = await prisma.group.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      coverUrl: true,
      isPrivate: true,
      ownerId: true,
      _count: { select: { members: true } },
      members: { where: { userId: viewerId }, select: { id: true } },
    },
  });
  if (!g) return null;
  return {
    id: g.id,
    slug: g.slug,
    name: g.name,
    description: g.description,
    coverUrl: g.coverUrl,
    isPrivate: g.isPrivate,
    memberCount: g._count.members,
    isMember: g.members.length > 0,
    isOwner: g.ownerId === viewerId,
  };
}
