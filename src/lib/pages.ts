import { prisma } from "./db";
import { slugify } from "./groups";

export type PageCard = {
  slug: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  followerCount: number;
  isFollowing: boolean;
};

export type PageDetail = PageCard & {
  id: string;
  coverUrl: string | null;
  isOwner: boolean;
};

/** Slug único reutilizando el generador de grupos (comparte espacio propio de Page). */
export async function uniquePageSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  for (let i = 0; i < 50; i++) {
    const exists = await prisma.page.findUnique({ where: { slug }, select: { id: true } });
    if (!exists) return slug;
    slug = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export async function getPages(viewerId: string): Promise<PageCard[]> {
  const pages = await prisma.page.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      slug: true,
      name: true,
      description: true,
      avatarUrl: true,
      _count: { select: { followers: true } },
      followers: { where: { userId: viewerId }, select: { id: true } },
    },
  });
  return pages.map((p) => ({
    slug: p.slug,
    name: p.name,
    description: p.description,
    avatarUrl: p.avatarUrl,
    followerCount: p._count.followers,
    isFollowing: p.followers.length > 0,
  }));
}

export async function getPageBySlug(slug: string, viewerId: string): Promise<PageDetail | null> {
  const p = await prisma.page.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      avatarUrl: true,
      coverUrl: true,
      ownerId: true,
      _count: { select: { followers: true } },
      followers: { where: { userId: viewerId }, select: { id: true } },
    },
  });
  if (!p) return null;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    avatarUrl: p.avatarUrl,
    coverUrl: p.coverUrl,
    followerCount: p._count.followers,
    isFollowing: p.followers.length > 0,
    isOwner: p.ownerId === viewerId,
  };
}
