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
    <header className="sticky top-0 z-40 h-24 border-b border-white/10 bg-navy/90 backdrop-blur">
      <div className="mx-auto flex h-full max-w-[1920px] items-center justify-between px-6">
        <Link href="/feed" className="flex items-center gap-2.5">
          <MercuryMark className="h-[72px] w-9" />
        </Link>

        <div className="flex items-center gap-9">
          <button
            aria-label="Buscar"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-navy transition hover:brightness-95"
          >
            <IconSearch className="h-4 w-4" />
          </button>
          <div className="hidden items-center gap-9 sm:flex">
            {[IconBell, IconInbox, IconMasks, IconMapPeople].map((Icon, i) => (
              <button key={i} className="text-purple transition hover:text-purple-soft" aria-label="nav">
                <Icon className="h-6 w-6" />
              </button>
            ))}
          </div>
          <Link href={`/u/${username}`} aria-label="Mi perfil">
            <Avatar src={avatarUrl} className="h-12 w-12 ring-2 ring-purple/40" />
          </Link>
        </div>
      </div>
    </header>
  );
}
