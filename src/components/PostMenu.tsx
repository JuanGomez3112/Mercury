"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useOutside } from "@/lib/useOutside";
import { IconMore } from "./icons";
import ReportModal from "./ReportModal";

export default function PostMenu({ postId, isMine }: { postId: string; isMine: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);

  async function copiarEnlace() {
    const url = `${window.location.origin}/p/${postId}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Fallback si el portapapeles no está disponible (http/permiso).
      const ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => { setCopied(false); setOpen(false); }, 1000);
  }

  async function borrar() {
    setOpen(false);
    if (!confirm("¿Borrar esta publicación?")) return;
    const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  const item = "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-white/5";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
          open
            ? "bg-gradient-to-tl from-purple to-purple-soft text-white"
            : "bg-purple/20 text-purple hover:bg-purple hover:text-white"
        }`}
        aria-label="Opciones"
      >
        <IconMore className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-navy-2 py-1 shadow-2xl">
          <button onClick={() => { setOpen(false); setReporting(true); }} className={`${item} text-white/80 hover:text-white`}>
            Reportar
          </button>
          <button onClick={copiarEnlace} className={`${item} text-white/80 hover:text-white`}>
            {copied ? "¡Enlace copiado!" : "Copiar enlace"}
          </button>
          {isMine && (
            <button onClick={borrar} className={`${item} border-t border-white/10 text-red-400 hover:text-red-300`}>
              Borrar publicación
            </button>
          )}
        </div>
      )}

      {reporting && <ReportModal targetType="post" targetId={postId} onClose={() => setReporting(false)} />}
    </div>
  );
}
