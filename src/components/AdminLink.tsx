"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** Enlace al panel admin — solo se muestra si el usuario es admin. Autocontenido. */
export default function AdminLink({ className, onClick }: { className?: string; onClick?: () => void }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetch("/api/me/is-admin")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!ignore && d?.isAdmin) setIsAdmin(true);
      });
    return () => {
      ignore = true;
    };
  }, []);

  if (!isAdmin) return null;
  return (
    <Link href="/admin" onClick={onClick} className={className}>
      <span className="w-4 text-center">🛠</span> Panel admin
    </Link>
  );
}
