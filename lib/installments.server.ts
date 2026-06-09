import { createClient } from "@/lib/supabase/server";
import type { GeneratedInstallment } from "@/lib/installments";
import type { PaymentStatus } from "@/types";

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

  const { data: parcelas } = await supabase
    .from("payment_installments")
    .select("valor, pago")
    .eq("event_id", eventId);

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
 */
export async function replaceInstallments(
  eventId: string,
  installments: GeneratedInstallment[],
): Promise<void> {
  const supabase = await createClient();

  // Preserva quais números já estavam pagos.
  const { data: existentes } = await supabase
    .from("payment_installments")
    .select("numero, pago")
    .eq("event_id", eventId);
  const pagosPorNumero = new Map<number, boolean>();
  for (const e of existentes ?? []) pagosPorNumero.set(e.numero, e.pago);

  await supabase
    .from("payment_installments")
    .delete()
    .eq("event_id", eventId);

  if (installments.length > 0) {
    await supabase.from("payment_installments").insert(
      installments.map((i) => ({
        event_id: eventId,
        numero: i.numero,
        data_vencimento: i.data_vencimento,
        valor: i.valor,
        pago: pagosPorNumero.get(i.numero) ?? false,
      })),
    );
  }

  await recalcEventFromInstallments(eventId);
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
