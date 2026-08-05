"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";

export default function HlsPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    let hls: Hls | null = null;

    if (v.canPlayType("application/vnd.apple.mpegurl")) {
      v.src = src;
    } else if (Hls.isSupported()) {
      hls = new Hls({ lowLatencyMode: true, liveSyncDurationCount: 3 });
      hls.loadSource(src);
      hls.attachMedia(v);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        // Reintentar si aún no hay señal (el broadcaster puede tardar)
        if (data.fatal) setTimeout(() => { hls?.loadSource(src); }, 2500);
      });
    }
    const onPlaying = () => setWaiting(false);
    v.addEventListener("playing", onPlaying);
    return () => { v.removeEventListener("playing", onPlaying); hls?.destroy(); };
  }, [src]);

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black max-sm:rounded-none">
      <video ref={ref} controls autoPlay playsInline muted className="h-full w-full" />
      {waiting && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-white/60">Conectando con la transmisión…</div>
      )}
    </div>
  );
}
