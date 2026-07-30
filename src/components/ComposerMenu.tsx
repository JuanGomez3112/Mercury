"use client";

import { useRef, useState } from "react";
import { useOutside } from "@/lib/useOutside";
import { IconMore } from "./icons";

const options = [
  "Privacidad de la publicación",
  "Quién puede comentar",
  "Programar publicación",
  "Configuración avanzada",
];

export default function ComposerMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useOutside(ref, () => setOpen(false), open);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
          open
            ? "bg-gradient-to-tl from-purple to-purple-soft text-white"
            : "bg-purple/20 text-purple hover:bg-purple hover:text-white"
        }`}
        aria-label="Más opciones"
      >
        <IconMore className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-white/10 bg-navy-2 py-1 shadow-2xl">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => { setOpen(false); alert(`${o} (pendiente)`); }}
              className="flex w-full items-center px-4 py-2.5 text-left text-sm text-white/80 transition hover:bg-white/5 hover:text-white"
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
