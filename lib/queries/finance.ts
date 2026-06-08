import { createClient } from "@/lib/supabase/server";
import { monthRange, previousMonthRange } from "@/lib/date";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface FinanceSummary {
  faturamentoMes: number;
  faturamentoMesAnterior: number;
  valorRecebido: number;
  valorPendente: number;
  ticketMedio: number;
  eventosFechados: number;
  faturamentoAno: number;
  // Gráficos
  porMes: { mes: string; faturamento: number; eventos: number }[];
  porEmpresa: { empresa: string; faturamento: number }[];
  recebidoVsPendente: { name: string; value: number }[];
}

interface EventRow {
  data_evento: string;
  valor_total: number | string;
  valor_entrada: number | string;
  valor_restante: number | string;
  status_evento: string;
  company: { name: string } | null;
}

export async function getFinanceSummary(
  year: number,
  companyId?: string,
  month?: string,
): Promise<FinanceSummary> {
  const supabase = await createClient();

  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  let query = supabase
    .from("events")
    .select(
      "data_evento, valor_total, valor_entrada, valor_restante, status_evento, company:companies ( name )",
    )
    .gte("data_evento", yearStart)
    .lte("data_evento", yearEnd)
    .neq("status_evento", "cancelado");

  if (companyId) query = query.eq("company_id", companyId);

  const { data } = await query;
  const events = (data ?? []) as unknown as EventRow[];

  const num = (v: number | string) => Number(v) || 0;

  // Mês de referência (se informado, usa-o; senão mês atual)
  const refDate = month ? parseISO(`${month}-01`) : new Date();
  const { start: mStart, end: mEnd } = monthRange(refDate);
  const { start: pStart, end: pEnd } = previousMonthRange(refDate);

  // Inicializa 12 meses
  const meses = Array.from({ length: 12 }, (_, i) => ({
    mes: format(new Date(year, i, 1), "MMM", { locale: ptBR }),
    faturamento: 0,
    eventos: 0,
  }));

  const empresaMap = new Map<string, number>();

  let faturamentoMes = 0;
  let faturamentoMesAnterior = 0;
  let valorRecebido = 0;
  let valorPendente = 0;
  let faturamentoAno = 0;
  let eventosFechados = 0;

  for (const ev of events) {
    const total = num(ev.valor_total);
    const d = ev.data_evento;
    const monthIdx = parseISO(d).getMonth();

    faturamentoAno += total;
    eventosFechados += 1;
    meses[monthIdx].faturamento += total;
    meses[monthIdx].eventos += 1;

    const empresa = ev.company?.name ?? "Sem empresa";
    empresaMap.set(empresa, (empresaMap.get(empresa) ?? 0) + total);

    if (d >= mStart && d <= mEnd) {
      faturamentoMes += total;
      valorRecebido += num(ev.valor_entrada);
      valorPendente += num(ev.valor_restante);
    }
    if (d >= pStart && d <= pEnd) {
      faturamentoMesAnterior += total;
    }
  }

  // Contagem de eventos do mês de referência para ticket médio
  const eventosMes = events.filter(
    (e) => e.data_evento >= mStart && e.data_evento <= mEnd,
  ).length;
  const ticketMedio = eventosMes > 0 ? faturamentoMes / eventosMes : 0;

  const porEmpresa = Array.from(empresaMap.entries())
    .map(([empresa, faturamento]) => ({ empresa, faturamento }))
    .sort((a, b) => b.faturamento - a.faturamento);

  return {
    faturamentoMes,
    faturamentoMesAnterior,
    valorRecebido,
    valorPendente,
    ticketMedio,
    eventosFechados,
    faturamentoAno,
    porMes: meses,
    porEmpresa,
    recebidoVsPendente: [
      { name: "Recebido", value: valorRecebido },
      { name: "Pendente", value: valorPendente },
    ],
  };
}
