"use client";

import { useRef, useState } from "react";

/** Publica la cámara del dispositivo vía WHIP a MediaMTX. Ruta = username, pass = streamKey. */
export default function LivePublisher({ username, streamKey }: { username: string; streamKey: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<"idle" | "starting" | "live" | "error">("idle");
  const [err, setErr] = useState("");

  function waitIce(pc: RTCPeerConnection) {
    return new Promise<void>((resolve) => {
      if (pc.iceGatheringState === "complete") return resolve();
      const check = () => { if (pc.iceGatheringState === "complete") { pc.removeEventListener("icegatheringstatechange", check); resolve(); } };
      pc.addEventListener("icegatheringstatechange", check);
      setTimeout(resolve, 2000);
    });
  }

  async function start() {
    setStatus("starting"); setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 720 }, audio: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      const pc = new RTCPeerConnection();
      pcRef.current = pc;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      await waitIce(pc);
      const url = `/whep/${username}/whip?user=${encodeURIComponent(username)}&pass=${encodeURIComponent(streamKey)}`;
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/sdp" }, body: pc.localDescription?.sdp ?? "" });
      if (!res.ok) throw new Error(`Servidor de video: ${res.status}`);
      const answer = await res.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answer });
      setStatus("live");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error");
      setStatus("error");
      stop();
    }
  }

  function stop() {
    pcRef.current?.close(); pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (status === "live") setStatus("idle");
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
        {status === "live" && <span className="absolute left-3 top-3 rounded-full bg-red-600 px-2.5 py-1 text-xs font-bold text-white">● EN VIVO</span>}
      </div>
      {status === "idle" || status === "error" ? (
        <button onClick={start} className="w-full rounded-xl bg-gradient-to-tl from-purple to-purple-soft px-5 py-3 text-sm font-semibold text-white">
          📹 Transmitir desde este dispositivo
        </button>
      ) : status === "starting" ? (
        <button disabled className="w-full rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white/60">Iniciando…</button>
      ) : (
        <button onClick={stop} className="w-full rounded-xl border-2 border-red-500/50 px-5 py-3 text-sm font-semibold text-red-400">Terminar transmisión</button>
      )}
      {err && <p className="text-sm text-red-400">{err}</p>}
    </div>
  );
}
