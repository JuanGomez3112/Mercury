"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IconInbox } from "./icons";

export default function InboxLink() {
  const [n, setN] = useState(0);

  useEffect(() => {
    const load = () =>
      fetch("/api/messages/unread")
        .then((r) => r.json())
        .then((d) => setN(d.count ?? 0))
        .catch(() => {});
    load();
    const id = setInterval(load, 8000);
    return () => clearInterval(id);
  }, []);

  return (
    <Link href="/mensajes" className="relative text-purple transition hover:text-purple-soft" aria-label="Mensajes">
      <IconInbox className="h-6 w-6" />
      {n > 0 && (
        <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">
          {n > 9 ? "9+" : n}
        </span>
      )}
    </Link>
  );
}
