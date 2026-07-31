export type Author = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

export type FeedPost = {
  id: string;
  body: string;
  images: string[];
  isAdult: boolean;
  createdAt: Date | string;
  author: Author;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  isMine: boolean;
  savedByMe: boolean;
  priceCredits: number | null;
  locked: boolean;
};

export type CommentDTO = {
  id: string;
  body: string;
  createdAt: string;
  author: Author;
};
