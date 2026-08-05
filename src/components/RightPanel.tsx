import Link from "next/link";
import Avatar from "./Avatar";
import FollowButton from "./FollowButton";
import MeryCoinCard from "./MeryCoinCard";
import type { ChatPreview } from "@/lib/queries";

type SuggestUser = { username: string; displayName: string | null; avatarUrl: string | null };

export default function RightPanel({
  suggestions,
  chats = [],
}: {
  suggestions: SuggestUser[];
  chats?: ChatPreview[];
}) {
  return (
    <aside className="sticky top-28 hidden h-[calc(100vh-8rem)] w-[448px] shrink-0 flex-col gap-6 self-start overflow-y-auto rounded-3xl border border-white/10 bg-navy-2/70 p-6 xl:flex">
      {/* MeryCoin */}
      <MeryCoinCard />

      {/* Mensajes recientes */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/70">Mensajes</h2>
          <Link href="/mensajes" className="text-xs font-medium text-purple hover:underline">Ver todos</Link>
        </div>
        {chats.length === 0 ? (
          <p className="text-sm text-white/40">Sin conversaciones todavía.</p>
        ) : (
          <div className="space-y-1">
            {chats.map((c) => (
              <Link
                key={c.partner.username}
                href={`/mensajes/${c.partner.username}`}
                className="flex items-center gap-2 rounded-xl px-2 py-2 transition hover:bg-white/5"
              >
                <Avatar src={c.partner.avatarUrl} className="h-10 w-10" />
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">
                    {c.partner.displayName ?? c.partner.username}
                  </span>
                  <span className={`block truncate text-xs ${c.unread > 0 ? "font-semibold text-white/80" : "text-white/40"}`}>
                    {c.mine && "Tú: "}
                    {c.body}
                  </span>
                </div>
                {c.unread > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 text-[10px] font-bold text-white">
                    {c.unread}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Sugerencias */}
      {suggestions.length > 0 && (
        <div className="border-t border-white/10 pt-5">
          <h2 className="mb-3 text-sm font-semibold text-white/70">A quién seguir</h2>
          <div className="space-y-3">
            {suggestions.map((u) => (
              <div key={u.username} className="flex items-center justify-between gap-2">
                <Link href={`/u/${u.username}`} className="flex min-w-0 items-center gap-2">
                  <Avatar src={u.avatarUrl} className="h-9 w-9" />
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-medium text-white">{u.displayName ?? u.username}</span>
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
