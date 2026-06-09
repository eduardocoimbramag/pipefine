/**
 * Geração do cronograma de parcelas a partir da forma de pagamento.
 *
 * Arquivo PURO (sem dependências de servidor): usado tanto no formulário
 * (pré-visualização no navegador) quanto na Server Action (gravação).
 */
import {
  addMonths,
  subDays,
  format,
  parseISO,
  isValid,
} from "date-fns";
import type { PaymentMethod } from "@/types";

export interface GeneratedInstallment {
  numero: number;
  data_vencimento: string; // yyyy-MM-dd
  valor: number;
}

function toISO(d: Date): string {
  return format(d, "yyyy-MM-dd");
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Distribui um total em N parcelas iguais, ajustando os centavos na última. */
export function splitEqually(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const base = round2(total / parts);
  const valores = Array(parts).fill(base) as number[];
  const soma = round2(base * parts);
  const diff = round2(total - soma);
  valores[parts - 1] = round2(valores[parts - 1] + diff);
  return valores;
}

export interface InstallmentParams {
  method: PaymentMethod;
  valorTotal: number;
  dataEvento: string; // yyyy-MM-dd
  /** Parcelamento: data da 1ª parcela (yyyy-MM-dd). */
  primeiraParcela?: string;
  /** Parcelamento: número de parcelas. */
  numeroParcelas?: number;
  /** 50/50: data da 1ª parcela (reserva). Padrão = hoje. */
  dataReserva?: string;
  /** 50/50: data da 2ª parcela. Padrão = 5 dias antes do evento. */
  dataSegunda?: string;
  /** Total: data do pagamento. Padrão = data do evento. */
  dataPagamento?: string;
  /** Hoje (yyyy-MM-dd), injetado pelo chamador (evita Date.now em alguns contextos). */
  hoje: string;
}

/**
 * Gera as parcelas conforme a forma de pagamento.
 * Para "parcelado", divide igualmente por padrão — os valores podem ser
 * editados depois pelo usuário na interface.
 */
export function generateInstallments(
  p: InstallmentParams,
): GeneratedInstallment[] {
  const total = round2(p.valorTotal || 0);

  if (p.method === "total") {
    const data = p.dataPagamento || p.dataEvento || p.hoje;
    return [{ numero: 1, data_vencimento: data, valor: total }];
  }

  if (p.method === "entrada_50_50") {
    const metade = round2(total / 2);
    const segunda = round2(total - metade);
    const dataReserva = p.dataReserva || p.hoje;
    const dataSegunda =
      p.dataSegunda || defaultCincoDiasAntes(p.dataEvento, p.hoje);
    return [
      { numero: 1, data_vencimento: dataReserva, valor: metade },
      { numero: 2, data_vencimento: dataSegunda, valor: segunda },
    ];
  }

  // parcelado
  const n = Math.max(1, Math.round(p.numeroParcelas || 1));
  const inicio = p.primeiraParcela || p.hoje;
  const inicioDate = parseDateSafe(inicio) ?? parseDateSafe(p.hoje)!;
  const valores = splitEqually(total, n);
  return Array.from({ length: n }, (_, i) => ({
    numero: i + 1,
    data_vencimento: toISO(addMonths(inicioDate, i)),
    valor: valores[i],
  }));
}

/** Sugestão de número de parcelas: meses do início do parcelamento até o evento. */
export function suggestNumeroParcelas(
  primeiraParcela: string,
  dataEvento: string,
): number {
  const a = parseDateSafe(primeiraParcela);
  const b = parseDateSafe(dataEvento);
  if (!a || !b) return 1;
  const meses =
    (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());
  return Math.max(1, meses + 1); // inclui o mês inicial e o do evento
}

function defaultCincoDiasAntes(dataEvento: string, hoje: string): string {
  const ev = parseDateSafe(dataEvento);
  if (!ev) return hoje;
  return toISO(subDays(ev, 5));
}

function parseDateSafe(value: string | undefined): Date | null {
  if (!value) return null;
  const d = parseISO(value);
  return isValid(d) ? d : null;
}
