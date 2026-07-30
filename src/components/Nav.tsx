import Link from "next/link";
import MercuryMark from "./MercuryMark";

export default function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-navy/70 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2.5">
          <MercuryMark className="h-6 w-3" />
          <span className="text-lg font-semibold tracking-wide text-white">Mercury</span>
        </Link>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href="/login"
            className="rounded-[1.25rem] border-2 border-white/20 px-4 py-1.5 font-bold text-white transition hover:border-purple hover:text-purple"
          >
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="rounded-[1.25rem] bg-purple px-4 py-1.5 font-black text-navy transition hover:brightness-95"
          >
            Registrate
          </Link>
        </div>
      </nav>
    </header>
  );
}
