import Link from "next/link";
import { IconGrid, IconSearch, IconFire, IconInbox, IconMapPeople } from "./icons";

const items = [
  { icon: IconGrid, href: "/feed", label: "Inicio", active: true },
  { icon: IconSearch, href: "/feed", label: "Explorar" },
  { icon: IconFire, href: "/feed", label: "Tabú" },
  { icon: IconInbox, href: "/feed", label: "Mensajes" },
  { icon: IconMapPeople, href: "/feed", label: "Mapa" },
];

export default function LeftRail() {
  return (
    <nav className="sticky top-28 hidden h-max w-16 shrink-0 flex-col items-center gap-3 lg:flex">
      {items.map(({ icon: Icon, href, label, active }) => (
        <Link
          key={label}
          href={href}
          aria-label={label}
          className={`flex h-12 w-12 items-center justify-center rounded-2xl transition ${
            active ? "bg-purple text-navy" : "bg-navy-2/60 text-white/60 hover:text-white"
          }`}
        >
          <Icon className="h-8 w-8" />
        </Link>
      ))}
    </nav>
  );
}
