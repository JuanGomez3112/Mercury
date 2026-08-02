import Link from "next/link";
import Avatar from "./Avatar";
import { IconPlus } from "./icons";

export type Story = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  mode?: string | null;
};

/* eslint-disable @next/next/no-img-element */
function StoryAvatar({ src, mode }: { src?: string | null; mode?: string | null }) {
  return (
    <div className="relative h-16 w-16">
      {/* Cuernos: 42×28, hundidos -6px en la parte superior de la imagen (detrás) */}
      {mode === "devil" && (
        <img
          src="/Cuernos.svg"
          alt=""
          className="pointer-events-none absolute bottom-[calc(100%-6px)] left-1/2 z-0 h-7 w-[42px] -translate-x-1/2"
        />
      )}
      {/* Aureola: 40×12, 4px por encima de la imagen */}
      {mode === "angel" && (
        <img
          src="/Aurola.svg"
          alt=""
          className="pointer-events-none absolute bottom-[calc(100%+4px)] left-1/2 z-20 h-3 w-10 -translate-x-1/2"
        />
      )}
      <Avatar src={src} className="relative z-10 h-16 w-16" />
    </div>
  );
}

export default function Stories({ me, stories }: { me: Story; stories: Story[] }) {
  return (
    <div className="group relative h-[150px] rounded-2xl border border-white/10 bg-navy-2/50 transition-colors duration-300 hover:border-purple/20 max-sm:rounded-none max-sm:border-x-0">
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-tl from-[#2e2568] to-[#1a1540] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
      <div className="no-scrollbar relative h-full overflow-x-auto p-8">
      <div className="flex h-full w-max items-end gap-8">
        {/* Mi historia */}
        <div className="relative shrink-0">
          <StoryAvatar src={me.avatarUrl} mode={me.mode} />
          <span className="absolute -bottom-0.5 -right-0.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-purple text-navy ring-2 ring-navy-2">
            <IconPlus className="h-3 w-3" />
          </span>
        </div>

        {/* Separador morado */}
        <span className="h-16 w-px shrink-0 self-end bg-purple/50" />

        {/* Historias de los demás */}
        {stories.map((st) => (
          <Link key={st.username} href={`/u/${st.username}`} className="shrink-0">
            <StoryAvatar src={st.avatarUrl} mode={st.mode} />
          </Link>
        ))}
      </div>
      </div>
    </div>
  );
}
