import { createClient } from "@/lib/supabase/server";
import type { GeneratedInstallment } from "@/lib/installments";
import type { PaymentStatus } from "@/types";

/**
 * Códigos de erro que indicam que o recurso de parcelas ainda NÃO foi ativado
 * no banco (migração 002 não aplicada): tabela/coluna/enum inexistentes ou
 * ausentes no schema cache do PostgREST.
 */
const MISSING_FEATURE_CODES = new Set([
  "PGRST204", // coluna não encontrada no schema cache (em INSERT/UPDATE)
  "PGRST205", // tabela não encontrada no schema cache
  "42P01", // relação (tabela) inexistente
  "42703", // coluna inexistente
  "42704", // tipo/enum inexistente
]);

export function isMissingPaymentFeatureError(e: unknown): boolean {
  const code = (e as { code?: string } | null)?.code;
  return code ? MISSING_FEATURE_CODES.has(code) : false;
}

/**
 * Verifica (uma vez por chamada) se o recurso de parcelas está disponível no
 * banco — ou seja, se a tabela payment_installments existe. Usado para degradar
 * graciosamente quando a migração 002 ainda não foi aplicada.
 */
export async function paymentFeatureAvailable(): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("payment_installments")
    .select("id")
    .limit(1);
  if (error && isMissingPaymentFeatureError(error)) return false;
  return true;
}

/** Deriva o status de pagamento a partir do total e do valor recebido. */
export function derivePaymentStatusFromTotals(
  total: number,
  recebido: number,
): PaymentStatus {
  if (total > 0 && recebido >= total) return "pago_integralmente";
  if (recebido > 0) return "entrada_paga";
  return "aguardando_pagamento";
}

/**
 * Recalcula os totais do evento a partir das parcelas:
 *  - valor_entrada  = soma das parcelas pagas
 *  - valor_restante = soma das parcelas pendentes
 *  - status_pagamento derivado
 * Se o evento não tiver parcelas, não mexe (mantém o controle manual).
 */
export async function recalcEventFromInstallments(
  eventId: string,
): Promise<void> {
  const supabase = await createClient();

  const { data: parcelas, error } = await supabase
    .from("payment_installments")
    .select("valor, pago")
    .eq("event_id", eventId);

  // Recurso ainda não ativado no banco → não há o que recalcular.
  if (error && isMissingPaymentFeatureError(error)) return;
  if (!parcelas || parcelas.length === 0) return;

  let recebido = 0;
  let pendente = 0;
  for (const p of parcelas) {
    const v = Number(p.valor) || 0;
    if (p.pago) recebido += v;
    else pendente += v;
  }
  recebido = round2(recebido);
  pendente = round2(pendente);
  const total = round2(recebido + pendente);

  await supabase
    .from("events")
    .update({
      valor_entrada: recebido,
      valor_restante: pendente,
      status_pagamento: derivePaymentStatusFromTotals(total, recebido),
    })
    .eq("id", eventId);
}

/**
 * Substitui todas as parcelas de um evento pelas informadas e recalcula os
 * totais. Mantém o estado "pago" de parcelas que coincidirem pelo número, para
 * não perder baixas já feitas ao reeditar o cronograma.
 *
 * Retorna `true` se as parcelas foram salvas; `false` se o recurso ainda não
 * está disponível no banco (migração 002 não aplicada) — nesse caso o chamador
 * deve cair para o controle manual de valores, sem quebrar.
 */
export async function replaceInstallments(
  eventId: string,
  installments: GeneratedInstallment[],
): Promise<boolean> {
  const supabase = await createClient();

  // Preserva quais números já estavam pagos.
  const { data: existentes, error: selErr } = await supabase
    .from("payment_installments")
    .select("numero, pago")
    .eq("event_id", eventId);
  if (selErr) {
    if (isMissingPaymentFeatureError(selErr)) return false;
    throw selErr;
  }
  const pagosPorNumero = new Map<number, boolean>();
  for (const e of existentes ?? []) pagosPorNumero.set(e.numero, e.pago);

  const { error: delErr } = await supabase
    .from("payment_installments")
    .delete()
    .eq("event_id", eventId);
  if (delErr) {
    if (isMissingPaymentFeatureError(delErr)) return false;
    throw delErr;
  }

  if (installments.length > 0) {
    const { error: insErr } = await supabase.from("payment_installments").insert(
      installments.map((i) => ({
        event_id: eventId,
        numero: i.numero,
        data_vencimento: i.data_vencimento,
        valor: i.valor,
        pago: pagosPorNumero.get(i.numero) ?? false,
      })),
    );
    if (insErr) {
      if (isMissingPaymentFeatureError(insErr)) return false;
      throw insErr;
    }
  }

  await recalcEventFromInstallments(eventId);
  return true;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
