"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconGrid, IconInbox, IconBell, IconUser } from "./icons";

/** Navegación inferior fija para móvil. Publicar al centro (FAB). Oculta en desktop (rail lateral). */
export default function MobileNav() {
  const path = usePathname();

  const item = (href: string, label: string, Icon: ComponentType<{ className?: string }>, active: boolean) => (
    <Link
      href={href}
      aria-label={label}
      className={`flex h-14 flex-1 items-center justify-center transition ${active ? "text-purple" : "text-white/50 hover:text-white/80"}`}
    >
      <Icon className="h-7 w-7" />
    </Link>
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-white/10 bg-navy/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      {item("/feed", "Inicio", IconGrid, path === "/feed")}
      {item("/mensajes", "Mensajes", IconInbox, path.startsWith("/mensajes"))}

      {/* Publicar (centro, FAB elevado) — en su propio slot flex-1 para espaciado uniforme */}
      <div className="flex flex-1 items-center justify-center">
        <Link
          href="/publicar"
          aria-label="Publicar"
          className="relative -top-1.5 flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-tl from-purple to-purple-soft text-2xl font-light leading-none text-white shadow-md shadow-purple/40"
        >
          +
        </Link>
      </div>

      {item("/notificaciones", "Notificaciones", IconBell, path.startsWith("/notificaciones"))}
      {item("/opciones", "Menú", IconUser, path === "/opciones")}
    </nav>
  );
}
