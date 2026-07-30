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
      className="rounded-[1.25rem] bg-purple px-4 py-1.5 text-sm font-black text-navy transition hover:brightness-95"
    >
      Cerrar sesión
    </button>
  );
}
