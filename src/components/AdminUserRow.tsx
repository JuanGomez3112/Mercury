"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "./Avatar";

type U = {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  balance: number;
  earnings: number;
  isAdmin: boolean;
  banned: boolean;
  suspendedUntil: string | null;
};

export default function AdminUserRow({ user }: { user: U }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const suspended = user.suspendedUntil && new Date(user.suspendedUntil) > new Date();

  async function act(action: "ban" | "unban" | "suspend", days?: number) {
    if (busy) return;
    setBusy(true);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, days }),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-navy-2/50 p-4 max-sm:rounded-none max-sm:border-x-0">
      <Link href={`/u/${user.username}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar src={user.avatarUrl} className="h-10 w-10" />
        <div className="min-w-0">
          <p className="flex items-center gap-2 truncate font-medium text-white">
            {user.displayName ?? user.username}
            {user.isAdmin && <span className="rounded-full bg-purple/20 px-2 py-0.5 text-[10px] text-purple">admin</span>}
            {user.banned && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] text-red-400">baneado</span>}
            {suspended && <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-400">suspendido</span>}
          </p>
          <p className="truncate text-xs text-white/40">@{user.username} · {user.balance} ☾ · {user.earnings} ganado</p>
        </div>
      </Link>
      {!user.isAdmin && (
        <div className="flex shrink-0 flex-wrap gap-1.5">
          {user.banned ? (
            <button onClick={() => act("unban")} disabled={busy} className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5">Reactivar</button>
          ) : (
            <>
              <button onClick={() => act("suspend", 7)} disabled={busy} className="rounded-lg border border-amber-500/40 px-3 py-1.5 text-xs text-amber-400 hover:bg-amber-500/10">Suspender 7d</button>
              <button onClick={() => act("ban")} disabled={busy} className="rounded-lg border border-red-500/40 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10">Banear</button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
