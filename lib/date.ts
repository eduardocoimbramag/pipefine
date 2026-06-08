import {
  format,
  parseISO,
  isValid,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  addDays,
  isToday,
  isPast,
} from "date-fns";
import { ptBR } from "date-fns/locale";

/** Converte string (ISO/date) em Date de forma segura. */
function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = typeof value === "string" ? parseISO(value) : value;
  return isValid(d) ? d : null;
}

/** Formata data: 05/06/2026 */
export function formatDate(value: string | Date | null | undefined): string {
  const d = toDate(value);
  return d ? format(d, "dd/MM/yyyy", { locale: ptBR }) : "—";
}

/** Formata data e hora: 05/06/2026 14:30 */
export function formatDateTime(
  value: string | Date | null | undefined,
): string {
  const d = toDate(value);
  return d ? format(d, "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—";
}

/** Formata mês por extenso: Junho de 2026 */
export function formatMonthYear(value: string | Date): string {
  const d = toDate(value);
  return d ? format(d, "MMMM 'de' yyyy", { locale: ptBR }) : "—";
}

/** Nome curto do mês: Jun */
export function formatMonthShort(value: string | Date): string {
  const d = toDate(value);
  return d ? format(d, "MMM", { locale: ptBR }) : "";
}

/** Retorna data no formato yyyy-MM-dd (para inputs e queries). */
export function toISODate(value: string | Date): string {
  const d = toDate(value) ?? new Date();
  return format(d, "yyyy-MM-dd");
}

/** Hoje em yyyy-MM-dd. */
export function todayISO(): string {
  return format(new Date(), "yyyy-MM-dd");
}

/** Adiciona N dias e retorna yyyy-MM-dd. */
export function addDaysISO(days: number, from: Date = new Date()): string {
  return format(addDays(from, days), "yyyy-MM-dd");
}

/** Verifica se uma data (yyyy-MM-dd) está vencida (passada e não hoje). */
export function isOverdue(value: string | null | undefined): boolean {
  const d = toDate(value);
  if (!d) return false;
  return isPast(d) && !isToday(d);
}

export function isDateToday(value: string | null | undefined): boolean {
  const d = toDate(value);
  return d ? isToday(d) : false;
}

/** Intervalo do mês atual (ou de uma referência) em ISO. */
export function monthRange(ref: Date = new Date()) {
  return {
    start: format(startOfMonth(ref), "yyyy-MM-dd"),
    end: format(endOfMonth(ref), "yyyy-MM-dd"),
  };
}

/** Intervalo do mês anterior. */
export function previousMonthRange(ref: Date = new Date()) {
  return monthRange(subMonths(ref, 1));
}

/** Intervalo do ano em ISO. */
export function yearRange(ref: Date = new Date()) {
  return {
    start: format(startOfYear(ref), "yyyy-MM-dd"),
    end: format(endOfYear(ref), "yyyy-MM-dd"),
  };
}

export { startOfMonth, endOfMonth, subMonths };
