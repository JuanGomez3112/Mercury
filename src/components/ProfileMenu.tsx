"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import AdminLink from "./AdminLink";
import { useOutside } from "@/lib/useOutside";
import { IconUser, IconBookmark } from "./icons";

export default function ProfileMenu({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl?: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
    router.refresh();
  }

  const item = "flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 transition hover:bg-white/5 hover:text-white";

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Mi cuenta">
        <Avatar src={avatarUrl} className="h-12 w-12 ring-2 ring-purple/40" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-56 overflow-hidden rounded-2xl border border-white/10 bg-navy-2 py-1 shadow-2xl">
          <Link href={`/u/${username}`} onClick={() => setOpen(false)} className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
            <Avatar src={avatarUrl} className="h-10 w-10" />
            <div className="min-w-0">
              <span className="block truncate text-sm font-semibold text-white">Mi perfil</span>
              <span className="block truncate text-xs text-white/40">@{username}</span>
            </div>
          </Link>

          <Link href={`/u/${username}`} onClick={() => setOpen(false)} className={item}>
            <IconUser className="h-4 w-4" /> Perfil
          </Link>
          <Link href="/guardados" onClick={() => setOpen(false)} className={item}>
            <IconBookmark className="h-4 w-4" /> Guardados
          </Link>
          <Link href="/ajustes" onClick={() => setOpen(false)} className={item}>
            <span className="w-4 text-center">⚙</span> Ajustes
          </Link>
          <AdminLink onClick={() => setOpen(false)} className={item} />

          <button onClick={logout} className={`${item} w-full border-t border-white/10 text-red-400 hover:text-red-300`}>
            <span className="w-4 text-center">⏻</span> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}
