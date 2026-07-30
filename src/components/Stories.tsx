import Link from "next/link";
import Avatar from "./Avatar";
import { IconPlus } from "./icons";

export type Story = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  mode?: string | null;
};

function Horns() {
  // detrás de la imagen: la base queda oculta por el avatar, las puntas sobresalen
  return (
    <svg
      className="pointer-events-none absolute left-1/2 top-[-6px] z-0 h-5 w-14 -translate-x-1/2 text-navy"
      viewBox="0 0 56 22"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 22C4 14 2 6 5 1c3 5 9 9 13 12zM44 22c8-8 10-16 7-21-3 5-9 9-13 12z" />
    </svg>
  );
}

function Halo() {
  // 40×12, 4px por encima de la imagen
  return (
    <span
      className="pointer-events-none absolute bottom-[calc(100%+4px)] left-1/2 z-20 h-3 w-10 -translate-x-1/2 rounded-full border-[3px] border-purple"
      aria-hidden
    />
  );
}

function StoryAvatar({ src, mode }: { src?: string | null; mode?: string | null }) {
  return (
    <div className="relative">
      {mode === "devil" && <Horns />}
      {mode === "angel" && <Halo />}
      <Avatar src={src} className="relative z-10 h-16 w-16 ring-2 ring-purple" />
    </div>
  );
}

export default function Stories({ me, stories }: { me: Story; stories: Story[] }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-8">
      <div className="no-scrollbar flex items-center gap-8 overflow-x-auto pt-3">
        {/* Mi historia */}
        <div className="flex shrink-0 flex-col items-center">
          <div className="relative">
            <StoryAvatar src={me.avatarUrl} mode={me.mode} />
            <span className="absolute -bottom-0.5 -right-0.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-purple text-navy ring-2 ring-navy-2">
              <IconPlus className="h-4 w-4" />
            </span>
          </div>
        </div>

        {/* Separador morado */}
        <span className="h-14 w-px shrink-0 bg-purple" />

        {/* Historias de los demás */}
        {stories.map((st) => (
          <Link key={st.username} href={`/u/${st.username}`} className="shrink-0">
            <StoryAvatar src={st.avatarUrl} mode={st.mode} />
          </Link>
        ))}
      </div>
    </div>
  );
}
