import { useEffect, type RefObject } from "react";

/** Llama onOut cuando se hace click fuera del ref (mientras active). */
export function useOutside(
  ref: RefObject<HTMLElement | null>,
  onOut: () => void,
  active = true,
) {
  useEffect(() => {
    if (!active) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOut();
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [active, ref, onOut]);
}
