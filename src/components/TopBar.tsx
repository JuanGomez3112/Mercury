import Link from "next/link";
import MercuryMark from "./MercuryMark";
import InboxLink from "./InboxLink";
import NotifBell from "./NotifBell";
import ProfileMenu from "./ProfileMenu";
import SearchBar from "./SearchBar";
import WalletBadge from "./WalletBadge";
import { IconMasks, IconMapPeople } from "./icons";

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
          <SearchBar />
          <div className="hidden items-center gap-4 sm:flex">
            <WalletBadge />
            <NotifBell />
            <InboxLink />
            <button className="flex h-10 w-10 items-center justify-center rounded-full text-purple transition-all duration-200 hover:bg-purple/15" aria-label="Tabú">
              <IconMasks className="!h-6 !w-6" />
            </button>
            <button className="flex h-10 w-10 items-center justify-center rounded-full text-purple transition-all duration-200 hover:bg-purple/15" aria-label="Mapa">
              <IconMapPeople className="!h-6 !w-6" />
            </button>
          </div>
          <ProfileMenu username={username} avatarUrl={avatarUrl} />
        </div>
      </div>
    </header>
  );
}
