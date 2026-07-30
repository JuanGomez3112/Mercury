import Link from "next/link";
import Avatar from "./Avatar";
import LikeButton from "./LikeButton";
import DeletePostButton from "./DeletePostButton";
import { timeAgo } from "@/lib/auth";
import { IconComment, IconShare, IconBookmark, IconMore, IconVerified } from "./icons";

export type FeedPost = {
  id: string;
  body: string;
  images: string[];
  createdAt: Date | string;
  author: { username: string; displayName: string | null; avatarUrl: string | null };
  likeCount: number;
  likedByMe: boolean;
  isMine: boolean;
};

function Media({ images }: { images: string[] }) {
  if (images.length === 0) return null;
  if (images.length === 1) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={images[0]} alt="" className="mt-3 max-h-[32rem] w-full rounded-xl border border-white/10 object-cover" />;
  }
  const shown = images.slice(0, 4);
  const extra = images.length - shown.length;
  return (
    <div className="mt-3 grid grid-cols-2 gap-1.5 overflow-hidden rounded-xl">
      {shown.map((src, i) => (
        <div key={src} className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt="" className="h-44 w-full border border-white/10 object-cover" />
          {i === shown.length - 1 && extra > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-navy/70 text-2xl font-bold text-white">
              +{extra}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function PostCard({ post }: { post: FeedPost }) {
  const name = post.author.displayName ?? post.author.username;
  return (
    <article className="rounded-2xl border border-white/10 bg-navy-2/40 p-5">
      {/* Cabecera */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Link href={`/u/${post.author.username}`}>
            <Avatar src={post.author.avatarUrl} className="h-11 w-11" />
          </Link>
          <div className="leading-tight">
            <div className="flex items-center gap-1.5">
              <Link href={`/u/${post.author.username}`} className="font-semibold text-white hover:underline">
                {name}
              </Link>
              <IconVerified className="h-4 w-4 text-purple" />
            </div>
            <div className="flex items-center gap-1 text-xs text-white/40">
              <span>@{post.author.username}</span>
              <span>·</span>
              <span>{timeAgo(post.createdAt)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {post.isMine && <DeletePostButton postId={post.id} />}
          <button className="flex h-7 w-7 items-center justify-center rounded-full text-white/40 transition hover:bg-white/5 hover:text-white" aria-label="Más">
            <IconMore className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Cuerpo */}
      {post.body && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-white/90">{post.body}</p>}

      {/* Media */}
      <Media images={post.images} />

      {/* Likers */}
      {post.likeCount > 0 && (
        <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
          <span className="flex -space-x-2">
            {Array.from({ length: Math.min(3, post.likeCount) }).map((_, i) => (
              <Avatar key={i} className="h-5 w-5 ring-2 ring-navy-2" />
            ))}
          </span>
          <span>
            <b className="text-white/70">{post.likeCount}</b>{" "}
            {post.likeCount === 1 ? "me gusta" : "personas"}
          </span>
        </div>
      )}

      {/* Barra de acciones */}
      <div className="mt-3 flex items-center gap-5 border-t border-white/5 pt-3 text-white/60">
        <LikeButton postId={post.id} initialLiked={post.likedByMe} initialCount={post.likeCount} />
        <button className="flex items-center gap-1.5 text-sm transition hover:text-white" aria-label="Comentar">
          <IconComment className="h-5 w-5" />
        </button>
        <button className="flex items-center gap-1.5 text-sm transition hover:text-white" aria-label="Compartir">
          <IconShare className="h-5 w-5" />
        </button>
        <button className="ml-auto transition hover:text-white" aria-label="Guardar">
          <IconBookmark className="h-5 w-5" />
        </button>
      </div>

      {/* Comentario */}
      <div className="mt-3 flex items-center gap-2">
        <Avatar className="h-8 w-8" />
        <input
          placeholder="Escribe un comentario"
          className="flex-1 rounded-full border border-white/10 bg-navy px-4 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-purple"
        />
      </div>
    </article>
  );
}
