import Link from "next/link";
import Avatar from "./Avatar";
import LogoutButton from "./LogoutButton";
import FollowButton from "./FollowButton";
import ModeToggle from "./ModeToggle";
import type { Story } from "./Stories";

export default function RightPanel({
  me,
  suggestions,
}: {
  me: { username: string; displayName: string | null; avatarUrl: string | null; mode?: string | null };
  suggestions: Story[];
}) {
  const mode = me.mode === "angel" || me.mode === "devil" ? me.mode : null;
  return (
    <aside className="sticky top-28 hidden h-max w-[448px] shrink-0 flex-col gap-4 xl:flex">
      {/* Tarjeta de perfil */}
      <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-4">
        <div className="flex items-center gap-3">
          <Link href={`/u/${me.username}`}>
            <Avatar src={me.avatarUrl} className="h-12 w-12" />
          </Link>
          <div className="min-w-0">
            <Link href={`/u/${me.username}`} className="block truncate font-semibold text-white hover:underline">
              {me.displayName ?? me.username}
            </Link>
            <span className="block truncate text-xs text-white/40">@{me.username}</span>
          </div>
        </div>
        <div className="mt-4">
          <ModeToggle initial={mode} />
        </div>
        <div className="mt-4">
          <LogoutButton />
        </div>
      </div>

      {/* Sugerencias */}
      {suggestions.length > 0 && (
        <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-4">
          <h2 className="mb-3 text-sm font-semibold text-white/70">A quién seguir</h2>
          <div className="space-y-3">
            {suggestions.map((u) => (
              <div key={u.username} className="flex items-center justify-between gap-2">
                <Link href={`/u/${u.username}`} className="flex min-w-0 items-center gap-2">
                  <Avatar src={u.avatarUrl} className="h-9 w-9" />
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white">
                      {u.displayName ?? u.username}
                    </span>
                    <span className="block truncate text-xs text-white/40">@{u.username}</span>
                  </div>
                </Link>
                <FollowButton username={u.username} initialFollowing={false} />
              </div>
            ))}
          </div>
        </div>
      )}
    </aside>
  );
}
