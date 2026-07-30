import Link from "next/link";
import MercuryMark from "./MercuryMark";
import LogoutButton from "./LogoutButton";

export default function AppHeader({ username }: { username: string }) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy/70 backdrop-blur">
      <nav className="mx-auto flex max-w-2xl items-center justify-between px-6 py-4">
        <Link href="/feed" className="flex items-center gap-2.5">
          <MercuryMark className="h-6 w-3" />
          <span className="text-lg font-semibold tracking-wide text-white">Mercury</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href={`/u/${username}`}
            className="text-sm text-white/80 transition hover:text-white"
          >
            Mi perfil
          </Link>
          <LogoutButton />
        </div>
      </nav>
    </header>
  );
}
