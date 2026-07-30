import Link from "next/link";
import MercuryMark from "./MercuryMark";
import InboxLink from "./InboxLink";
import NotifBell from "./NotifBell";
import ProfileMenu from "./ProfileMenu";
import { IconSearch, IconMasks, IconMapPeople } from "./icons";

export default function TopBar({
  username,
  avatarUrl,
}: {
  username: string;
  avatarUrl?: string | null;
}) {
  return (
    <header className="sticky top-0 z-40 h-24 border-b border-white/10 bg-navy/90 backdrop-blur">
      <div className="mx-auto flex h-full max-w-[1920px] items-center justify-between px-4 lg:px-32">
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
            <NotifBell />
            <InboxLink />
            <button className="text-purple transition hover:text-purple-soft" aria-label="Tabú">
              <IconMasks className="h-6 w-6" />
            </button>
            <button className="text-purple transition hover:text-purple-soft" aria-label="Mapa">
              <IconMapPeople className="h-6 w-6" />
            </button>
          </div>
          <ProfileMenu username={username} avatarUrl={avatarUrl} />
        </div>
      </div>
    </header>
  );
}
