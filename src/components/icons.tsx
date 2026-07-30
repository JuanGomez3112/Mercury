type P = { className?: string };
const base = "h-4 w-4";

export const IconUser = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const IconLock = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

export const IconAt = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
  </svg>
);

export const IconMail = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-10 5L2 7" />
  </svg>
);

export const IconCalendar = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18" />
  </svg>
);

export const IconGoogle = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 11v3.5h4.9c-.2 1.2-1.6 3.6-4.9 3.6a5.1 5.1 0 1 1 0-10.2c1.6 0 2.7.7 3.3 1.3l2.3-2.2A8.5 8.5 0 1 0 12 20.5c4.9 0 8.2-3.5 8.2-8.4 0-.6-.1-1-.2-1.5H12z" />
  </svg>
);

export const IconFacebook = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M14 8.5V7c0-.8.5-1 1-1h2V3h-3c-2.2 0-4 1.8-4 4v1.5H8V12h2v9h3v-9h2.3l.7-3.5H14z" />
  </svg>
);

export const IconX = ({ className = base }: P) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.5 3h3l-6.6 7.5L21 21h-5.3l-4.1-5.4L6.8 21H3.8l7-8L3 3h5.4l3.7 4.9L17.5 3zm-1.9 16h1.6L8.5 4.7H6.8L15.6 19z" />
  </svg>
);
