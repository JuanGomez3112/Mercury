import Link from "next/link";
import LikeButton from "./LikeButton";
import DeletePostButton from "./DeletePostButton";
import { timeAgo } from "@/lib/auth";

export type FeedPost = {
  id: string;
  body: string;
  images: string[];
  createdAt: Date | string;
  author: { username: string; displayName: string | null };
  likeCount: number;
  likedByMe: boolean;
  isMine: boolean;
};

export default function PostCard({ post }: { post: FeedPost }) {
  const name = post.author.displayName ?? post.author.username;
  return (
    <article className="rounded-[1.25rem] border-2 border-white/10 bg-navy-2/40 p-5 transition hover:border-purple/40">
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

      {post.body && (
        <p className="mt-2 whitespace-pre-wrap break-words text-white/90">{post.body}</p>
      )}

      {post.images.length > 0 && (
        <div
          className={`mt-3 grid gap-2 ${
            post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
          }`}
        >
          {post.images.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt=""
              className="max-h-96 w-full rounded-2xl border-2 border-white/10 object-cover"
            />
          ))}
        </div>
      )}

      <div className="mt-3">
        <LikeButton postId={post.id} initialLiked={post.likedByMe} initialCount={post.likeCount} />
      </div>
    </article>
  );
}
