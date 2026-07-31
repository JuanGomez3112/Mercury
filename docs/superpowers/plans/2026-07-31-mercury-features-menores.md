# Mercury — Features Menores Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Añadir cambio de contraseña, guardados, búsqueda (usuarios/posts/tags con chips), gate Tabú por clave y video en posts al Mercury existente, sin romper lo desplegado.

**Architecture:** Cada pieza es una unidad aislada: endpoint(s) en `src/app/api/**`, lógica en `src/lib/**`, UI en `src/components/**` y páginas en `src/app/**`. Se reutilizan patrones ya presentes: toggle estilo `posts/[id]/like`, cookies firmadas `jose` de `lib/session`, formularios client estilo `ModeToggle`, shaping de posts en `lib/queries`. Storage de media sigue en `Post.images[]` (MinIO), tipo detectado por extensión.

**Tech Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Prisma **6** · PostgreSQL · MinIO (`@aws-sdk/client-s3`) · bcryptjs · jose · zod · Font Awesome self-hosted.

## Global Constraints

- **Prisma 6, NO 7** — no tocar `datasource`/`generator`; migraciones vía `prisma db push` (no `migrate`), como el resto del repo.
- **Cookies** httpOnly firmadas con `AUTH_SECRET` (patrón `lib/session.ts`), `sameSite:"lax"`, `secure: process.env.COOKIE_SECURE === "1"`, `path:"/"`.
- **Iconos Font Awesome** se dimensionan por font-size (`text-[Npx]`), no `h-/w-` (usar `!h-6 !w-6` solo si hay que forzar cuadrado). Degradado morado = `fill="url(#mercuryGrad)"` (def global en `layout.tsx`).
- **Paleta oscura:** fondo `bg-navy`, superficies `bg-navy-2`, acento `text-purple`/`bg-purple`, adulto `orange-500`. Clases utilitarias ya definidas en `globals.css`/tema.
- **Validación** con `zod` en `src/lib/validation.ts`. Contraseña mínimo **8**; clave Tabú mínimo **4**.
- **Sin framework de tests** en el repo. Verificación por tarea = `npx tsc --noEmit` (tipos) + `npm run lint` cuando toque + `curl` contra `npm run dev` (localhost:3000) para APIs + chequeo manual UI. Build final `npm run build` antes de cada deploy.
- **Deploy** por pieza: `ssh proxmox "pct exec 106 -- /usr/local/bin/mercury-deploy"` (git pull + npm ci + prisma db push + build + restart). No lo ejecuta el agente sin confirmación del usuario.
- **Media:** `Post.images[]` guarda fotos y videos mezclados; cap total **10**; foto ≤10MB, video ≤50MB; tipos video `video/mp4`, `video/webm`.

---

## File Structure

**Crear:**
- `src/app/api/me/password/route.ts` — cambio/establecer contraseña
- `src/components/PasswordForm.tsx` — form client en /ajustes
- `src/app/api/posts/[id]/bookmark/route.ts` — toggle guardado
- `src/components/BookmarkButton.tsx` — botón guardar (barra de acciones del post)
- `src/app/guardados/page.tsx` — página de guardados
- `src/lib/search.ts` — lógica de búsqueda (users/posts/tags)
- `src/app/api/search/route.ts` — endpoint de búsqueda
- `src/components/SearchBar.tsx` — buscador del TopBar (revelar al clic + dropdown)
- `src/components/SearchFilters.tsx` — chips de filtro
- `src/app/buscar/page.tsx` — página de resultados
- `src/app/api/me/tabu/pin/route.ts` — configurar clave Tabú
- `src/app/api/me/tabu/unlock/route.ts` — desbloquear (setea cookie)
- `src/app/api/me/tabu/lock/route.ts` — bloquear (borra cookie)
- `src/components/TabuPinForm.tsx` — configurar clave en /ajustes
- `src/components/TabuGate.tsx` — modal de desbloqueo + wrapper blur + lock en background

**Modificar:**
- `src/lib/validation.ts` — schemas `changePasswordSchema`, `tabuPinSchema`
- `src/lib/session.ts` — helpers `setTabuUnlock`/`clearTabuUnlock`/`isTabuUnlocked`
- `src/lib/queries.ts` — incluir `savedByMe`; nueva `getSavedPosts`
- `src/lib/types.ts` — `FeedPost.savedByMe`
- `src/lib/s3.ts` — `extFor` acepta video
- `src/app/api/upload/route.ts` — límite por tipo (video 50MB)
- `src/components/PostCard.tsx` — usar `BookmarkButton`
- `src/components/PostComposer.tsx` — botones Foto/Video separados + preview mixta
- `src/components/PostMedia.tsx` — render de video (tile + single + lightbox)
- `src/components/TopBar.tsx` — montar `SearchBar`
- `src/components/ProfileMenu.tsx` — link "Guardados" → `/guardados`
- `src/app/ajustes/page.tsx` — montar `PasswordForm` + `TabuPinForm`
- `src/app/feed/page.tsx` — envolver Tabú con gate cuando `tab==="tabu"`
- `prisma/schema.prisma` — modelo `Bookmark`, campo `User.tabuPinHash`, relaciones

---

# FEATURE 1 — Cambio de contraseña

### Task 1.1: Endpoint de contraseña

**Files:**
- Modify: `src/lib/validation.ts`
- Create: `src/app/api/me/password/route.ts`

**Interfaces:**
- Produces: `changePasswordSchema` (zod); `POST /api/me/password` body `{ current?, next, confirm }` → `{ ok:true }` | `{ error }` 400/401.

- [ ] **Step 1: Añadir schema en `src/lib/validation.ts`** (al final del archivo)

```ts
export const changePasswordSchema = z
  .object({
    current: z.string().optional().default(""),
    next: z.string().min(8, "Mínimo 8 caracteres").max(200),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, {
    message: "Las contraseñas no coinciden",
    path: ["confirm"],
  });
```

- [ ] **Step 2: Crear `src/app/api/me/password/route.ts`**

```ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { changePasswordSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const json = await req.json().catch(() => null);
  const parsed = changePasswordSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { current, next } = parsed.data;

  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { passwordHash: true },
  });
  if (!user) return NextResponse.json({ error: "No existe" }, { status: 404 });

  // Si ya tiene contraseña, exigir la actual y verificarla.
  if (user.passwordHash) {
    if (!current) return NextResponse.json({ error: "Contraseña actual requerida" }, { status: 400 });
    const ok = await bcrypt.compare(current, user.passwordHash);
    if (!ok) return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(next, 10);
  await prisma.user.update({ where: { id: session.sub }, data: { passwordHash } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Probar contra dev** (con `npm run dev` corriendo y sesión de `gomez` en cookie, o vía navegador después). Sin sesión debe dar 401:

Run: `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/me/password -H "Content-Type: application/json" -d '{"next":"corta","confirm":"corta"}'`
Expected: `401` (sin cookie de sesión).

- [ ] **Step 5: Commit**

```bash
git add src/lib/validation.ts src/app/api/me/password/route.ts
git commit -m "feat(auth): endpoint cambio/establecer contraseña"
```

### Task 1.2: Form de contraseña en Ajustes

**Files:**
- Create: `src/components/PasswordForm.tsx`
- Modify: `src/app/ajustes/page.tsx`

**Interfaces:**
- Consumes: `POST /api/me/password`.
- Produces: `<PasswordForm hasPassword={boolean} />`.

- [ ] **Step 1: Crear `src/components/PasswordForm.tsx`**

```tsx
"use client";

import { useState } from "react";

export default function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/me/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next, confirm }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg({ ok: true, text: hasPassword ? "Contraseña actualizada" : "Contraseña establecida" });
      setCurrent(""); setNext(""); setConfirm("");
    } else {
      setMsg({ ok: false, text: d.error ?? "Error" });
    }
  }

  const input = "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple";

  return (
    <form onSubmit={submit} className="space-y-3">
      <h2 className="text-sm font-semibold text-white/70">
        {hasPassword ? "Cambiar contraseña" : "Establecer contraseña"}
      </h2>
      {hasPassword && (
        <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Contraseña actual" className={input} autoComplete="current-password" />
      )}
      <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Nueva contraseña (mín. 8)" className={input} autoComplete="new-password" />
      <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmar nueva contraseña" className={input} autoComplete="new-password" />
      <button type="submit" disabled={busy} className="rounded-xl bg-gradient-to-tl from-purple to-purple-soft px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "Guardando…" : "Guardar"}
      </button>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
    </form>
  );
}
```

- [ ] **Step 2: Montar en `src/app/ajustes/page.tsx`** — añadir `passwordHash` al select, derivar `hasPassword`, y reemplazar la nota "Cambio de contraseña … próximamente" por una sección con el form.

Cambiar el select:
```ts
  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, displayName: true, avatarUrl: true, email: true, mode: true, passwordHash: true },
  });
```
Añadir import: `import PasswordForm from "@/components/PasswordForm";`
Reemplazar el `<p>` final por:
```tsx
        <section className="rounded-2xl border border-white/10 bg-navy-2/50 p-6">
          <PasswordForm hasPassword={me.passwordHash !== null} />
        </section>

        <p className="text-center text-xs text-white/30">
          Verificación de edad y privacidad — próximamente.
        </p>
```
(No pasar `passwordHash` al cliente; solo el booleano derivado.)

- [ ] **Step 3: Verificar tipos + build**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

- [ ] **Step 4: Chequeo manual** — en `/ajustes` (logueado como `gomez`): cambiar contraseña con actual correcta → "Contraseña actualizada"; con actual incorrecta → error. Volver a dejar una contraseña conocida.

- [ ] **Step 5: Commit**

```bash
git add src/components/PasswordForm.tsx src/app/ajustes/page.tsx
git commit -m "feat(auth): UI cambio de contraseña en ajustes"
```

---

# FEATURE 2 — Guardados (bookmarks)

### Task 2.1: Modelo Bookmark

**Files:**
- Modify: `prisma/schema.prisma`

**Interfaces:**
- Produces: modelo `Bookmark` con `@@id([userId, postId])`; relaciones `User.bookmarks`, `Post.bookmarks`.

- [ ] **Step 1: Añadir modelo y relaciones en `prisma/schema.prisma`**

En `model User { … }` añadir a las relaciones:
```prisma
  bookmarks Bookmark[]
```
En `model Post { … }` añadir:
```prisma
  bookmarks Bookmark[]
```
Al final del archivo, nuevo modelo:
```prisma
model Bookmark {
  userId    String
  postId    String
  createdAt DateTime @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@id([userId, postId])
  @@index([postId])
}
```

- [ ] **Step 2: Regenerar cliente + empujar schema (local)**

Run: `npx prisma db push`
Expected: "Your database is now in sync" + `prisma generate` OK.

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(db): modelo Bookmark"
```

### Task 2.2: Endpoint toggle bookmark

**Files:**
- Create: `src/app/api/posts/[id]/bookmark/route.ts`

**Interfaces:**
- Produces: `POST /api/posts/:id/bookmark` → `{ ok:true, saved:boolean }`.

- [ ] **Step 1: Crear `src/app/api/posts/[id]/bookmark/route.ts`** (calca patrón de `like/route.ts`)

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";

// POST /api/posts/:id/bookmark — toggle guardado
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { id: postId } = await params;
  const key = { userId_postId: { userId: session.sub, postId } };

  const post = await prisma.post.findUnique({ where: { id: postId }, select: { id: true } });
  if (!post) return NextResponse.json({ error: "No existe" }, { status: 404 });

  const existing = await prisma.bookmark.findUnique({ where: key });
  if (existing) {
    await prisma.bookmark.delete({ where: key });
  } else {
    await prisma.bookmark.create({ data: { userId: session.sub, postId } });
  }
  return NextResponse.json({ ok: true, saved: !existing });
}
```

- [ ] **Step 2: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Probar 401 sin sesión**

Run: `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/posts/x/bookmark`
Expected: `401`.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/posts/\[id\]/bookmark/route.ts
git commit -m "feat(posts): endpoint toggle bookmark"
```

### Task 2.3: `savedByMe` en queries + BookmarkButton en PostCard

**Files:**
- Modify: `src/lib/types.ts`, `src/lib/queries.ts`, `src/components/PostCard.tsx`
- Create: `src/components/BookmarkButton.tsx`

**Interfaces:**
- Consumes: `POST /api/posts/:id/bookmark`.
- Produces: `FeedPost.savedByMe:boolean`; `<BookmarkButton postId initialSaved />`.

- [ ] **Step 1: Añadir `savedByMe` al tipo** en `src/lib/types.ts` dentro de `FeedPost` (tras `isMine`):

```ts
  isMine: boolean;
  savedByMe: boolean;
```

- [ ] **Step 2: Incluir bookmark del viewer en `src/lib/queries.ts`**

En el tipo `Row`, añadir:
```ts
  bookmarks: { userId: string }[];
```
En `include`, añadir la relación filtrada:
```ts
const include = (viewerId: string) => ({
  author: { select: { username: true, displayName: true, avatarUrl: true } },
  _count: { select: { likes: true, comments: true } },
  likes: { where: { userId: viewerId }, select: { userId: true } },
  bookmarks: { where: { userId: viewerId }, select: { userId: true } },
});
```
En `toFeedPost`, añadir el campo:
```ts
    isMine: p.authorId === viewerId,
    savedByMe: p.bookmarks.length > 0,
```

- [ ] **Step 3: Crear `src/components/BookmarkButton.tsx`**

```tsx
"use client";

import { useState } from "react";
import { IconBookmark } from "./icons";

export default function BookmarkButton({ postId, initialSaved }: { postId: string; initialSaved: boolean }) {
  const [saved, setSaved] = useState(initialSaved);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    setSaved((v) => !v);
    const res = await fetch(`/api/posts/${postId}/bookmark`, { method: "POST" });
    setBusy(false);
    if (res.ok) {
      const d = await res.json();
      setSaved(d.saved);
    } else {
      setSaved((v) => !v); // revertir
    }
  }

  return (
    <button
      onClick={toggle}
      className={`ml-auto transition ${saved ? "text-purple" : "hover:text-white"}`}
      aria-label={saved ? "Quitar de guardados" : "Guardar"}
      aria-pressed={saved}
    >
      <IconBookmark className="text-[28px]" />
    </button>
  );
}
```

- [ ] **Step 4: Usar el botón en `src/components/PostCard.tsx`** — reemplazar el botón bookmark inerte de la barra de acciones.

Añadir import: `import BookmarkButton from "./BookmarkButton";`
Reemplazar:
```tsx
        <button className="ml-auto transition hover:text-white" aria-label="Guardar">
          <IconBookmark className="text-[28px]" />
        </button>
```
por:
```tsx
        <BookmarkButton postId={post.id} initialSaved={post.savedByMe} />
```
(Si `IconBookmark` queda sin uso en PostCard, quitarlo del import para no romper lint.)

- [ ] **Step 5: Verificar tipos + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

- [ ] **Step 6: Chequeo manual** — en `/feed`, clic en el bookmark de un post lo marca morado; recargar mantiene el estado.

- [ ] **Step 7: Commit**

```bash
git add src/lib/types.ts src/lib/queries.ts src/components/BookmarkButton.tsx src/components/PostCard.tsx
git commit -m "feat(posts): guardar posts (savedByMe + BookmarkButton)"
```

### Task 2.4: Página /guardados + link del menú

**Files:**
- Modify: `src/lib/queries.ts`, `src/components/ProfileMenu.tsx`
- Create: `src/app/guardados/page.tsx`

**Interfaces:**
- Produces: `getSavedPosts(viewerId): Promise<FeedPost[]>`; ruta `/guardados`.

- [ ] **Step 1: Añadir `getSavedPosts` en `src/lib/queries.ts`** (tras `getUserPosts`)

```ts
/** Posts guardados por el viewer, más recientes primero. */
export async function getSavedPosts(viewerId: string): Promise<FeedPost[]> {
  const rows = await prisma.bookmark.findMany({
    where: { userId: viewerId },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { post: { include: include(viewerId) } },
  });
  return rows.map((b) => toFeedPost(b.post as Row, viewerId));
}
```

- [ ] **Step 2: Crear `src/app/guardados/page.tsx`**

```tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getSavedPosts } from "@/lib/queries";
import AppShell from "@/components/AppShell";
import PostCard from "@/components/PostCard";

export const dynamic = "force-dynamic";

export default async function GuardadosPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, avatarUrl: true },
  });
  if (!me) redirect("/login");

  const posts = await getSavedPosts(session.sub);

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-white">Guardados</h1>
        {posts.length === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-navy-2/50 p-8 text-center text-sm text-white/40">
            Aún no guardas nada. Toca el marcador en un post para guardarlo.
          </p>
        ) : (
          <div className="space-y-6">
            {posts.map((p) => (
              <PostCard key={p.id} post={p} viewerAvatarUrl={me.avatarUrl} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
```

- [ ] **Step 3: Corregir link "Guardados" en `src/components/ProfileMenu.tsx`** — apunta a `/mensajes` por error.

Reemplazar:
```tsx
          <Link href="/mensajes" onClick={() => setOpen(false)} className={item}>
            <IconBookmark className="h-4 w-4" /> Guardados
          </Link>
```
por:
```tsx
          <Link href="/guardados" onClick={() => setOpen(false)} className={item}>
            <IconBookmark className="h-4 w-4" /> Guardados
          </Link>
```

- [ ] **Step 4: Verificar tipos + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

- [ ] **Step 5: Chequeo manual** — menú de perfil → Guardados abre `/guardados`; muestra los posts guardados o el estado vacío.

- [ ] **Step 6: Commit + (opcional) deploy pieza 2**

```bash
git add src/lib/queries.ts src/app/guardados/page.tsx src/components/ProfileMenu.tsx
git commit -m "feat(posts): página /guardados y link en menú de perfil"
```

---

# FEATURE 3 — Búsqueda (usuarios + posts + tags) con chips

### Task 3.1: Lógica de búsqueda

**Files:**
- Create: `src/lib/search.ts`

**Interfaces:**
- Produces:
  - `type SearchType = "all" | "users" | "posts" | "tags" | "tabu" | "reels";`
  - `type UserHit = { username: string; displayName: string | null; avatarUrl: string | null; mode: string | null };`
  - `type TagHit = { tag: string; count: number };`
  - `type SearchResult = { users: UserHit[]; posts: FeedPost[]; tags: TagHit[] };`
  - `searchAll(viewerId: string, q: string, type: SearchType): Promise<SearchResult>`

- [ ] **Step 1: Crear `src/lib/search.ts`**

```ts
import { prisma } from "./db";
import type { FeedPost } from "./types";
import { getFeedPostsByWhere } from "./queries";

export type SearchType = "all" | "users" | "posts" | "tags" | "tabu" | "reels";
export type UserHit = { username: string; displayName: string | null; avatarUrl: string | null; mode: string | null };
export type TagHit = { tag: string; count: number };
export type SearchResult = { users: UserHit[]; posts: FeedPost[]; tags: TagHit[] };

const VIDEO_RE = /\.(mp4|webm)(\?|$)/i;

export async function searchAll(viewerId: string, qRaw: string, type: SearchType): Promise<SearchResult> {
  const q = qRaw.trim();
  const empty: SearchResult = { users: [], posts: [], tags: [] };
  if (!q) return empty;

  const wantUsers = type === "all" || type === "users";
  const wantPosts = type === "all" || type === "posts" || type === "tabu" || type === "reels";
  const wantTags = type === "all" || type === "tags";

  const users: UserHit[] = wantUsers
    ? await prisma.user.findMany({
        where: {
          OR: [
            { username: { contains: q, mode: "insensitive" } },
            { displayName: { contains: q, mode: "insensitive" } },
          ],
        },
        take: 10,
        select: { username: true, displayName: true, avatarUrl: true, mode: true },
      })
    : [];

  let posts: FeedPost[] = [];
  if (wantPosts) {
    const bodyWhere = { body: { contains: q.replace(/^#/, ""), mode: "insensitive" as const } };
    const where =
      type === "tabu"
        ? { ...bodyWhere, isAdult: true }
        : bodyWhere;
    posts = await getFeedPostsByWhere(viewerId, where, 20);
    if (type === "reels") posts = posts.filter((p) => p.images.some((u) => VIDEO_RE.test(u)));
  }

  let tags: TagHit[] = [];
  if (wantTags) {
    const needle = q.replace(/^#/, "").toLowerCase();
    const recent = await prisma.post.findMany({
      where: { body: { contains: `#${needle}`, mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { body: true },
    });
    const counts = new Map<string, number>();
    for (const p of recent) {
      const found = p.body.match(/#[\p{L}0-9_]+/gu) ?? [];
      for (const t of found) {
        const k = t.toLowerCase();
        if (k.includes(needle)) counts.set(k, (counts.get(k) ?? 0) + 1);
      }
    }
    tags = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
  }

  return { users, posts, tags };
}
```

- [ ] **Step 2: Exponer `getFeedPostsByWhere` en `src/lib/queries.ts`** — refactor pequeño para reutilizar el shaping.

Añadir función exportada (usa el `include`/`toFeedPost` ya existentes; `PostWhere` = tipo del filtro):
```ts
import type { Prisma } from "@prisma/client";

/** Posts por filtro arbitrario, shaping FeedPost. Reutilizado por búsqueda. */
export async function getFeedPostsByWhere(
  viewerId: string,
  where: Prisma.PostWhereInput,
  take = 20,
): Promise<FeedPost[]> {
  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take,
    include: include(viewerId),
  });
  return posts.map((p) => toFeedPost(p as Row, viewerId));
}
```

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/lib/search.ts src/lib/queries.ts
git commit -m "feat(search): lógica de búsqueda usuarios/posts/tags"
```

### Task 3.2: Endpoint /api/search

**Files:**
- Create: `src/app/api/search/route.ts`

**Interfaces:**
- Consumes: `searchAll`.
- Produces: `GET /api/search?q=&type=` → `SearchResult` JSON.

- [ ] **Step 1: Crear `src/app/api/search/route.ts`**

```ts
import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { searchAll, type SearchType } from "@/lib/search";

const TYPES: SearchType[] = ["all", "users", "posts", "tags", "tabu", "reels"];

export async function GET(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const q = url.searchParams.get("q") ?? "";
  const typeParam = url.searchParams.get("type") ?? "all";
  const type: SearchType = (TYPES as string[]).includes(typeParam) ? (typeParam as SearchType) : "all";

  const result = await searchAll(session.sub, q, type);
  return NextResponse.json(result);
}
```

- [ ] **Step 2: Verificar tipos + probar 401**

Run: `npx tsc --noEmit && curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/search?q=a"`
Expected: tipos OK; `401` sin sesión.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/search/route.ts
git commit -m "feat(search): endpoint /api/search"
```

### Task 3.3: SearchBar en TopBar (revelar al clic)

**Files:**
- Create: `src/components/SearchBar.tsx`
- Modify: `src/components/TopBar.tsx`

**Interfaces:**
- Consumes: `GET /api/search`.
- Produces: `<SearchBar />` (autónomo).

- [ ] **Step 1: Crear `src/components/SearchBar.tsx`** (oculto por defecto; el ícono lo revela; Enter navega a `/buscar`)

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import { useOutside } from "@/lib/useOutside";
import { IconSearch } from "./icons";
import type { SearchResult } from "@/lib/search";

export default function SearchBar() {
  const router = useRouter();
  const [openInput, setOpenInput] = useState(false);
  const [q, setQ] = useState("");
  const [res, setRes] = useState<SearchResult | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useOutside(ref, () => { if (!q) setOpenInput(false); setRes(null); }, openInput);

  // Debounce
  useEffect(() => {
    if (!q.trim()) { setRes(null); return; }
    const t = setTimeout(async () => {
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (r.ok) setRes(await r.json());
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  function reveal() {
    setOpenInput(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }
  function go(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) router.push(`/buscar?q=${encodeURIComponent(q.trim())}`);
    setRes(null);
  }

  if (!openInput) {
    return (
      <button
        onClick={reveal}
        aria-label="Buscar"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-navy transition hover:brightness-95"
      >
        <IconSearch className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <form onSubmit={go} className="flex h-9 items-center gap-2 rounded-full bg-white px-3 text-navy">
        <IconSearch className="h-4 w-4 opacity-60" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Escape" && !q) setOpenInput(false); }}
          placeholder="Buscar en Mercury"
          className="w-56 bg-transparent text-sm outline-none placeholder:text-navy/40"
        />
      </form>

      {res && (q.trim().length > 0) && (
        <div className="absolute right-0 top-full z-50 mt-2 max-h-96 w-80 overflow-y-auto rounded-2xl border border-white/10 bg-navy-2 py-2 shadow-2xl">
          {res.users.length === 0 && res.posts.length === 0 && res.tags.length === 0 && (
            <p className="px-4 py-3 text-sm text-white/40">Sin resultados</p>
          )}
          {res.users.length > 0 && (
            <div className="py-1">
              <p className="px-4 pb-1 text-xs font-semibold uppercase text-white/30">Personas</p>
              {res.users.map((u) => (
                <Link key={u.username} href={`/u/${u.username}`} onClick={() => setRes(null)} className="flex items-center gap-3 px-4 py-2 hover:bg-white/5">
                  <Avatar src={u.avatarUrl} className="h-8 w-8" />
                  <span className="text-sm text-white">{u.displayName ?? u.username} <span className="text-white/40">@{u.username}</span></span>
                </Link>
              ))}
            </div>
          )}
          {res.tags.length > 0 && (
            <div className="py-1">
              <p className="px-4 pb-1 text-xs font-semibold uppercase text-white/30">Hashtags</p>
              {res.tags.map((t) => (
                <Link key={t.tag} href={`/buscar?q=${encodeURIComponent(t.tag)}&type=tags`} onClick={() => setRes(null)} className="flex items-center justify-between px-4 py-2 hover:bg-white/5">
                  <span className="text-sm text-purple">{t.tag}</span>
                  <span className="text-xs text-white/30">{t.count}</span>
                </Link>
              ))}
            </div>
          )}
          {q.trim() && (
            <Link href={`/buscar?q=${encodeURIComponent(q.trim())}`} onClick={() => setRes(null)} className="mt-1 block border-t border-white/10 px-4 py-2.5 text-sm text-purple hover:bg-white/5">
              Ver todos los resultados
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Montar en `src/components/TopBar.tsx`** — reemplazar el `<button aria-label="Buscar">…</button>` por `<SearchBar />`.

Añadir import: `import SearchBar from "./SearchBar";`
Reemplazar todo el bloque:
```tsx
          <button
            aria-label="Buscar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-navy transition hover:brightness-95"
          >
            <IconSearch className="h-4 w-4" />
          </button>
```
por:
```tsx
          <SearchBar />
```
(Si `IconSearch` queda sin uso en TopBar, quitarlo del import.)

- [ ] **Step 3: Verificar tipos + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

- [ ] **Step 4: Chequeo manual** — en `/feed`, clic en la lupa revela el input con foco; teclear muestra dropdown (personas/hashtags); Escape con input vacío lo colapsa; Enter va a `/buscar?q=`.

- [ ] **Step 5: Commit**

```bash
git add src/components/SearchBar.tsx src/components/TopBar.tsx
git commit -m "feat(search): buscador en TopBar (revelar al clic + dropdown)"
```

### Task 3.4: Página /buscar + chips de filtro

**Files:**
- Create: `src/components/SearchFilters.tsx`, `src/app/buscar/page.tsx`

**Interfaces:**
- Consumes: `searchAll`, `SearchType`.
- Produces: ruta `/buscar?q=&type=`.

- [ ] **Step 1: Crear `src/components/SearchFilters.tsx`** (chips; futuros deshabilitados)

```tsx
"use client";

import { useRouter } from "next/navigation";

const CHIPS: { key: string; label: string; enabled: boolean }[] = [
  { key: "all", label: "Todo", enabled: true },
  { key: "users", label: "Personas", enabled: true },
  { key: "posts", label: "Post", enabled: true },
  { key: "tags", label: "Hashtag", enabled: true },
  { key: "tabu", label: "Tabú", enabled: true },
  { key: "reels", label: "Reels", enabled: true },
  { key: "paginas", label: "Páginas", enabled: false },
  { key: "grupos", label: "Grupos", enabled: false },
];

export default function SearchFilters({ q, active }: { q: string; active: string }) {
  const router = useRouter();
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      {CHIPS.map((c) => {
        const isActive = c.key === active;
        if (!c.enabled) {
          return (
            <span key={c.key} className="shrink-0 cursor-not-allowed rounded-full border border-white/5 px-4 py-1.5 text-sm text-white/25" title="Pronto">
              {c.label} <span className="text-[10px]">pronto</span>
            </span>
          );
        }
        return (
          <button
            key={c.key}
            onClick={() => router.push(`/buscar?q=${encodeURIComponent(q)}&type=${c.key}`)}
            className={`shrink-0 rounded-full border px-4 py-1.5 text-sm transition ${
              isActive ? "border-purple bg-purple/15 text-white" : "border-white/10 text-white/60 hover:text-white"
            }`}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Crear `src/app/buscar/page.tsx`**

```tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { searchAll, type SearchType } from "@/lib/search";
import AppShell from "@/components/AppShell";
import Avatar from "@/components/Avatar";
import PostCard from "@/components/PostCard";
import SearchFilters from "@/components/SearchFilters";

export const dynamic = "force-dynamic";

const TYPES = ["all", "users", "posts", "tags", "tabu", "reels"];

export default async function BuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; type?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  const me = await prisma.user.findUnique({
    where: { id: session.sub },
    select: { username: true, avatarUrl: true },
  });
  if (!me) redirect("/login");

  const { q: qParam, type: typeParam } = await searchParams;
  const q = (qParam ?? "").trim();
  const type: SearchType = (TYPES.includes(typeParam ?? "") ? typeParam : "all") as SearchType;

  const { users, posts, tags } = await searchAll(session.sub, q, type);

  return (
    <AppShell username={me.username} avatarUrl={me.avatarUrl}>
      <div className="space-y-5">
        <h1 className="text-xl font-semibold text-white">
          {q ? <>Resultados para <span className="text-purple">{q}</span></> : "Buscar"}
        </h1>
        <SearchFilters q={q} active={type} />

        {!q && <p className="text-sm text-white/40">Escribe algo para buscar.</p>}

        {q && (type === "all" || type === "users") && users.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white/50">Personas</h2>
            {users.map((u) => (
              <Link key={u.username} href={`/u/${u.username}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-navy-2/50 p-3 hover:border-purple/30">
                <Avatar src={u.avatarUrl} className="h-11 w-11" />
                <div>
                  <div className="text-sm font-semibold text-white">{u.displayName ?? u.username}</div>
                  <div className="text-xs text-white/40">@{u.username}</div>
                </div>
              </Link>
            ))}
          </section>
        )}

        {q && (type === "all" || type === "tags") && tags.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-sm font-semibold text-white/50">Hashtags</h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <Link key={t.tag} href={`/buscar?q=${encodeURIComponent(t.tag)}&type=posts`} className="rounded-full border border-white/10 bg-navy-2/50 px-4 py-1.5 text-sm text-purple hover:border-purple/30">
                  {t.tag} <span className="text-white/30">{t.count}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {q && (type === "all" || type === "posts" || type === "tabu" || type === "reels") && posts.length > 0 && (
          <section className="space-y-4">
            <h2 className="text-sm font-semibold text-white/50">Publicaciones</h2>
            {posts.map((p) => (
              <PostCard key={p.id} post={p} viewerAvatarUrl={me.avatarUrl} fireLike={p.isAdult} />
            ))}
          </section>
        )}

        {q && users.length === 0 && posts.length === 0 && tags.length === 0 && (
          <p className="text-sm text-white/40">Sin resultados.</p>
        )}
      </div>
    </AppShell>
  );
}
```

> Nota Tabú en búsqueda: los posts adultos que salgan aquí se difuminan con el gate de la Feature 4 (el wrapper de blur se aplica en `PostMedia`/`PostCard` según `isAdult` + estado de desbloqueo — ver Task 4.4). En esta tarea se listan normal; la Feature 4 añade el blur.

- [ ] **Step 3: Verificar tipos + lint + build**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

- [ ] **Step 4: Chequeo manual** — `/buscar?q=<algo>` muestra secciones; chips cambian `type`; Páginas/Grupos salen en gris "pronto"; Reels filtra posts con video (tras Feature 5).

- [ ] **Step 5: Commit + (opcional) deploy pieza 3**

```bash
git add src/components/SearchFilters.tsx src/app/buscar/page.tsx
git commit -m "feat(search): página /buscar con chips de filtro"
```

---

# FEATURE 4 — Tabú Gate (clave)

### Task 4.1: Campo tabuPinHash + endpoint clave + form en ajustes

**Files:**
- Modify: `prisma/schema.prisma`, `src/lib/validation.ts`, `src/app/ajustes/page.tsx`
- Create: `src/app/api/me/tabu/pin/route.ts`, `src/components/TabuPinForm.tsx`

**Interfaces:**
- Produces: `User.tabuPinHash`; `tabuPinSchema`; `POST /api/me/tabu/pin`; `<TabuPinForm hasPin />`.

- [ ] **Step 1: Añadir campo en `prisma/schema.prisma`** dentro de `model User` (junto a los opcionales):

```prisma
  tabuPinHash  String?
```

- [ ] **Step 2: Empujar schema**

Run: `npx prisma db push`
Expected: sync OK.

- [ ] **Step 3: Schema zod en `src/lib/validation.ts`**

```ts
export const tabuPinSchema = z
  .object({
    current: z.string().optional().default(""),
    next: z.string().min(4, "Mínimo 4 caracteres").max(64),
    confirm: z.string(),
  })
  .refine((d) => d.next === d.confirm, { message: "No coinciden", path: ["confirm"] });
```

- [ ] **Step 4: Crear `src/app/api/me/tabu/pin/route.ts`**

```ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { tabuPinSchema } from "@/lib/validation";

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const parsed = tabuPinSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Datos inválidos" }, { status: 400 });
  }
  const { current, next } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { tabuPinHash: true } });
  if (!user) return NextResponse.json({ error: "No existe" }, { status: 404 });

  if (user.tabuPinHash) {
    if (!current) return NextResponse.json({ error: "Clave actual requerida" }, { status: 400 });
    const ok = await bcrypt.compare(current, user.tabuPinHash);
    if (!ok) return NextResponse.json({ error: "Clave actual incorrecta" }, { status: 400 });
  }

  const tabuPinHash = await bcrypt.hash(next, 10);
  await prisma.user.update({ where: { id: session.sub }, data: { tabuPinHash } });
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 5: Crear `src/components/TabuPinForm.tsx`** (idéntico patrón a PasswordForm, textos Tabú)

```tsx
"use client";

import { useState } from "react";

export default function TabuPinForm({ hasPin }: { hasPin: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setMsg(null);
    const res = await fetch("/api/me/tabu/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current, next, confirm }),
    });
    setBusy(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) { setMsg({ ok: true, text: hasPin ? "Clave actualizada" : "Clave creada" }); setCurrent(""); setNext(""); setConfirm(""); }
    else setMsg({ ok: false, text: d.error ?? "Error" });
  }

  const input = "w-full rounded-xl border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple";

  return (
    <form onSubmit={submit} className="space-y-3">
      <h2 className="text-sm font-semibold text-white/70">🔥 Clave Tabú (desbloquea contenido adulto)</h2>
      {hasPin && <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder="Clave actual" className={input} />}
      <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder="Nueva clave (mín. 4)" className={input} />
      <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirmar clave" className={input} />
      <button type="submit" disabled={busy} className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {busy ? "Guardando…" : "Guardar clave"}
      </button>
      {msg && <p className={`text-sm ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}
    </form>
  );
}
```

- [ ] **Step 6: Montar en `src/app/ajustes/page.tsx`** — añadir `tabuPinHash` al select e insertar sección.

En el select añadir `tabuPinHash: true`. Import: `import TabuPinForm from "@/components/TabuPinForm";`. Añadir sección tras la de contraseña:
```tsx
        <section className="rounded-2xl border border-white/10 bg-navy-2/50 p-6">
          <TabuPinForm hasPin={me.tabuPinHash !== null} />
        </section>
```

- [ ] **Step 7: Verificar tipos + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma src/lib/validation.ts src/app/api/me/tabu/pin/route.ts src/components/TabuPinForm.tsx src/app/ajustes/page.tsx
git commit -m "feat(tabu): clave Tabú (campo, endpoint, form en ajustes)"
```

### Task 4.2: Cookie de desbloqueo (helpers + endpoints unlock/lock)

**Files:**
- Modify: `src/lib/session.ts`
- Create: `src/app/api/me/tabu/unlock/route.ts`, `src/app/api/me/tabu/lock/route.ts`

**Interfaces:**
- Produces:
  - `setTabuUnlock(userId: string): Promise<void>` (cookie de sesión, sin maxAge)
  - `clearTabuUnlock(): Promise<void>`
  - `isTabuUnlocked(userId: string): Promise<boolean>`
  - `POST /api/me/tabu/unlock` body `{ pin }` → `{ ok:true }` | 400/401
  - `POST /api/me/tabu/lock` → `{ ok:true }`

- [ ] **Step 1: Añadir helpers en `src/lib/session.ts`** (usan `secret()` ya definido)

```ts
const TABU_COOKIE = "mercury_tabu";

export async function setTabuUnlock(userId: string) {
  const token = await new SignJWT({ sub: userId, tabu: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h") // tope de seguridad; el re-bloqueo real es por background/close
    .sign(secret());
  const jar = await cookies();
  jar.set(TABU_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.COOKIE_SECURE === "1",
    path: "/",
    // sin maxAge → cookie de sesión: muere al cerrar el navegador/app
  });
}

export async function clearTabuUnlock() {
  const jar = await cookies();
  jar.delete(TABU_COOKIE);
}

export async function isTabuUnlocked(userId: string): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(TABU_COOKIE)?.value;
  if (!token) return false;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.tabu === true && String(payload.sub) === userId;
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: Crear `src/app/api/me/tabu/unlock/route.ts`**

```ts
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { currentUser } from "@/lib/auth";
import { setTabuUnlock } from "@/lib/session";

export async function POST(req: Request) {
  const session = await currentUser();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const pin = typeof body?.pin === "string" ? body.pin : "";

  const user = await prisma.user.findUnique({ where: { id: session.sub }, select: { tabuPinHash: true } });
  if (!user?.tabuPinHash) return NextResponse.json({ error: "Sin clave configurada", needsPin: true }, { status: 400 });

  const ok = await bcrypt.compare(pin, user.tabuPinHash);
  if (!ok) return NextResponse.json({ error: "Clave incorrecta" }, { status: 400 });

  await setTabuUnlock(session.sub);
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Crear `src/app/api/me/tabu/lock/route.ts`**

```ts
import { NextResponse } from "next/server";
import { clearTabuUnlock } from "@/lib/session";

export async function POST() {
  await clearTabuUnlock();
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 4: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git add src/lib/session.ts src/app/api/me/tabu/unlock/route.ts src/app/api/me/tabu/lock/route.ts
git commit -m "feat(tabu): cookie de desbloqueo + endpoints unlock/lock"
```

### Task 4.3: Modal TabuGate + lock en background

**Files:**
- Create: `src/components/TabuGate.tsx`

**Interfaces:**
- Consumes: `POST /api/me/tabu/unlock`, `POST /api/me/tabu/lock`.
- Produces: `<TabuGate hasPin={boolean} />` — modal a pantalla completa; al desbloquear hace `router.refresh()`; escucha `visibilitychange` para bloquear en background.

- [ ] **Step 1: Crear `src/components/TabuGate.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function TabuGate({ hasPin }: { hasPin: boolean }) {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Re-bloquear al ir a segundo plano.
  useEffect(() => {
    function onVis() {
      if (document.hidden) {
        navigator.sendBeacon?.("/api/me/tabu/lock") ||
          fetch("/api/me/tabu/lock", { method: "POST", keepalive: true });
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    const res = await fetch("/api/me/tabu/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    setBusy(false);
    if (res.ok) { setPin(""); router.refresh(); }
    else { const d = await res.json().catch(() => ({})); setError(d.error ?? "Error"); }
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-navy/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-3xl border border-orange-500/30 bg-navy-2 p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-orange-500/15 text-2xl">🔥</div>
        <h2 className="text-lg font-semibold text-white">Contenido Tabú</h2>
        {hasPin ? (
          <>
            <p className="mt-1 text-sm text-white/50">Introduce tu clave para desbloquear.</p>
            <form onSubmit={unlock} className="mt-5 space-y-3">
              <input
                type="password"
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Clave Tabú"
                className="w-full rounded-xl border border-white/10 bg-navy px-4 py-3 text-center text-white outline-none focus:border-orange-500"
              />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <button type="submit" disabled={busy} className="w-full rounded-xl bg-orange-500 py-3 text-sm font-semibold text-white disabled:opacity-50">
                {busy ? "Verificando…" : "Desbloquear"}
              </button>
            </form>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-white/50">Aún no configuraste una clave Tabú.</p>
            <a href="/ajustes" className="mt-5 inline-block rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white">
              Crear clave en Ajustes
            </a>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verificar tipos + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/TabuGate.tsx
git commit -m "feat(tabu): modal de desbloqueo + lock en background"
```

### Task 4.4: Integrar gate en feed Tabú y en búsqueda

**Files:**
- Modify: `src/app/feed/page.tsx`, `src/app/buscar/page.tsx`

**Interfaces:**
- Consumes: `isTabuUnlocked`, `<TabuGate />`.

- [ ] **Step 1: Gate en `src/app/feed/page.tsx`** — cuando `tab==="tabu"` y no está desbloqueado, mostrar el modal encima (los posts quedan detrás con blur del propio modal).

Añadir imports:
```ts
import { getSession, isTabuUnlocked } from "@/lib/session";
import TabuGate from "@/components/TabuGate";
```
Tras derivar `tab` y cargar `me`, calcular:
```ts
  const tabuLocked = tab === "tabu" ? !(await isTabuUnlocked(me.id)) : false;
  const hasPin = tab === "tabu"
    ? (await prisma.user.findUnique({ where: { id: me.id }, select: { tabuPinHash: true } }))!.tabuPinHash !== null
    : false;
```
Al final del `return`, antes de cerrar el fragmento `</>`, añadir:
```tsx
      {tabuLocked && <TabuGate hasPin={hasPin} />}
```

- [ ] **Step 2: Gate en `src/app/buscar/page.tsx`** — si hay resultados marcados adultos y el usuario no está desbloqueado, mostrar el modal cuando `type==="tabu"`, o difuminar los posts adultos en `type==="all"/"posts"`.

Estrategia mínima y consistente con el feed: cuando `type === "tabu"` y no desbloqueado → renderizar `<TabuGate />` encima (igual que el feed). Para `all`/`posts`, los posts adultos se listan pero con blur.

Añadir imports:
```ts
import { getSession, isTabuUnlocked } from "@/lib/session";
import TabuGate from "@/components/TabuGate";
```
Calcular:
```ts
  const unlocked = await isTabuUnlocked(session.sub);
  const hasPin = (await prisma.user.findUnique({ where: { id: session.sub }, select: { tabuPinHash: true } }))!.tabuPinHash !== null;
```
Envolver los posts adultos con blur cuando `!unlocked`: en el `.map` de "Publicaciones" cambiar a:
```tsx
            {posts.map((p) => (
              <div key={p.id} className={p.isAdult && !unlocked ? "pointer-events-none blur-md" : ""}>
                <PostCard post={p} viewerAvatarUrl={me.avatarUrl} fireLike={p.isAdult} />
              </div>
            ))}
```
Y al final del contenedor, si `type==="tabu" && !unlocked`:
```tsx
        {type === "tabu" && !unlocked && <TabuGate hasPin={hasPin} />}
```

- [ ] **Step 3: Verificar tipos + lint + build**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: build OK.

- [ ] **Step 4: Chequeo manual** — (1) configurar clave en /ajustes; (2) ir a `/feed?tab=tabu` → aparece modal; clave correcta desbloquea y muestra posts; (3) mandar pestaña a segundo plano y volver → vuelve a pedir clave; (4) navegar de Tabú a Explora y volver sin backgrounding → sigue desbloqueado; (5) usuario sin clave → modal ofrece "Crear clave en Ajustes".

- [ ] **Step 5: Commit + (opcional) deploy pieza 4**

```bash
git add src/app/feed/page.tsx src/app/buscar/page.tsx
git commit -m "feat(tabu): gate en feed Tabú y en búsqueda"
```

---

# FEATURE 5 — Video en posts (media mixta)

### Task 5.1: Upload acepta video (límite por tipo)

**Files:**
- Modify: `src/lib/s3.ts`, `src/app/api/upload/route.ts`

**Interfaces:**
- Produces: `extFor` mapea `video/mp4`→`mp4`, `video/webm`→`webm`; upload valida 50MB video / 10MB imagen; cap 10.

- [ ] **Step 1: Extender `EXT` en `src/lib/s3.ts`**

```ts
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "video/mp4": "mp4",
  "video/webm": "webm",
};
```

- [ ] **Step 2: Límite por tipo en `src/app/api/upload/route.ts`**

Reemplazar la constante y el bucle de validación:
```ts
const MAX_IMG = 10 * 1024 * 1024;  // 10 MB
const MAX_VID = 50 * 1024 * 1024;  // 50 MB
const MAX_FILES = 10;
```
En el `for (const file of files)`:
```ts
    if (!extFor(file.type)) {
      return NextResponse.json({ error: `Tipo no permitido: ${file.type}` }, { status: 400 });
    }
    const isVideo = file.type.startsWith("video/");
    const cap = isVideo ? MAX_VID : MAX_IMG;
    if (file.size > cap) {
      return NextResponse.json({ error: isVideo ? "Video mayor a 50 MB" : "Imagen mayor a 10 MB" }, { status: 400 });
    }
```
(El resto del handler queda igual; `putMedia` ya usa `extFor` y sube el buffer.)

- [ ] **Step 3: Verificar tipos**

Run: `npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 4: Commit**

```bash
git add src/lib/s3.ts src/app/api/upload/route.ts
git commit -m "feat(media): upload acepta video (50MB) además de imágenes"
```

### Task 5.2: Composer con botones Foto y Video separados

**Files:**
- Modify: `src/components/PostComposer.tsx`

**Interfaces:**
- Consumes: `POST /api/upload` (imágenes+videos en `files`).

- [ ] **Step 1: Dos inputs + dos pills en `src/components/PostComposer.tsx`**

Añadir un segundo ref junto a `fileRef`:
```ts
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
```
Importar un icono de video (usar `IconLive` ya importado, o `IconCamera`; si existe `IconVideo` en `icons.tsx` úsalo — si no, reutiliza `IconLive`).
Reemplazar la primera pill del array `pills`:
```ts
    { label: "Foto", icon: <IconImage className="h-4 w-4" />, onClick: () => fileRef.current?.click() },
    { label: "Video", icon: <IconLive className="h-4 w-4" />, onClick: () => videoRef.current?.click() },
```
(Quitar la pill "Video en vivo" duplicada si se prefiere, o dejarla; no es bloqueante.)

Cambiar el preview para soportar video (branch por `f.type`):
```tsx
      {previews.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {previews.map((p, i) => (
            <div key={p.url} className="relative">
              {p.f.type.startsWith("video/") ? (
                <video src={p.url} className="h-20 w-full rounded-lg object-cover" muted />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.url} alt="" className="h-20 w-full rounded-lg object-cover" />
              )}
              {p.f.type.startsWith("video/") && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-2xl text-white/90">▶</span>
              )}
              <button onClick={() => removeAt(i)} className="absolute -right-1.5 -top-1.5 h-5 w-5 rounded-full bg-navy text-xs text-white/80 ring-1 ring-white/20" aria-label="Quitar">×</button>
            </div>
          ))}
        </div>
      )}
```

Añadir el segundo input oculto (junto al `fileRef` input):
```tsx
      <input
        ref={videoRef}
        type="file"
        accept="video/mp4,video/webm"
        multiple
        onChange={onPick}
        className="hidden"
      />
```
(`onPick` ya acumula en `files` y respeta `MAX_FILES`; sirve para ambos inputs.)

- [ ] **Step 2: Verificar tipos + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores. (Si `IconVideo` no existe, confirmar que se usó `IconLive` y que está importado.)

- [ ] **Step 3: Chequeo manual (previo al fix nginx solo con archivos <1MB)** — el composer muestra pills Foto y Video; seleccionar un video pequeño muestra miniatura con ▶.

- [ ] **Step 4: Commit**

```bash
git add src/components/PostComposer.tsx
git commit -m "feat(composer): botones Foto y Video separados + preview de video"
```

### Task 5.3: Render de video en PostMedia

**Files:**
- Modify: `src/components/PostMedia.tsx`

**Interfaces:**
- Produces: helper local `isVideo(url)`; render `<video>` en tile, single y lightbox.

- [ ] **Step 1: Helper y render en `src/components/PostMedia.tsx`**

Al inicio del archivo (tras imports), añadir:
```ts
const VIDEO_RE = /\.(mp4|webm)(\?|$)/i;
function isVideo(url: string) { return VIDEO_RE.test(url); }
```

Modificar `Tile` para branch de video:
```tsx
function Tile({ src, size, plus, onOpen }: { src: string; size: number; plus?: number; onOpen: () => void }) {
  const video = isVideo(src);
  return (
    <button type="button" onClick={onOpen} className="relative shrink-0 overflow-hidden" style={{ width: size, height: size }}>
      {video ? (
        <video src={src} className="h-full w-full object-cover" muted preload="metadata" />
      ) : (
        <img src={src} alt="" className="h-full w-full object-cover transition hover:opacity-90" />
      )}
      {video && !plus && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-4xl text-white/90">▶</span>
      )}
      {plus ? (
        <div className="absolute inset-0 flex items-center justify-center bg-navy/[0.64] text-3xl font-bold text-white">+{plus}</div>
      ) : null}
    </button>
  );
}
```

En el caso `images.length === 1`, branch por tipo:
```tsx
      <button type="button" onClick={() => setOpen(0)} className="mt-4 block h-[640px] w-full overflow-hidden rounded-xl bg-navy">
        {isVideo(images[0]) ? (
          <video src={images[0]} className="h-full w-full object-contain" controls preload="metadata" />
        ) : (
          <img src={images[0]} alt="" className="h-full w-full object-contain" />
        )}
      </button>
```

En el lightbox (contenedor 1: foto), branch por tipo:
```tsx
              {isVideo(images[open]) ? (
                <video src={images[open]} className="max-h-[90vh] max-w-full object-contain" controls autoPlay />
              ) : (
                <img src={images[open]} alt="" className="max-h-[90vh] max-w-full object-contain" />
              )}
```

- [ ] **Step 2: Verificar tipos + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add src/components/PostMedia.tsx
git commit -m "feat(media): render de video en tile, single y lightbox"
```

### Task 5.4: Fix nginx (50MB) + build + deploy pieza 5

**Files:**
- Infra: nginx en CT 106 (fuera del repo)

**Interfaces:** N/A (paso de despliegue).

- [ ] **Step 1: Subir `client_max_body_size` en nginx del CT 106**

Editar el server block de Mercury (donde está el `location / { proxy_pass ... }`) y añadir dentro de `server { ... }`:
```
client_max_body_size 55m;
```
Aplicar (según gotcha del vault: nginx.socket sirve config vieja → enmascarar socket + pkill + start). Comando de referencia (ajustar a la config real):
```bash
ssh proxmox "pct exec 106 -- bash -lc 'nginx -t && systemctl mask nginx.socket 2>/dev/null; pkill nginx 2>/dev/null; sleep 1; systemctl start nginx; nginx -T | grep client_max_body_size'"
```
Expected: `nginx -t` OK y `client_max_body_size 55m;` presente.

- [ ] **Step 2: Build local**

Run: `npm run build`
Expected: build OK.

- [ ] **Step 3: Deploy** (con confirmación del usuario)

```bash
ssh proxmox "pct exec 106 -- /usr/local/bin/mercury-deploy"
```

- [ ] **Step 4: Verificación en producción** — en http://192.168.1.106: subir un video ~20–40MB en un post → sube sin 413, se ve el ▶ en la tarjeta y reproduce en el lightbox. Un video >50MB → error "Video mayor a 50 MB".

- [ ] **Step 5: Commit doc de infra** (anotar el cambio de nginx en la nota del servidor, si aplica)

```bash
git add -A
git commit -m "chore(infra): nginx client_max_body_size 55m para video"
```

---

## Self-Review

**Cobertura del spec:**
- §1 Contraseña → Tasks 1.1–1.2 ✔ (incluye caso `passwordHash` null para cuentas Google).
- §2 Guardados → Tasks 2.1–2.4 ✔ (modelo, endpoint, savedByMe, página, fix link).
- §3 Búsqueda + chips → Tasks 3.1–3.4 ✔ (users/posts/tags, reveal-on-click, chips con futuros deshabilitados, Reels=video).
- §4 Tabú Gate → Tasks 4.1–4.4 ✔ (clave, cookie de sesión, unlock/lock, modal, lock en background por visibilitychange, gate en feed y búsqueda). Nota de seguridad (bucket público) queda documentada, no se cierra aquí (correcto por spec).
- §5 Video → Tasks 5.1–5.4 ✔ (extFor, límite por tipo, dos botones, media mixta, render video, fix nginx).

**Consistencia de tipos:**
- `FeedPost.savedByMe` definido en 2.3 y consumido por `PostCard`/`BookmarkButton` y `getSavedPosts`. ✔
- `getFeedPostsByWhere` definido en 3.1 (queries) y consumido por `searchAll`. ✔
- `SearchResult`/`SearchType`/`UserHit`/`TagHit` definidos en 3.1, consumidos por endpoint (3.2), SearchBar (3.3) y página (3.4). ✔
- `setTabuUnlock/clearTabuUnlock/isTabuUnlocked` definidos en 4.2, consumidos por endpoints (4.2) y páginas (4.4). ✔
- `isVideo`/`VIDEO_RE` locales en PostMedia (5.3) y en search.ts (3.1) — duplicación intencional mínima (dos módulos distintos), aceptable.

**Placeholders:** ninguno — todo paso de código trae el código real.

**Riesgo abierto anotado:** `Prisma.PostWhereInput` requiere `import type { Prisma } from "@prisma/client"` (incluido en 3.1). Si el `mode: "insensitive"` diera problemas de tipo en algún `where` inline, castear el objeto como en 3.1 (`as const`).
