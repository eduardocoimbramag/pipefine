import { createClient } from "@/lib/supabase/server";
import { monthRange, todayISO, addDaysISO } from "@/lib/date";
import type {
  EventWithRelations,
  FollowupWithLead,
  LeadWithRelations,
} from "@/types";

export interface DashboardData {
  // Cards
  leadsQuentes: number;
  faltaAssinar: number;
  followupsHoje: number;
  followupsAtrasados: number;
  eventosFechadosMes: number;
  proximosEventosCount: number;
  faturamentoMes: number;
  valorRecebido: number;
  valorPendente: number;
  // Seções
  acoesHoje: FollowupWithLead[];
  clientesSemResposta: LeadWithRelations[];
  proximosEventos: EventWithRelations[];
  pagamentosPendentes: EventWithRelations[];
}

/**
 * Agrega os dados do dashboard. Faz várias consultas em paralelo.
 * Aceita filtro opcional por empresa.
 */
export async function getDashboardData(
  companyId?: string,
): Promise<DashboardData> {
  const supabase = await createClient();
  const today = todayISO();
  const { start, end } = monthRange();
  const horizonte = addDaysISO(30);

  const withCompany = <T>(q: T): T => {
    // @ts-expect-error — encadeamento dinâmico do query builder
    return companyId ? q.eq("company_id", companyId) : q;
  };

  // Follow-ups não têm company_id próprio: filtram pela empresa do lead relacionado.
  // Usamos inner join (leads!inner) para que o filtro restrinja as linhas.
  const followupLeadEmbed = companyId
    ? "lead:leads!inner ( id, nome_cliente, company_id )"
    : "lead:leads ( id, nome_cliente, company_id )";
  const withFollowupCompany = <T>(q: T): T => {
    // @ts-expect-error — encadeamento dinâmico do query builder
    return companyId ? q.eq("leads.company_id", companyId) : q;
  };

  const [
    leadsQuentesRes,
    faltaAssinarRes,
    fHojeRes,
    fAtrasadosRes,
    eventosMesRes,
    faturamentoRes,
    acoesHojeRes,
    semRespostaRes,
    proximosEventosRes,
    pagamentosRes,
  ] = await Promise.all([
    // Leads quentes = ativos (qualquer status, exceto fechado e perdido)
    withCompany(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .not("status", "in", "(fechado,perdido)"),
    ),
    // Falta assinar = leads ativos em negociação
    withCompany(
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("status", "negociacao"),
    ),
    withFollowupCompany(
      supabase
        .from("followups")
        .select(`id, ${followupLeadEmbed}`, { count: "exact", head: true })
        .eq("status", "pendente")
        .eq("data_vencimento", today),
    ),
    withFollowupCompany(
      supabase
        .from("followups")
        .select(`id, ${followupLeadEmbed}`, { count: "exact", head: true })
        .eq("status", "pendente")
        .lt("data_vencimento", today),
    ),
    withCompany(
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .gte("data_evento", start)
        .lte("data_evento", end)
        .neq("status_evento", "cancelado"),
    ),
    withCompany(
      supabase
        .from("events")
        .select("valor_total, valor_entrada, valor_restante, status_evento")
        .gte("data_evento", start)
        .lte("data_evento", end)
        .neq("status_evento", "cancelado"),
    ),
    withFollowupCompany(
      supabase
        .from("followups")
        .select(
          `*, ${followupLeadEmbed}, responsavel:users_profile!followups_responsavel_id_fkey ( id, full_name )`,
        )
        .eq("status", "pendente")
        .lte("data_vencimento", today)
        .order("data_vencimento")
        .limit(10),
    ),
    withCompany(
      supabase
        .from("leads")
        .select(
          `*, company:companies ( id, name ), responsavel:users_profile!leads_responsavel_id_fkey ( id, full_name )`,
        )
        .in("status", ["aguardando_retorno", "sem_resposta", "orcamento_enviado"])
        .order("updated_at", { ascending: false })
        .limit(8),
    ),
    withCompany(
      supabase
        .from("events")
        .select(`*, company:companies ( id, name )`)
        .gte("data_evento", today)
        .lte("data_evento", horizonte)
        .neq("status_evento", "cancelado")
        .order("data_evento")
        .limit(8),
    ),
    withCompany(
      supabase
        .from("events")
        .select(`*, company:companies ( id, name )`)
        .neq("status_pagamento", "pago_integralmente")
        .neq("status_evento", "cancelado")
        .order("data_evento")
        .limit(8),
    ),
  ]);

  // Faturamento agregado
  let faturamentoMes = 0;
  let valorRecebido = 0;
  let valorPendente = 0;
  for (const ev of faturamentoRes.data ?? []) {
    faturamentoMes += Number(ev.valor_total) || 0;
    valorRecebido += Number(ev.valor_entrada) || 0;
    valorPendente += Number(ev.valor_restante) || 0;
  }

  return {
    leadsQuentes: leadsQuentesRes.count ?? 0,
    faltaAssinar: faltaAssinarRes.count ?? 0,
    followupsHoje: fHojeRes.count ?? 0,
    followupsAtrasados: fAtrasadosRes.count ?? 0,
    eventosFechadosMes: eventosMesRes.count ?? 0,
    proximosEventosCount: (proximosEventosRes.data ?? []).length,
    faturamentoMes,
    valorRecebido,
    valorPendente,
    acoesHoje: (acoesHojeRes.data ?? []) as unknown as FollowupWithLead[],
    clientesSemResposta: (semRespostaRes.data ??
      []) as unknown as LeadWithRelations[],
    proximosEventos: (proximosEventosRes.data ??
      []) as unknown as EventWithRelations[],
    pagamentosPendentes: (pagamentosRes.data ??
      []) as unknown as EventWithRelations[],
  };
}
