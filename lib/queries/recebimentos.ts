import { createClient } from "@/lib/supabase/server";
import { todayISO, monthRange } from "@/lib/date";
import { isMissingPaymentFeatureError } from "@/lib/installments.server";
import type { PaymentInstallment } from "@/types";

/**
 * Parcela enriquecida com os dados do evento ao qual pertence (cliente, data
 * do evento) — usada nas listagens de "Acompanhamento de recebimentos".
 */
export type InstallmentWithEvent = PaymentInstallment & {
  event: {
    id: string;
    nome_cliente: string;
    data_evento: string;
    company_id: string;
  } | null;
};

export interface RecebimentosSummary {
  /** Parcelas pendentes que vencem no mês vigente. */
  aReceberMes: number;
  /** Parcelas do mês vigente que já estão pagas. */
  recebidoMes: number;
  /** Parcelas pendentes já vencidas (vencimento < hoje). */
  atrasado: number;
  /** Parcelas pendentes vencidas, mais antigas primeiro. */
  atrasadas: InstallmentWithEvent[];
  /** Todas as parcelas (pagas e pendentes) que vencem no mês vigente. */
  doMes: InstallmentWithEvent[];
}

/**
 * Embed do evento. Usamos `!inner` quando há filtro por empresa para que o
 * filtro em `events.company_id` realmente restrinja as parcelas (join interno).
 */
const installmentSelect = (innerEvent: boolean) => `
  *,
  event:events${innerEvent ? "!inner" : ""} ( id, nome_cliente, data_evento, company_id )
`;

const EMPTY: RecebimentosSummary = {
  aReceberMes: 0,
  recebidoMes: 0,
  atrasado: 0,
  atrasadas: [],
  doMes: [],
};

/**
 * Dados do painel de acompanhamento de recebimentos, escopados pela empresa
 * em foco (`companyId`). Lê as parcelas (payment_installments) e as agrupa em
 * atrasadas e do mês vigente, somando os totais por categoria.
 */
export async function getRecebimentosSummary(
  companyId?: string,
): Promise<RecebimentosSummary> {
  const supabase = await createClient();
  const today = todayISO();
  const { start: mesInicio, end: mesFim } = monthRange();

  // Parcelas atrasadas: pendentes com vencimento anterior a hoje.
  const atrasadasQuery = supabase
    .from("payment_installments")
    .select(installmentSelect(Boolean(companyId)))
    .eq("pago", false)
    .lt("data_vencimento", today)
    .order("data_vencimento", { ascending: true });

  // Parcelas do mês vigente: qualquer status, vencimento dentro do mês.
  const doMesQuery = supabase
    .from("payment_installments")
    .select(installmentSelect(Boolean(companyId)))
    .gte("data_vencimento", mesInicio)
    .lte("data_vencimento", mesFim)
    .order("data_vencimento", { ascending: true });

  const [atrasadasRes, doMesRes] = await Promise.all([
    companyId
      ? atrasadasQuery.eq("events.company_id", companyId)
      : atrasadasQuery,
    companyId ? doMesQuery.eq("events.company_id", companyId) : doMesQuery,
  ]);

  // Recurso de parcelas ainda não ativado no banco (tabela/coluna ausente ou
  // fora do schema cache) → painel vazio em vez de quebrar a página.
  if (
    isMissingPaymentFeatureError(atrasadasRes.error) ||
    isMissingPaymentFeatureError(doMesRes.error)
  ) {
    return EMPTY;
  }
  if (atrasadasRes.error) throw new Error(atrasadasRes.error.message);
  if (doMesRes.error) throw new Error(doMesRes.error.message);

  const atrasadas = (atrasadasRes.data ??
    []) as unknown as InstallmentWithEvent[];
  const doMesRaw = (doMesRes.data ?? []) as unknown as InstallmentWithEvent[];

  // Parcelas pendentes já vencidas pertencem ao quadro de atrasadas; não as
  // repetimos no quadro do mês (evita duplicar linhas e contar o valor duas
  // vezes nos cards). Mantemos as pagas com vencimento anterior no mês.
  // Comparação lexicográfica é segura: ambos são strings yyyy-MM-dd.
  const doMes = doMesRaw.filter((p) => p.pago || p.data_vencimento >= today);

  const atrasado = atrasadas.reduce((acc, p) => acc + Number(p.valor || 0), 0);
  const aReceberMes = doMes
    .filter((p) => !p.pago)
    .reduce((acc, p) => acc + Number(p.valor || 0), 0);
  const recebidoMes = doMes
    .filter((p) => p.pago)
    .reduce((acc, p) => acc + Number(p.valor || 0), 0);

  return { aReceberMes, recebidoMes, atrasado, atrasadas, doMes };
}
