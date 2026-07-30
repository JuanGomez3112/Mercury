import Link from "next/link";
import MercuryMark from "./MercuryMark";
import Avatar from "./Avatar";
import { IconSearch, IconBell, IconInbox, IconMasks, IconMapPeople } from "./icons";

export default function TopBar({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl?: string | null;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/feed" className="flex items-center gap-2.5">
          <MercuryMark className="h-7 w-3.5" />
          <span className="hidden text-lg font-semibold tracking-wide text-white sm:block">Mercury</span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            aria-label="Buscar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-navy transition hover:brightness-95"
          >
            <IconSearch className="h-4 w-4" />
          </button>
          {[IconBell, IconInbox, IconMasks, IconMapPeople].map((Icon, i) => (
            <button
              key={i}
              className="hidden h-9 w-9 items-center justify-center rounded-full text-purple transition hover:bg-white/5 sm:flex"
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
          <Link href={`/u/${username}`} aria-label="Mi perfil">
            <Avatar src={avatarUrl} className="h-9 w-9 ring-2 ring-purple/40" />
          </Link>
        </div>
      </div>
    </header>
  );
}
