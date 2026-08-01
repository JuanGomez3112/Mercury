// Moderación: motivos de reporte + helpers compartidos (client + server).

export const REPORT_TARGETS = ["post", "user", "comment", "message"] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

export const REPORT_REASONS = [
  "menor_edad",
  "no_consentido",
  "acoso",
  "spam",
  "suplantacion",
  "otro",
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

/** Motivos de prioridad roja: tope de la cola, acción manual inmediata. Línea roja del concepto. */
export const PRIORITY_REASONS: ReadonlySet<ReportReason> = new Set(["menor_edad", "no_consentido"]);

export function isPriority(reason: string): boolean {
  return PRIORITY_REASONS.has(reason as ReportReason);
}

/** Etiquetas en español para la UI. */
export const REASON_LABELS: Record<ReportReason, string> = {
  menor_edad: "Menor de edad",
  no_consentido: "Contenido no consentido",
  acoso: "Acoso o amenazas",
  spam: "Spam o estafa",
  suplantacion: "Suplantación de identidad",
  otro: "Otro",
};

export const TARGET_LABELS: Record<ReportTarget, string> = {
  post: "Publicación",
  user: "Usuario",
  comment: "Comentario",
  message: "Mensaje",
};
