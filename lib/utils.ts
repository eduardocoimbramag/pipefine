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

/** Arredonda para centavos (evita ruído de ponto flutuante em somas). */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Converte string em número ou null, aceitando tanto o formato brasileiro
 * ("1.943,50") quanto o formato de máquina ("1943.50").
 *
 * A ambiguidade do ponto é resolvida pelo padrão: só é tratado como separador
 * de milhar quando aparece agrupando exatamente 3 dígitos ("1.943", "1.943.500").
 * Em qualquer outro caso ("1943.50", "1943.5") ele é o separador decimal —
 * é assim que todo `<input type="number">` serializa o valor.
 */
export function toNumberOrNull(
  value: FormDataEntryValue | null,
): number | null {
  if (value === null) return null;

  // Remove tudo que não for dígito, separador ou sinal (R$, espaços, NBSP...).
  const raw = String(value).trim().replace(/[^\d.,-]/g, "");
  if (raw.length === 0) return null;

  const negativo = raw.startsWith("-");
  let s = raw.replace(/-/g, "");

  const ultimaVirgula = s.lastIndexOf(",");
  const ultimoPonto = s.lastIndexOf(".");

  if (ultimaVirgula >= 0 && ultimoPonto >= 0) {
    // Os dois presentes: o último a aparecer é o decimal, o outro é milhar.
    const decimal = ultimaVirgula > ultimoPonto ? "," : ".";
    const milhar = decimal === "," ? /\./g : /,/g;
    s = s.replace(milhar, "").replace(decimal, ".");
  } else if (ultimaVirgula >= 0) {
    // Só vírgula: decimal (pt-BR), salvo se for agrupamento no padrão en-US.
    s = /^\d{1,3}(,\d{3})+$/.test(s)
      ? s.replace(/,/g, "")
      : s.replace(",", ".");
  } else if (ultimoPonto >= 0 && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    // Só pontos agrupando milhares ("1.943", "1.943.500").
    s = s.replace(/\./g, "");
  }

  if (s.length === 0) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negativo ? -n : n;
}

/** Lê um valor monetário de um formulário, já arredondado aos centavos. */
export function parseMoney(value: FormDataEntryValue | null): number | null {
  const n = toNumberOrNull(value);
  return n === null ? null : roundMoney(n);
}

/**
 * Serializa um valor monetário para campos ocultos / FormData, sempre com
 * ponto decimal e 2 casas ("1943.50") — formato inequívoco para o servidor.
 */
export function moneyToFormValue(value: number | null | undefined): string {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  return roundMoney(n).toFixed(2);
}
