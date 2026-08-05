import Link from "next/link";
import Avatar from "./Avatar";
import MoodSlider from "./MoodSlider";
import CartBadge from "./CartBadge";
import { IconGrid, IconSearch, IconFire, IconInbox, IconBookmark, IconUser, IconTable } from "./icons";

const nav = [
  { icon: IconGrid, label: "Inicio", href: "/feed?tab=feed", active: true },
  { icon: IconSearch, label: "Explorar", href: "/feed?tab=explora" },
  { icon: IconFire, label: "Tabú", href: "/feed?tab=tabu" },
  { icon: IconInbox, label: "Mensajes", href: "/mensajes" },
  { icon: IconTable, label: "Tienda", href: "/tienda" },
  { icon: IconBookmark, label: "Guardados", href: "/guardados" },
  { icon: IconUser, label: "Perfil", href: "#perfil" },
];

export default function LeftPanel({
  me,
}: {
  me: { username: string; displayName: string | null; avatarUrl: string | null; mode: string | null };
}) {
  const mood = me.mode === "angel" || me.mode === "devil" ? me.mode : null;
  return (
    <aside className="sticky top-28 hidden h-max w-96 shrink-0 flex-col gap-4 min-[1700px]:flex">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-navy-2/50 p-4">
        <Link href={`/u/${me.username}`} className="flex min-w-0 flex-1 items-center gap-3">
          <Avatar src={me.avatarUrl} className="h-12 w-12" />
          <div className="min-w-0">
            <span className="block truncate font-semibold text-white">{me.displayName ?? me.username}</span>
            <span className="block truncate text-xs text-white/40">@{me.username}</span>
          </div>
        </Link>
        <MoodSlider initial={mood} />
      </div>

      <nav className="rounded-2xl border border-white/10 bg-navy-2/50 p-3">
        {nav.map(({ icon: Icon, label, href, active }) => (
          <Link
            key={label}
            href={label === "Perfil" ? `/u/${me.username}` : href}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${
              active ? "bg-purple/15 text-purple" : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            <Icon className="h-5 w-5" />
            {label}
            {label === "Tienda" && <CartBadge />}
          </Link>
        ))}
        <Link
          href="/cartera"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium text-white/70 transition hover:bg-white/5 hover:text-white"
        >
          <span className="flex h-5 w-5 items-center justify-center">
            <span className="h-3.5 w-3.5 rounded-[3px] bg-gradient-to-tl from-purple to-purple-soft" />
          </span>
          Merycoin
        </Link>
      </nav>
    </aside>
  );
}
