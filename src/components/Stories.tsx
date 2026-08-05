"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import { IconPlus } from "./icons";
import StoryViewer from "./StoryViewer";
import type { StoryGroup } from "@/lib/stories";

export type Me = { username: string; displayName: string | null; avatarUrl: string | null; mode?: string | null };

/* eslint-disable @next/next/no-img-element */
function StoryAvatar({ src, mode, ring }: { src?: string | null; mode?: string | null; ring?: "unseen" | "seen" | "mine" | "none" }) {
  const ringCls =
    ring === "unseen"
      ? "bg-gradient-to-tr from-purple to-purple-soft shadow-[0_0_12px_2px_rgba(147,121,242,0.55)]"
      : ring === "mine"
      ? "bg-gradient-to-tr from-purple to-purple-soft"
      : ring === "seen"
      ? "bg-white/15"
      : "bg-transparent";
  return (
    <div className="relative h-16 w-16">
      {mode === "devil" && (
        <img src="/Cuernos.svg" alt="" className="pointer-events-none absolute bottom-[calc(100%-6px)] left-1/2 z-0 h-7 w-[42px] -translate-x-1/2" />
      )}
      {mode === "angel" && (
        <img src="/Aurola.svg" alt="" className="pointer-events-none absolute bottom-[calc(100%+4px)] left-1/2 z-20 h-3 w-10 -translate-x-1/2" />
      )}
      <span className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full p-[3px] ${ringCls}`}>
        <Avatar src={src} className="h-full w-full ring-2 ring-navy-2" />
      </span>
    </div>
  );
}

export default function Stories({ me, groups }: { me: Me; groups: StoryGroup[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);

  const myGroup = groups.find((g) => g.isMe) ?? null;
  const others = groups.filter((g) => !g.isMe);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("files", file);
      const up = await fetch("/api/upload", { method: "POST", body: fd });
      const ud = await up.json().catch(() => ({}));
      if (!up.ok || !ud.urls?.[0]) throw new Error();
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mediaUrl: ud.urls[0], isVideo: file.type.startsWith("video/") }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const openGroup = (g: StoryGroup) => setViewer(groups.indexOf(g));

  return (
    <>
      <div className="group relative h-[168px] rounded-2xl border border-white/10 bg-navy-2/50 transition-colors duration-300 hover:border-purple/20 max-sm:h-[140px] max-sm:rounded-none max-sm:border-x-0">
        <div className="no-scrollbar relative h-full overflow-x-auto px-8 pb-5 pt-9 max-sm:px-4 max-sm:pb-3 max-sm:pt-8">
          <div className="flex w-max items-start gap-8 max-sm:gap-5">
            {/* Mi historia */}
            <div className="flex shrink-0 flex-col items-center">
              <div className="relative">
                <button onClick={() => (myGroup ? openGroup(myGroup) : fileRef.current?.click())} disabled={busy} aria-label="Tu historia">
                  <StoryAvatar src={me.avatarUrl} mode={me.mode} ring={myGroup ? "mine" : "none"} />
                </button>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={busy}
                  aria-label="Añadir historia"
                  className="absolute -bottom-0.5 -right-0.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-purple text-navy ring-2 ring-navy-2"
                >
                  <IconPlus className="h-3 w-3" />
                </button>
              </div>
              <span className="mt-1.5 block w-16 truncate text-center text-xs text-white/60">Tu historia</span>
            </div>

            <span className="mt-5 h-16 w-px shrink-0 bg-purple/50" />

            {/* Historias de los demás */}
            {others.length === 0 && (
              <span className="mt-6 text-sm text-white/30">Sé el primero en publicar una historia</span>
            )}
            {others.map((g) => (
              <button key={g.username} onClick={() => openGroup(g)} className="flex shrink-0 flex-col items-center">
                <StoryAvatar src={g.avatarUrl} mode={g.mode} ring={g.hasUnseen ? "unseen" : "seen"} />
                <span className="mt-1.5 block w-16 truncate text-center text-xs text-white/60">{g.displayName ?? g.username}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*,video/mp4,video/webm" hidden onChange={upload} />

      {viewer !== null && <StoryViewer groups={groups} start={viewer} onClose={() => { setViewer(null); router.refresh(); }} />}
    </>
  );
}
