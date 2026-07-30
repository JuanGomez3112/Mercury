import Link from "next/link";
import Avatar from "./Avatar";
import { IconPlus } from "./icons";

export type Story = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

function Horns() {
  // detrás de la imagen (z-0), a -6px
  return (
    <svg
      className="pointer-events-none absolute left-1/2 top-[-6px] z-0 h-4 w-11 -translate-x-1/2 text-navy"
      viewBox="0 0 44 18"
      fill="currentColor"
      aria-hidden
    >
      <path d="M9 18C3 11 1 5 3 1c2 4 7 7 10 9zM35 18c6-7 8-13 6-17-2 4-7 7-10 9z" />
    </svg>
  );
}

function Halo() {
  // 40x12, 4px por encima de la imagen
  return (
    <span
      className="pointer-events-none absolute bottom-[calc(100%+4px)] left-1/2 h-3 w-10 -translate-x-1/2 rounded-full border-2 border-purple"
      aria-hidden
    />
  );
}

export default function Stories({
  me,
  stories,
}: {
  me: Story;
  stories: Story[];
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-8">
      <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
        {/* Grupo: mi historia */}
        <div className="flex shrink-0 flex-col items-center gap-1">
          <div className="relative">
            <Avatar src={me.avatarUrl} className="h-16 w-16" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-purple text-navy ring-2 ring-navy-2">
              <IconPlus className="h-4 w-4" />
            </span>
          </div>
        </div>

        {/* Separador morado */}
        <span className="h-14 w-px shrink-0 bg-purple" />

        {/* Grupo: historias de los demás */}
        {stories.map((st, i) => (
          <Link key={st.username} href={`/u/${st.username}`} className="flex shrink-0 flex-col items-center">
            <div className="relative">
              {i % 2 === 0 ? <Halo /> : <Horns />}
              <span className="relative z-10 block rounded-full bg-gradient-to-tr from-purple to-purple-soft p-[2px]">
                <Avatar src={st.avatarUrl} className="h-16 w-16 ring-2 ring-navy-2" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
