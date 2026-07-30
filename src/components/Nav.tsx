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
          <Link href="/login" className="text-white/80 transition hover:text-white">
            Iniciar sesión
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-purple px-4 py-2 font-medium text-navy transition hover:opacity-90"
          >
            Registrarte
          </Link>
        </div>
      </nav>
    </header>
  );
}
