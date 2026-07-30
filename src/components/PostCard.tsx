import Link from "next/link";
import LikeButton from "./LikeButton";
import DeletePostButton from "./DeletePostButton";
import { timeAgo } from "@/lib/auth";

export type FeedPost = {
  id: string;
  body: string;
  createdAt: Date | string;
  author: { username: string; displayName: string | null };
  likeCount: number;
  likedByMe: boolean;
  isMine: boolean;
};

export default function PostCard({ post }: { post: FeedPost }) {
  const name = post.author.displayName ?? post.author.username;
  return (
    <article className="rounded-2xl border border-white/10 bg-navy-2/40 p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <Link href={`/u/${post.author.username}`} className="font-medium text-white hover:underline">
            {name}
          </Link>
          <span className="text-sm text-white/40">@{post.author.username}</span>
          <span className="text-xs text-white/30">· {timeAgo(post.createdAt)}</span>
        </div>
        {post.isMine && <DeletePostButton postId={post.id} />}
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-white/90">{post.body}</p>
      <div className="mt-3">
        <LikeButton postId={post.id} initialLiked={post.likedByMe} initialCount={post.likeCount} />
      </div>
    </article>
  );
}
