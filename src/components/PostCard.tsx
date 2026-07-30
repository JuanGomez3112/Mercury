import Link from "next/link";
import Avatar from "./Avatar";
import LikeButton from "./LikeButton";
import DeletePostButton from "./DeletePostButton";
import CommentBar from "./CommentBar";
import { timeAgo } from "@/lib/time";
import type { FeedPost } from "@/lib/types";
import PostMedia from "./PostMedia";
import { IconComment, IconShare, IconBookmark, IconMore, IconVerified, IconFire } from "./icons";

export default function PostCard({
  post,
  viewerAvatarUrl,
}: {
  post: FeedPost;
  viewerAvatarUrl?: string | null;
}) {
  const name = post.author.displayName ?? post.author.username;
  return (
    <article className="rounded-2xl border border-white/10 bg-navy-2/50 p-8 text-base leading-5 tracking-[0.02em]">
      {/* Cabecera */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/u/${post.author.username}`}>
            <Avatar src={post.author.avatarUrl} className="h-[54px] w-[54px]" />
          </Link>
          <div>
            <div className="flex items-center gap-1.5">
              <Link href={`/u/${post.author.username}`} className="font-semibold text-white hover:underline">
                {name}
              </Link>
              <IconVerified className="h-4 w-4 text-purple" />
            </div>
            <div className="flex items-center gap-1 text-white/40">
              <span>@{post.author.username}</span>
              <span>·</span>
              <span>{timeAgo(post.createdAt)}</span>
            </div>
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
          <button className="flex h-8 w-8 items-center justify-center rounded-full bg-purple/20 text-purple/70 transition hover:bg-purple/30 hover:text-purple" aria-label="Más">
            <IconMore className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Cuerpo */}
      {post.body && <p className="mt-4 whitespace-pre-wrap break-words text-white/90">{post.body}</p>}

      {/* Media (abre lightbox con panel de comentarios) */}
      <PostMedia post={post} viewerAvatarUrl={viewerAvatarUrl} />

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
      <div className="mt-4 flex items-center gap-7 text-white/60">
        <LikeButton postId={post.id} initialLiked={post.likedByMe} initialCount={post.likeCount} />
        <span className="flex items-center gap-1.5 text-sm">
          <IconComment className="text-[28px]" />
          {post.commentCount > 0 && post.commentCount}
        </span>
        <button className="transition hover:text-white" aria-label="Compartir">
          <IconShare className="text-[24px]" />
        </button>
        <button className="ml-auto transition hover:text-white" aria-label="Guardar">
          <IconBookmark className="text-[28px]" />
        </button>
      </div>

      {/* Comentario */}
      <CommentBar postId={post.id} avatarUrl={viewerAvatarUrl} />
    </article>
  );
}
