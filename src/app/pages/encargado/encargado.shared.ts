// Utilidades comunes del panel del encargado.

export const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const MONTH_SHORT = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

export const JOB_TYPE_LABEL: Record<string, string> = {
  mudanza: "Mudanza",
  montaje: "Montaje",
  reforma: "Reforma",
};

export const MODE_LABEL: Record<string, string> = {
  fijo: "Sueldo fijo",
  hora: "Pago por hora",
  dia: "Pago por día",
};

export const MODE_EXPLAIN: Record<string, string> = {
  fijo: "Cobras el mismo sueldo cada mes. Los trabajos no suman dinero aparte.",
  hora: "Cobras por cada hora validada en trabajos aprobados por la secretaría.",
  dia: "Cobras por cada jornada validada en trabajos aprobados por la secretaría.",
};

/** Grupo de estado que ve el encargado. */
// Ya no existe "pendiente": todo trabajo nace confirmado.
export type JobGroup = "confirmados" | "terminados";

export function groupOf(status: string): JobGroup {
  if (status === "pendiente" || status === "confirmado" || status === "en_curso") return "confirmados";
  return "terminados"; // pendiente_revision y finalizado
}

export const GROUP_LABEL: Record<JobGroup, string> = {
  confirmados: "Confirmados",
  terminados: "Terminados",
};

/** Mes seleccionado (año + mes 1..12). */
export class MonthCursor {
  year: number;
  month: number;

  constructor(year?: number, month?: number) {
    const now = new Date();
    this.year = year ?? now.getFullYear();
    this.month = month ?? now.getMonth() + 1;
  }

  get name() {
    return MONTH_NAMES[this.month - 1];
  }

  get isCurrent() {
    const now = new Date();
    return this.year === now.getFullYear() && this.month === now.getMonth() + 1;
  }

  shift(delta: number) {
    const d = new Date(this.year, this.month - 1 + delta, 1);
    this.year = d.getFullYear();
    this.month = d.getMonth() + 1;
  }
}

export function typeLabel(t: string) {
  return JOB_TYPE_LABEL[t] ?? "Trabajo";
}

export function day(d: string | null | undefined) {
  return String(d || "").slice(8, 10);
}

export function monthShort(d: string | null | undefined) {
  return MONTH_SHORT[Number(String(d || "").slice(5, 7)) - 1] ?? "";
}

export function fmtDate(d: string | null | undefined) {
  const [y, m, dd] = String(d || "").slice(0, 10).split("-");
  return y && m && dd ? `${dd}/${m}/${y}` : "";
}

export function fmtTime(t: string | null | undefined) {
  return t ? String(t).slice(0, 5) : "";
}

export function monthLabelFromKey(key: string | null | undefined) {
  const [y, m] = String(key || "").split("-");
  const name = MONTH_NAMES[Number(m) - 1];
  return name && y ? `${name} ${y}` : "";
}

/** Número sin ceros sobrantes: 8 -> "8", 7.5 -> "7,5". */
export function num(n: number | null | undefined) {
  const v = Number(n) || 0;
  return (Math.round(v * 100) / 100).toLocaleString("es-ES", { maximumFractionDigits: 2 });
}

export function eur(n: number | null | undefined) {
  return (Number(n) || 0).toLocaleString("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
