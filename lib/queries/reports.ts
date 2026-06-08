import { createClient } from "@/lib/supabase/server";
import { LEAD_ORIGIN_LABELS, type LeadOrigin } from "@/types";

export interface ReportsData {
  totalLeads: number;
  leadsFechados: number;
  leadsPerdidos: number;
  orcamentosEnviados: number;
  taxaConversao: number; // %
  leadsPorOrigem: { origem: string; total: number }[];
  motivosPerda: { motivo: string; total: number }[];
  faturamentoAnual: number;
  empresasFaturamento: {
    empresa: string;
    faturamento: number;
    eventos: number;
    ticketMedio: number;
  }[];
  eventosPorMes: { mes: string; total: number }[];
}

interface LeadLite {
  status: string;
  origem_lead: string | null;
  motivo_perda: string | null;
  data_orcamento_enviado: string | null;
}
interface EventLite {
  data_evento: string;
  valor_total: number | string;
  status_evento: string;
  company: { name: string } | null;
}

export async function getReportsData(
  year: number,
  companyId?: string,
): Promise<ReportsData> {
  const supabase = await createClient();

  let leadsQuery = supabase
    .from("leads")
    .select("status, origem_lead, motivo_perda, data_orcamento_enviado");
  if (companyId) leadsQuery = leadsQuery.eq("company_id", companyId);

  let eventsQuery = supabase
    .from("events")
    .select("data_evento, valor_total, status_evento, company:companies ( name )")
    .gte("data_evento", `${year}-01-01`)
    .lte("data_evento", `${year}-12-31`)
    .neq("status_evento", "cancelado");
  if (companyId) eventsQuery = eventsQuery.eq("company_id", companyId);

  const [leadsRes, eventsRes] = await Promise.all([leadsQuery, eventsQuery]);

  const leads = (leadsRes.data ?? []) as unknown as LeadLite[];
  const events = (eventsRes.data ?? []) as unknown as EventLite[];
  const num = (v: number | string) => Number(v) || 0;

  const totalLeads = leads.length;
  const leadsFechados = leads.filter((l) => l.status === "fechado").length;
  const leadsPerdidos = leads.filter((l) => l.status === "perdido").length;
  const orcamentosEnviados = leads.filter(
    (l) => l.data_orcamento_enviado !== null || l.status === "orcamento_enviado",
  ).length;
  const taxaConversao =
    totalLeads > 0 ? (leadsFechados / totalLeads) * 100 : 0;

  // Leads por origem
  const origemMap = new Map<string, number>();
  for (const l of leads) {
    const key = l.origem_lead ?? "outro";
    origemMap.set(key, (origemMap.get(key) ?? 0) + 1);
  }
  const leadsPorOrigem = Array.from(origemMap.entries())
    .map(([origem, total]) => ({
      origem: LEAD_ORIGIN_LABELS[origem as LeadOrigin] ?? origem,
      total,
    }))
    .sort((a, b) => b.total - a.total);

  // Motivos de perda
  const motivoMap = new Map<string, number>();
  for (const l of leads) {
    if (l.status === "perdido") {
      const m = (l.motivo_perda ?? "Não informado").trim() || "Não informado";
      motivoMap.set(m, (motivoMap.get(m) ?? 0) + 1);
    }
  }
  const motivosPerda = Array.from(motivoMap.entries())
    .map(([motivo, total]) => ({ motivo, total }))
    .sort((a, b) => b.total - a.total);

  // Faturamento / empresas
  let faturamentoAnual = 0;
  const empresaMap = new Map<string, { fat: number; ev: number }>();
  const mesesMap = Array.from({ length: 12 }, () => 0);

  for (const ev of events) {
    const total = num(ev.valor_total);
    faturamentoAnual += total;
    const empresa = ev.company?.name ?? "Sem empresa";
    const cur = empresaMap.get(empresa) ?? { fat: 0, ev: 0 };
    cur.fat += total;
    cur.ev += 1;
    empresaMap.set(empresa, cur);
    const monthIdx = new Date(ev.data_evento).getMonth();
    mesesMap[monthIdx] += 1;
  }

  const empresasFaturamento = Array.from(empresaMap.entries())
    .map(([empresa, { fat, ev }]) => ({
      empresa,
      faturamento: fat,
      eventos: ev,
      ticketMedio: ev > 0 ? fat / ev : 0,
    }))
    .sort((a, b) => b.faturamento - a.faturamento);

  const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const eventosPorMes = mesesMap.map((total, i) => ({ mes: MESES[i], total }));

  return {
    totalLeads,
    leadsFechados,
    leadsPerdidos,
    orcamentosEnviados,
    taxaConversao,
    leadsPorOrigem,
    motivosPerda,
    faturamentoAnual,
    empresasFaturamento,
    eventosPorMes,
  };
}
