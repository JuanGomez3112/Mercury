import Link from "next/link";
import Avatar from "./Avatar";
import LikeButton from "./LikeButton";
import DeletePostButton from "./DeletePostButton";
import { timeAgo } from "@/lib/auth";
import { IconComment, IconShare, IconBookmark, IconMore, IconVerified, IconFire } from "./icons";

export type FeedPost = {
  id: string;
  body: string;
  images: string[];
  isAdult: boolean;
  createdAt: Date | string;
  author: { username: string; displayName: string | null; avatarUrl: string | null };
  likeCount: number;
  likedByMe: boolean;
  isMine: boolean;
};

/* eslint-disable @next/next/no-img-element */
function Tile({ src, plus }: { src: string; plus?: number }) {
  return (
    <div className="relative h-full min-w-0 flex-1 overflow-hidden">
      <img src={src} alt="" className="h-full w-full object-cover" />
      {plus ? (
        <div className="absolute inset-0 flex items-center justify-center bg-navy/70 text-3xl font-bold text-white">
          +{plus}
        </div>
      ) : null}
    </div>
  );
}

function Media({ images }: { images: string[] }) {
  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="mt-4 h-[640px] w-full overflow-hidden rounded-xl bg-navy">
        <img src={images[0]} alt="" className="h-full w-full object-contain" />
      </div>
    );
  }

  const cls = "mt-4 h-[640px] w-full overflow-hidden rounded-xl";

  if (images.length === 2) {
    return (
      <div className={`${cls} flex gap-1.5`}>
        {images.map((s) => <Tile key={s} src={s} />)}
      </div>
    );
  }

  if (images.length === 3) {
    return (
      <div className={`${cls} flex gap-1.5`}>
        <Tile src={images[0]} />
        <div className="flex flex-1 flex-col gap-1.5">
          <Tile src={images[1]} />
          <Tile src={images[2]} />
        </div>
      </div>
    );
  }

  if (images.length === 4) {
    return (
      <div className={`${cls} grid grid-cols-2 grid-rows-2 gap-1.5`}>
        {images.map((s) => (
          <div key={s} className="relative overflow-hidden">
            <img src={s} alt="" className="h-full w-full object-cover" />
          </div>
        ))}
      </div>
    );
  }

  // 5+ : 2 arriba, 3 abajo; la última con +N si hay más de 5
  const top = images.slice(0, 2);
  const bottom = images.slice(2, 5);
  const extra = images.length - 5;
  return (
    <div className={`${cls} flex flex-col gap-1.5`}>
      <div className="flex flex-1 gap-1.5">
        {top.map((s) => <Tile key={s} src={s} />)}
      </div>
      <div className="flex flex-1 gap-1.5">
        {bottom.map((s, i) => (
          <Tile key={s} src={s} plus={i === 2 && extra > 0 ? extra : undefined} />
        ))}
      </div>
    </div>
  );
}

export default function PostCard({ post }: { post: FeedPost }) {
  const name = post.author.displayName ?? post.author.username;
  return (
    <article className="rounded-2xl border border-white/10 bg-navy-2/50 p-8 text-base leading-5 tracking-[0.02em]">
      {/* Cabecera */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Link href={`/u/${post.author.username}`}>
            <Avatar src={post.author.avatarUrl} className="h-16 w-16" />
          </Link>
          <div>
            <div className="flex items-center gap-1.5">
              <Link href={`/u/${post.author.username}`} className="font-semibold text-white hover:underline">
                {name}
              </Link>
              <IconVerified className="h-4 w-4 text-purple" />
            </div>
            <div className="text-white/40">@{post.author.username}</div>
            <div className="text-white/40">{timeAgo(post.createdAt)}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {post.isAdult && (
            <span className="flex items-center gap-1 rounded-full bg-orange-500/15 px-2 py-0.5 text-xs font-semibold text-orange-400">
              <IconFire className="h-3 w-3" />
              18+
            </span>
          )}
          {post.isMine && <DeletePostButton postId={post.id} />}
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-purple text-navy transition hover:brightness-95" aria-label="Más">
            <IconMore className="h-1 w-3.5" />
          </button>
        </div>
      </div>

      {/* Cuerpo */}
      {post.body && <p className="mt-4 whitespace-pre-wrap break-words text-white/90">{post.body}</p>}

      {/* Media */}
      <Media images={post.images} />

      {/* Likers */}
      {post.likeCount > 0 && (
        <div className="mt-4 flex items-center gap-3 text-sm text-white/50">
          <span className="flex -space-x-2">
            {Array.from({ length: Math.min(3, post.likeCount) }).map((_, i) => (
              <Avatar key={i} className="h-7 w-7 ring-2 ring-navy-2" />
            ))}
          </span>
          <span>
            <b className="text-white/70">{post.likeCount}</b> {post.likeCount === 1 ? "me gusta" : "personas"}
          </span>
        </div>
      )}

      {/* Barra de acciones */}
      <div className="mt-4 flex items-center gap-6 text-white/60">
        <LikeButton postId={post.id} initialLiked={post.likedByMe} initialCount={post.likeCount} />
        <button className="transition hover:text-white" aria-label="Comentar">
          <IconComment className="h-7 w-7" />
        </button>
        <button className="transition hover:text-white" aria-label="Compartir">
          <IconShare className="h-7 w-7" />
        </button>
        <button className="ml-auto transition hover:text-white" aria-label="Guardar">
          <IconBookmark className="h-7 w-7" />
        </button>
      </div>

      {/* Comentario */}
      <div className="mt-[30px] flex items-center gap-4">
        <Avatar className="h-10 w-10" />
        <input
          placeholder="Escribe un comentario"
          className="flex-1 rounded-full border border-white/10 bg-navy px-4 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple"
        />
      </div>
    </article>
  );
}
