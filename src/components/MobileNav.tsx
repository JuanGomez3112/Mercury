"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import CartBadge from "./CartBadge";
import { IconGrid, IconInbox, IconTable, IconBell, IconUser } from "./icons";

/** Navegación inferior fija para móvil. Oculta en desktop (donde está el rail lateral). */
export default function MobileNav({ username }: { username: string }) {
  const path = usePathname();

  const items = [
    { icon: IconGrid, href: "/feed", label: "Inicio", match: (p: string) => p === "/feed" },
    { icon: IconInbox, href: "/mensajes", label: "Mensajes", match: (p: string) => p.startsWith("/mensajes") },
    { icon: IconTable, href: "/tienda", label: "Tienda", match: (p: string) => p.startsWith("/tienda"), badge: true },
    { icon: IconBell, href: "/notificaciones", label: "Notificaciones", match: (p: string) => p.startsWith("/notificaciones") },
    { icon: IconUser, href: `/u/${username}`, label: "Perfil", match: (p: string) => p === `/u/${username}` },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-stretch justify-around border-t border-white/10 bg-navy/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {items.map(({ icon: Icon, href, label, match, badge }) => {
        const active = match(path);
        return (
          <Link
            key={label}
            href={href}
            aria-label={label}
            className={`relative flex h-14 flex-1 items-center justify-center transition ${
              active ? "text-purple" : "text-white/50 hover:text-white/80"
            }`}
          >
            <Icon className="h-7 w-7" />
            {badge && (
              <span className="absolute right-[28%] top-2.5">
                <CartBadge />
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
