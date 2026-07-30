"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
      className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white transition hover:bg-white/5"
    >
      Cerrar sesión
    </button>
  );
}
