import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Formata um número como moeda brasileira (BRL). */
export function formatCurrency(value: number | null | undefined): string {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

/** Formata número inteiro/decimal com separador brasileiro. */
export function formatNumber(value: number | null | undefined): string {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat("pt-BR").format(n);
}

/** Converte string vazia em null (útil para inputs opcionais). */
export function emptyToNull(value: FormDataEntryValue | null): string | null {
  if (value === null) return null;
  const s = String(value).trim();
  return s.length === 0 ? null : s;
}

/** Converte string em número ou null. */
export function toNumberOrNull(
  value: FormDataEntryValue | null,
): number | null {
  if (value === null) return null;
  const s = String(value).trim().replace(/\./g, "").replace(",", ".");
  if (s.length === 0) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
