"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import CartBadge from "./CartBadge";
import { IconGrid, IconSearch, IconFire, IconInbox, IconBell, IconUser, IconTable } from "./icons";

export default function LeftRail({ username }: { username: string }) {
  const path = usePathname();

  const items = [
    { icon: IconGrid, href: "/feed", label: "Inicio", match: (p: string) => p === "/feed" },
    { icon: IconSearch, href: "/feed?tab=explora", label: "Explorar", match: () => false },
    { icon: IconFire, href: "/feed?tab=tabu", label: "Tabú", match: () => false },
    { icon: IconInbox, href: "/mensajes", label: "Mensajes", match: (p: string) => p.startsWith("/mensajes") },
    { icon: IconTable, href: "/tienda", label: "Tienda", match: (p: string) => p.startsWith("/tienda") },
    { icon: IconBell, href: "/notificaciones", label: "Notificaciones", match: (p: string) => p.startsWith("/notificaciones") },
    { icon: IconUser, href: `/u/${username}`, label: "Perfil", match: (p: string) => p === `/u/${username}` },
  ];

  return (
    <nav className="sticky top-28 hidden h-max w-16 shrink-0 flex-col items-center gap-3 lg:flex">
      {items.map(({ icon: Icon, href, label, match }) => {
        const active = match(path);
        return (
          <Link
            key={label}
            href={href}
            aria-label={label}
            className={`relative flex h-12 w-12 items-center justify-center rounded-2xl transition ${
              active ? "bg-purple text-navy" : "bg-navy-2/60 text-white/60 hover:text-white"
            }`}
          >
            <Icon className="h-8 w-8" />
            {label === "Tienda" && (
              <span className="absolute right-1 top-1">
                <CartBadge />
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
