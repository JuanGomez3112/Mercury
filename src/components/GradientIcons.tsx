// Iconos con relleno de degradado morado (usa <linearGradient id="mercuryGrad"> del layout).

export function HeartGrad({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="url(#mercuryGrad)" aria-hidden>
      <path d="M12 21 3.2 12.7a5 5 0 0 1 7.1-7.1L12 7.3l1.7-1.7a5 5 0 0 1 7.1 7.1z" />
    </svg>
  );
}

export function VerifiedGrad({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path
        d="m12 1 2.4 1.8 3 .1 1 2.8 2.4 1.7-.9 2.8.9 2.8-2.4 1.7-1 2.8-3 .1L12 23l-2.4-1.8-3-.1-1-2.8L3.2 16l.9-2.8-.9-2.8L5.6 8l1-2.8 3-.1z"
        fill="url(#mercuryGrad)"
      />
      <path
        d="m8.5 12 2.3 2.3 4.7-4.6"
        fill="none"
        stroke="#050418"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
