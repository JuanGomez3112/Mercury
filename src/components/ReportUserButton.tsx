"use client";

import { useState } from "react";
import ReportModal from "./ReportModal";

/** Botón "Reportar" para el perfil de un usuario. Abre ReportModal con targetType=user. */
export default function ReportUserButton({ targetId }: { targetId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Reportar usuario"
        className="rounded-[1.25rem] border-2 border-white/10 px-3 py-2 text-sm font-bold text-white/50 transition hover:border-red-400/60 hover:text-red-400"
      >
        Reportar
      </button>
      {open && <ReportModal targetType="user" targetId={targetId} onClose={() => setOpen(false)} />}
    </>
  );
}
