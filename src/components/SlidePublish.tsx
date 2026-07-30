"use client";

import { useRef, useState } from "react";
import MercuryMark from "./MercuryMark";

const TRACK = 92; // alto de la cápsula (px)
const KNOB = 40; // diámetro del knob
const PAD = 4;
const TRAVEL = TRACK - KNOB - PAD * 2; // recorrido máximo
const THRESHOLD = TRAVEL * 0.6; // umbral para publicar

export default function SlidePublish({
  onPublish,
  disabled,
  loading,
}: {
  onPublish: () => void | Promise<void>;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [y, setY] = useState(0);
  const dragging = useRef(false);
  const startY = useRef(0);

  function down(e: React.PointerEvent) {
    if (disabled || loading) return;
    dragging.current = true;
    startY.current = e.clientY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent) {
    if (!dragging.current) return;
    const dy = Math.min(TRAVEL, Math.max(0, e.clientY - startY.current));
    setY(dy);
  }
  async function up() {
    if (!dragging.current) return;
    dragging.current = false;
    if (y >= THRESHOLD) {
      await onPublish();
    }
    setY(0);
  }

  return (
    <div
      className="relative shrink-0 rounded-full bg-purple/25"
      style={{ width: KNOB + PAD * 2, height: TRACK }}
      title="Desliza hacia abajo para publicar"
    >
      <button
        type="button"
        aria-label="Deslizar para publicar"
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled && !loading) {
            e.preventDefault();
            onPublish();
          }
        }}
        disabled={disabled || loading}
        className="absolute left-1/2 flex items-center justify-center rounded-full bg-purple text-navy shadow-lg transition-transform touch-none disabled:opacity-50"
        style={{
          width: KNOB,
          height: KNOB,
          top: PAD,
          transform: `translate(-50%, ${y}px)`,
          transition: dragging.current ? "none" : "transform 0.2s ease",
          cursor: disabled ? "default" : "grab",
        }}
      >
        {loading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-navy border-t-transparent" />
        ) : (
          <MercuryMark navy className="h-5 w-2.5" />
        )}
      </button>
    </div>
  );
}
