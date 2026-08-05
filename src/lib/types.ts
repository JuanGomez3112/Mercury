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
  location: string | null;
  linkUrl: string | null;
  poll: PollView | null;
  collaborators: { username: string; displayName: string | null }[];
  commentPreview: { id: string; username: string; displayName: string | null; avatarUrl: string | null; body: string }[];
};

export type PollView = {
  totalVotes: number;
  myOptionId: string | null;
  options: { id: string; text: string; votes: number }[];
};

export type CommentDTO = {
  id: string;
  body: string;
  createdAt: string;
  author: Author;
  likeCount: number;
  likedByMe: boolean;
};
