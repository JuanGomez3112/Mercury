"use client";

import { useEffect, useRef, useState } from "react";
import { useOutside } from "@/lib/useOutside";
import { REPORT_REASONS, REASON_LABELS, type ReportTarget } from "@/lib/moderation";

type Props = {
  targetType: ReportTarget;
  targetId: string;
  onClose: () => void;
};

export default function ReportModal({ targetType, targetId, onClose }: Props) {
  const [reason, setReason] = useState<string>("");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const card = useRef<HTMLDivElement>(null);
  useOutside(card, onClose, true);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    if (!reason || sending) return;
    setSending(true);
    setError("");
    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetType, targetId, reason, note }),
    });
    setSending(false);
    if (res.ok) {
      setDone(true);
      setTimeout(onClose, 1400);
    } else {
      const d = await res.json().catch(() => null);
      setError(d?.error ?? "No se pudo enviar");
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
      <div ref={card} className="w-full max-w-md rounded-2xl border border-white/10 bg-navy-2 p-6 shadow-2xl">
        {done ? (
          <div className="py-6 text-center">
            <div className="mb-2 text-3xl">✓</div>
            <p className="text-sm text-white/80">Reporte enviado. Gracias por avisar.</p>
          </div>
        ) : (
          <>
            <h2 className="text-base font-semibold text-white">Reportar</h2>
            <p className="mt-1 text-xs text-white/50">Elige un motivo. Tu reporte es anónimo para el reportado.</p>

            <div className="mt-4 space-y-1.5">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
                    reason === r ? "border-purple/60 bg-purple/10 text-white" : "border-white/10 text-white/70 hover:bg-white/5"
                  }`}
                >
                  <input
                    type="radio"
                    name="reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-purple"
                  />
                  {REASON_LABELS[r]}
                </label>
              ))}
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Nota opcional (contexto para el moderador)…"
              className="mt-3 w-full resize-none rounded-xl border border-white/10 bg-navy-1 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-purple/40"
            />

            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

            <div className="mt-4 flex justify-end gap-2">
              <button onClick={onClose} className="rounded-full px-4 py-2 text-sm text-white/60 hover:text-white">
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={!reason || sending}
                className="rounded-full bg-gradient-to-tl from-purple to-purple-soft px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {sending ? "Enviando…" : "Enviar reporte"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
