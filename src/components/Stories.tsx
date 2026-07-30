import Link from "next/link";
import Avatar from "./Avatar";
import { IconPlus } from "./icons";

export type Story = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
};

function Horns() {
  return (
    <svg
      className="pointer-events-none absolute -top-2 left-1/2 h-4 w-10 -translate-x-1/2 text-navy"
      viewBox="0 0 40 16"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 16C2 10 1 4 3 1c2 3 6 6 9 8zM32 16c6-6 7-12 5-15-2 3-6 6-9 8z" />
    </svg>
  );
}

function Halo() {
  return (
    <span
      className="pointer-events-none absolute -top-2 left-1/2 h-2 w-9 -translate-x-1/2 rounded-full border-2 border-purple"
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
    <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-4">
      <div className="flex items-center gap-4 overflow-x-auto pb-1">
        {/* Tu historia */}
        <div className="flex w-16 shrink-0 flex-col items-center gap-1">
          <div className="relative">
            <Avatar src={me.avatarUrl} className="h-14 w-14" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-purple text-navy ring-2 ring-navy-2">
              <IconPlus className="h-3 w-3" />
            </span>
          </div>
          <span className="w-full truncate text-center text-xs text-white/60">Tu historia</span>
        </div>

        <span className="h-12 w-px shrink-0 bg-purple/40" />

        {/* Historias de otros */}
        {stories.map((st, i) => (
          <Link
            key={st.username}
            href={`/u/${st.username}`}
            className="flex w-16 shrink-0 flex-col items-center gap-1"
          >
            <div className="relative rounded-full bg-gradient-to-tr from-purple to-purple-soft p-[2px]">
              {i % 2 === 0 ? <Halo /> : <Horns />}
              <Avatar src={st.avatarUrl} className="h-14 w-14 ring-2 ring-navy-2" />
            </div>
            <span className="w-full truncate text-center text-xs text-white/60">
              {st.displayName ?? st.username}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
