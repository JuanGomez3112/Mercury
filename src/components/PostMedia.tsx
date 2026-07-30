"use client";

import { useEffect, useState } from "react";

/* eslint-disable @next/next/no-img-element */

function Tile({
  src,
  size,
  plus,
  onOpen,
}: {
  src: string;
  size: number;
  plus?: number;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative shrink-0 overflow-hidden rounded-lg"
      style={{ width: size, height: size }}
    >
      <img src={src} alt="" className="h-full w-full object-cover transition hover:opacity-90" />
      {plus ? (
        <div className="absolute inset-0 flex items-center justify-center bg-navy/[0.64] text-3xl font-bold text-white">
          +{plus}
        </div>
      ) : null}
    </button>
  );
}

export default function PostMedia({ images }: { images: string[] }) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i === null ? i : (i + 1) % images.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i === null ? i : (i - 1 + images.length) % images.length));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, images.length]);

  if (images.length === 0) return null;

  const grid =
    images.length === 1 ? (
      <button
        type="button"
        onClick={() => setOpen(0)}
        className="mt-4 block h-[640px] w-full overflow-hidden rounded-xl bg-navy"
      >
        <img src={images[0]} alt="" className="h-full w-full object-contain" />
      </button>
    ) : (
      (() => {
        const top = images.slice(0, 2);
        const bottom = images.slice(2, 5);
        const extra = images.length - 5;
        return (
          <div className="mt-4 flex w-fit flex-col gap-2">
            <div className="flex gap-2">
              {top.map((s, i) => (
                <Tile key={s} src={s} size={384} onOpen={() => setOpen(i)} />
              ))}
            </div>
            {bottom.length > 0 && (
              <div className="flex gap-2">
                {bottom.map((s, i) => {
                  const idx = 2 + i;
                  const isLast = i === bottom.length - 1;
                  return (
                    <Tile
                      key={s}
                      src={s}
                      size={256}
                      plus={isLast && extra > 0 ? extra : undefined}
                      onOpen={() => setOpen(idx)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })()
    );

  return (
    <>
      {grid}

      {open !== null && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setOpen(null)}
        >
          <button
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20"
            onClick={() => setOpen(null)}
            aria-label="Cerrar"
          >
            ×
          </button>

          {images.length > 1 && (
            <>
              <button
                className="absolute left-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((i) => (i === null ? i : (i - 1 + images.length) % images.length));
                }}
                aria-label="Anterior"
              >
                ‹
              </button>
              <button
                className="absolute right-4 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white transition hover:bg-white/20"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen((i) => (i === null ? i : (i + 1) % images.length));
                }}
                aria-label="Siguiente"
              >
                ›
              </button>
            </>
          )}

          <img
            src={images[open]}
            alt=""
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {images.length > 1 && (
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
              {open + 1} / {images.length}
            </span>
          )}
        </div>
      )}
    </>
  );
}
