import Link from "next/link";
import Avatar from "./Avatar";
import LikeButton from "./LikeButton";
import PostMenu from "./PostMenu";
import CommentBar from "./CommentBar";
import CommentsSection from "./CommentsSection";
import { timeAgo } from "@/lib/time";
import type { FeedPost } from "@/lib/types";
import PostMedia from "./PostMedia";
import PostBody from "./PostBody";
import PollCard from "./PollCard";
import { IconComment, IconShare, IconFire, IconPin, IconLink } from "./icons";
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
    <article className="rounded-none border-x-0 border-y border-white/10 bg-navy-2/50 p-5 text-base leading-5 tracking-[0.02em] sm:rounded-2xl sm:border-x sm:p-8">
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

      {/* Colaboradores (crédito del reparto) */}
      {post.collaborators.length > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-sm text-white/60">
          <span className="text-white/40">🤝 con</span>
          {post.collaborators.map((c, i) => (
            <span key={c.username}>
              <Link href={`/u/${c.username}`} className="text-purple hover:underline">@{c.username}</Link>
              {i < post.collaborators.length - 1 && <span className="text-white/40">,</span>}
            </span>
          ))}
        </p>
      )}

      {/* Cuerpo (con @menciones y #hashtags enlazados) */}
      {post.body && <PostBody text={post.body} />}

      {/* Ubicación */}
      {post.location && (
        <div className="mt-3 flex items-center gap-1.5 text-sm text-white/50">
          <IconPin className="h-3.5 w-3.5 text-purple" />
          {post.location}
        </div>
      )}

      {/* Media (abre lightbox con panel de comentarios) */}
      <PostMedia post={post} viewerAvatarUrl={viewerAvatarUrl} />

      {/* Encuesta */}
      {post.poll && <PollCard poll={post.poll} />}

      {/* Enlace */}
      {post.linkUrl && (
        <a
          href={post.linkUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-navy px-4 py-3 text-sm text-purple transition hover:border-purple/40"
        >
          <IconLink className="h-4 w-4 shrink-0" />
          <span className="truncate">{post.linkUrl.replace(/^https?:\/\//, "")}</span>
        </a>
      )}

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

      {/* Comentarios: preview con avatar + expandible con filtro y likes */}
      <CommentsSection postId={post.id} commentCount={post.commentCount} preview={post.commentPreview} />

      {/* Añadir comentario */}
      <CommentBar postId={post.id} avatarUrl={viewerAvatarUrl} />
    </article>
  );
}
