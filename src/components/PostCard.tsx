import Link from "next/link";
import Avatar from "./Avatar";
import LikeButton from "./LikeButton";
import PostMenu from "./PostMenu";
import CommentBar from "./CommentBar";
import { timeAgo } from "@/lib/time";
import type { FeedPost } from "@/lib/types";
import PostMedia from "./PostMedia";
import { IconComment, IconShare, IconFire } from "./icons";
import { VerifiedGrad } from "./GradientIcons";
import BookmarkButton from "./BookmarkButton";
import TipButton from "./TipButton";

export default function PostCard({
  post,
  viewerAvatarUrl,
  fireLike = false,
}: {
  post: FeedPost;
  viewerAvatarUrl?: string | null;
  fireLike?: boolean;
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
              <VerifiedGrad className="h-4 w-4" />
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
          <PostMenu postId={post.id} isMine={post.isMine} />
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
        <LikeButton postId={post.id} initialLiked={post.likedByMe} initialCount={post.likeCount} variant={fireLike ? "fire" : "heart"} />
        <span className="flex items-center gap-1.5 text-sm">
          <IconComment className="text-[28px]" />
          {post.commentCount > 0 && post.commentCount}
        </span>
        <button className="transition hover:text-white" aria-label="Compartir">
          <IconShare className="text-[24px]" />
        </button>
        <BookmarkButton postId={post.id} initialSaved={post.savedByMe} />
        {!post.isMine && <TipButton toUsername={post.author.username} postId={post.id} />}
      </div>

      {/* Comentario */}
      <CommentBar postId={post.id} avatarUrl={viewerAvatarUrl} />
    </article>
  );
}
