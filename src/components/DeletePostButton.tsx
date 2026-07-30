"use client";

import { useRouter } from "next/navigation";

export default function DeletePostButton({ postId }: { postId: string }) {
  const router = useRouter();
  return (
    <button
      onClick={async () => {
        if (!confirm("¿Borrar esta publicación?")) return;
        const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
        if (res.ok) router.refresh();
      }}
      className="text-sm text-white/40 transition hover:text-red-400"
      aria-label="Borrar"
    >
      Borrar
    </button>
  );
}
