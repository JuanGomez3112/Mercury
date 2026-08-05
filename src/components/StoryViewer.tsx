"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Avatar from "./Avatar";
import { timeAgo } from "@/lib/time";
import type { StoryGroup } from "@/lib/stories";

const IMG_MS = 5000;

/* eslint-disable @next/next/no-img-element */
export default function StoryViewer({
  groups,
  start,
  onClose,
}: {
  groups: StoryGroup[];
  start: number;
  onClose: () => void;
}) {
  const [gi, setGi] = useState(start);
  const [ii, setII] = useState(0);
  const [progress, setProgress] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const raf = useRef<number | null>(null);

  const group = groups[gi];
  const item = group?.items[ii];

  const clearTimers = () => {
    if (timer.current) clearTimeout(timer.current);
    if (raf.current) cancelAnimationFrame(raf.current);
  };

  const close = useCallback(() => { clearTimers(); onClose(); }, [onClose]);

  const next = useCallback(() => {
    clearTimers();
    if (!group) return close();
    if (ii + 1 < group.items.length) { setII(ii + 1); return; }
    if (gi + 1 < groups.length) { setGi(gi + 1); setII(0); return; }
    close();
  }, [gi, ii, group, groups.length, close]);

  const prev = useCallback(() => {
    clearTimers();
    if (ii > 0) { setII(ii - 1); return; }
    if (gi > 0) { const pg = groups[gi - 1]; setGi(gi - 1); setII(pg.items.length - 1); return; }
    setProgress(0);
  }, [gi, ii, groups]);

  // Marcar visto + temporizador de avance (imágenes)
  useEffect(() => {
    if (!item) return;
    setProgress(0);
    fetch(`/api/stories/${item.id}`, { method: "POST" }).catch(() => {});

    if (!item.isVideo) {
      const startT = Date.now();
      const tick = () => {
        const p = Math.min(1, (Date.now() - startT) / IMG_MS);
        setProgress(p);
        if (p < 1) raf.current = requestAnimationFrame(tick);
      };
      raf.current = requestAnimationFrame(tick);
      timer.current = setTimeout(next, IMG_MS);
    }
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gi, ii]);

  // Teclado (desktop)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, close]);

  if (!group || !item) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black">
      <div className="relative h-full w-full max-w-[500px]">
        {/* Barras de progreso */}
        <div className="absolute inset-x-0 top-0 z-20 flex gap-1 p-2">
          {group.items.map((it, idx) => (
            <div key={it.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
              <div
                className="h-full bg-white"
                style={{ width: idx < ii ? "100%" : idx === ii ? `${progress * 100}%` : "0%" }}
              />
            </div>
          ))}
        </div>

        {/* Cabecera */}
        <div className="absolute inset-x-0 top-4 z-20 flex items-center gap-3 px-4 pt-2">
          <Link href={`/u/${group.username}`} onClick={close}>
            <Avatar src={group.avatarUrl} className="h-9 w-9 ring-2 ring-white/40" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{group.displayName ?? group.username}</p>
            <p className="text-xs text-white/60">{timeAgo(item.createdAt)}</p>
          </div>
          <button onClick={close} aria-label="Cerrar" className="text-2xl leading-none text-white/80">×</button>
        </div>

        {/* Media */}
        <div className="flex h-full items-center justify-center">
          {item.isVideo ? (
            <video
              key={item.id}
              src={item.mediaUrl}
              className="max-h-full max-w-full"
              autoPlay
              playsInline
              onEnded={next}
            />
          ) : (
            <img key={item.id} src={item.mediaUrl} alt="" className="max-h-full max-w-full object-contain" />
          )}
        </div>

        {/* Zonas de toque */}
        <button onClick={prev} aria-label="Anterior" className="absolute inset-y-0 left-0 z-10 w-1/3" />
        <button onClick={next} aria-label="Siguiente" className="absolute inset-y-0 right-0 z-10 w-2/3" />
      </div>
    </div>
  );
}
