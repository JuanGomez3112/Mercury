type P = { className?: string };
const base = "h-4 w-4";
const s = (className: string) => className || base;

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export const IconUser = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" {...stroke}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const IconLock = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" {...stroke}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const IconSearch = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" {...stroke}>
    <circle cx="11" cy="11" r="7" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const IconBell = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" {...stroke}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </svg>
);

export const IconInbox = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" {...stroke}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.5 5.5 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.5A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.5z" />
  </svg>
);

export const IconMasks = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" {...stroke}>
    <path d="M4 5h9v6a4.5 4.5 0 0 1-9 0z" />
    <path d="M13 8h7v4a4.5 4.5 0 0 1-6.9 3.8" />
    <path d="M6.5 8.5h.01M10 8.5h.01M16 10.5h.01M18.5 10.5h.01" />
  </svg>
);

export const IconMapPeople = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" {...stroke}>
    <path d="M9 18l-6 3V6l6-3 6 3 6-3v9" />
    <path d="M9 3v15M15 6v4" />
    <circle cx="18" cy="17" r="2" />
    <path d="M15 22a3 3 0 0 1 6 0" />
  </svg>
);

export const IconHeart = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" {...stroke}>
    <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21l8.8-8.3a5 5 0 0 0 0-7.1z" />
  </svg>
);

export const IconHeartFill = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 21 3.2 12.7a5 5 0 0 1 7.1-7.1L12 7.3l1.7-1.7a5 5 0 0 1 7.1 7.1z" />
  </svg>
);

export const IconComment = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" {...stroke}>
    <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 9 9 0 0 1-4-1L3 20l1.1-4.9a8.4 8.4 0 0 1 3.9-11A8.4 8.4 0 0 1 21 11.5z" />
  </svg>
);

export const IconShare = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" {...stroke}>
    <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

export const IconBookmark = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" {...stroke}>
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

export const IconMusic = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" {...stroke}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

export const IconTag = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" {...stroke}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9.5" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
  </svg>
);

export const IconPin = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" {...stroke}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);

export const IconPoll = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" {...stroke}>
    <path d="M3 3v18h18" />
    <rect x="7" y="12" width="3" height="6" />
    <rect x="12" y="8" width="3" height="10" />
    <rect x="17" y="5" width="3" height="13" />
  </svg>
);

export const IconLink = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" {...stroke}>
    <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
    <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
  </svg>
);

export const IconImage = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" {...stroke}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-5-5L5 21" />
  </svg>
);

export const IconMore = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" fill="currentColor">
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </svg>
);

export const IconPlus = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" {...stroke}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const IconGrid = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" {...stroke}>
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
);

export const IconVerified = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" fill="currentColor">
    <path d="m12 1 2.4 1.8 3 .1 1 2.8 2.4 1.7-.9 2.8.9 2.8-2.4 1.7-1 2.8-3 .1L12 23l-2.4-1.8-3-.1-1-2.8L3.2 16l.9-2.8-.9-2.8L5.6 8l1-2.8 3-.1z" fill="currentColor" />
    <path d="m8.5 12 2.3 2.3 4.7-4.6" fill="none" stroke="var(--navy)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const IconVideo = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" {...stroke}>
    <rect x="2" y="6" width="14" height="12" rx="2" />
    <path d="m22 8-6 4 6 4z" />
  </svg>
);

export const IconLive = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" {...stroke}>
    <circle cx="12" cy="12" r="3" />
    <path d="M7 7a7 7 0 0 0 0 10M17 7a7 7 0 0 1 0 10M4.5 4.5a11 11 0 0 0 0 15M19.5 4.5a11 11 0 0 1 0 15" />
  </svg>
);

export const IconCamera = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" {...stroke}>
    <path d="M14.5 4h-5L8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-4z" />
    <circle cx="12" cy="13" r="3.5" />
  </svg>
);

export const IconFire = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" fill="currentColor">
    <path d="M13 2c.5 3-1.5 4.5-3 6.5C8.3 10.7 7 12.5 7 15a5 5 0 0 0 10 .3c.2-2.4-1-4.3-2-5.8-.3 1-.9 1.8-1.8 2.2.6-1.7.4-3.6-.4-5.2A8 8 0 0 0 13 2z" />
  </svg>
);

export const IconGoogle = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 11v3.5h4.9c-.2 1.2-1.6 3.6-4.9 3.6a5.1 5.1 0 1 1 0-10.2c1.6 0 2.7.7 3.3 1.3l2.3-2.2A8.5 8.5 0 1 0 12 20.5c4.9 0 8.2-3.5 8.2-8.4 0-.6-.1-1-.2-1.5H12z" />
  </svg>
);

export const IconFacebook = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 8.5V7c0-.8.5-1 1-1h2V3h-3c-2.2 0-4 1.8-4 4v1.5H8V12h2v9h3v-9h2.3l.7-3.5H14z" />
  </svg>
);

export const IconX = ({ className = base }: P) => (
  <svg className={s(className)} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.5 3h3l-6.6 7.5L21 21h-5.3l-4.1-5.4L6.8 21H3.8l7-8L3 3h5.4l3.7 4.9L17.5 3zm-1.9 16h1.6L8.5 4.7H6.8L15.6 19z" />
  </svg>
);
