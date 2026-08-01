"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { timeAgo } from "@/lib/time";
import { REASON_LABELS, TARGET_LABELS, type ReportReason, type ReportTarget } from "@/lib/moderation";

/* eslint-disable @next/next/no-img-element */

export type ReportGroup = {
  reportId: string;
  targetType: string;
  targetId: string;
  priority: boolean;
  createdAt: string;
  reports: { reason: string; note: string; reporter: string; at: string }[];
  preview: {
    exists: boolean;
    text?: string;
    image?: string;
    username?: string;
    banned?: boolean;
    suspended?: string;
  };
};

function reasonLabel(r: string): string {
  return REASON_LABELS[r as ReportReason] ?? r;
}
function targetLabel(t: string): string {
  return TARGET_LABELS[t as ReportTarget] ?? t;
}

export default function ModerationQueue({ groups }: { groups: ReportGroup[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [suspendDays, setSuspendDays] = useState<Record<string, number>>({});

  async function act(g: ReportGroup, action: "remove" | "ban" | "suspend" | "dismiss") {
    if (busy) return;
    if (action === "ban" && !confirm(`¿Banear a @${g.preview.username ?? "usuario"}? No podrá iniciar sesión ni escribir.`)) return;
    if (action === "remove" && !confirm("¿Eliminar este contenido? No se puede deshacer.")) return;

    setBusy(g.reportId);
    setError("");
    const body: { action: string; suspendDays?: number } = { action };
    if (action === "suspend") body.suspendDays = suspendDays[g.reportId] ?? 7;

    const res = await fetch(`/api/admin/reports/${g.reportId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusy(null);
    if (res.ok) {
      router.refresh();
    } else {
      const d = await res.json().catch(() => null);
      setError(d?.error ?? "No se pudo aplicar");
    }
  }

  const btn = "rounded-full px-3 py-1.5 text-xs font-medium transition disabled:opacity-40";

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white">Moderación</h1>
        <span className="text-sm text-white/40">{groups.length} pendientes</span>
      </div>

      {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>}

      {groups.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-navy-2/50 p-10 text-center text-white/40">
          Sin reportes pendientes. Todo limpio.
        </div>
      )}

      {groups.map((g) => {
        const isUser = g.targetType === "user";
        const targetHref =
          g.targetType === "user" && g.preview.username
            ? `/u/${g.preview.username}`
            : g.preview.username
              ? `/u/${g.preview.username}`
              : undefined;
        return (
          <div
            key={g.reportId}
            className={`rounded-2xl border p-5 ${
              g.priority ? "border-red-500/50 bg-red-500/[0.04]" : "border-white/10 bg-navy-2/50"
            }`}
          >
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {g.priority && (
                <span className="rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Prioridad roja
                </span>
              )}
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/70">{targetLabel(g.targetType)}</span>
              <span className="text-[11px] text-white/40">
                {g.reports.length} reporte{g.reports.length !== 1 ? "s" : ""} · {timeAgo(g.createdAt)}
              </span>
              {g.preview.banned && <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] text-red-300">ya baneado</span>}
              {g.preview.suspended && (
                <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] text-amber-300">suspendido</span>
              )}
            </div>

            {/* Preview del target */}
            <div className="mb-3 rounded-xl border border-white/10 bg-navy-1 p-3">
              {!g.preview.exists ? (
                <p className="text-sm italic text-white/40">Contenido eliminado o inexistente.</p>
              ) : (
                <div className="flex gap-3">
                  {g.preview.image && (
                    <img src={g.preview.image} alt="" className="h-16 w-16 shrink-0 rounded-lg object-cover" />
                  )}
                  <div className="min-w-0">
                    {g.preview.username && (
                      <div className="text-xs text-white/50">
                        {isUser ? "Cuenta: " : "Autor: "}
                        {targetHref ? (
                          <a href={targetHref} target="_blank" rel="noreferrer" className="text-purple hover:underline">
                            @{g.preview.username}
                          </a>
                        ) : (
                          <span>@{g.preview.username}</span>
                        )}
                      </div>
                    )}
                    {g.preview.text && <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-white/85">{g.preview.text}</p>}
                  </div>
                </div>
              )}
            </div>

            {/* Motivos reportados */}
            <div className="mb-4 space-y-1.5">
              {g.reports.map((r, i) => (
                <div key={i} className="text-sm">
                  <span className={`font-medium ${g.priority ? "text-red-300" : "text-white/80"}`}>{reasonLabel(r.reason)}</span>
                  <span className="text-white/40"> · @{r.reporter}</span>
                  {r.note && <span className="text-white/60"> — “{r.note}”</span>}
                </div>
              ))}
            </div>

            {/* Acciones */}
            <div className="flex flex-wrap items-center gap-2">
              {!isUser && (
                <button
                  onClick={() => act(g, "remove")}
                  disabled={busy === g.reportId || !g.preview.exists}
                  className={`${btn} bg-white/10 text-white hover:bg-white/20`}
                >
                  Eliminar contenido
                </button>
              )}
              <button
                onClick={() => act(g, "ban")}
                disabled={busy === g.reportId}
                className={`${btn} bg-red-500/80 text-white hover:bg-red-500`}
              >
                Banear autor
              </button>
              <div className="flex items-center gap-1">
                <select
                  value={suspendDays[g.reportId] ?? 7}
                  onChange={(e) => setSuspendDays((s) => ({ ...s, [g.reportId]: Number(e.target.value) }))}
                  className="rounded-full border border-white/10 bg-navy-1 px-2 py-1.5 text-xs text-white outline-none"
                >
                  <option value={1}>1 día</option>
                  <option value={7}>7 días</option>
                  <option value={30}>30 días</option>
                </select>
                <button
                  onClick={() => act(g, "suspend")}
                  disabled={busy === g.reportId}
                  className={`${btn} bg-amber-500/80 text-navy hover:bg-amber-500`}
                >
                  Suspender
                </button>
              </div>
              <button
                onClick={() => act(g, "dismiss")}
                disabled={busy === g.reportId}
                className={`${btn} text-white/50 hover:text-white`}
              >
                Descartar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
