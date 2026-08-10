import { createClient } from "@/lib/supabase/server";
import type {
  EventWithRelations,
  EventStatus,
  PaymentStatus,
  PaymentInstallment,
} from "@/types";

export interface EventFilters {
  companyId?: string;
  statusEvento?: EventStatus;
  statusPagamento?: PaymentStatus;
  /** Intervalo de data_evento (yyyy-MM-dd), inclusivo nas duas pontas. */
  start?: string;
  end?: string;
  search?: string;
}

const EVENT_SELECT = `*, company:companies ( id, name )`;

/** Lista eventos com filtros. */
export async function getEvents(
  filters: EventFilters = {},
): Promise<EventWithRelations[]> {
  const supabase = await createClient();
  // Ordem cronológica: o evento mais próximo primeiro. Empates no mesmo dia
  // saem pelo horário (eventos sem horário definido vão para o fim do dia).
  let query = supabase
    .from("events")
    .select(EVENT_SELECT)
    .order("data_evento", { ascending: true })
    .order("horario_inicio", { ascending: true, nullsFirst: false });

  if (filters.companyId) query = query.eq("company_id", filters.companyId);
  if (filters.statusEvento)
    query = query.eq("status_evento", filters.statusEvento);
  if (filters.statusPagamento)
    query = query.eq("status_pagamento", filters.statusPagamento);

  if (filters.start) query = query.gte("data_evento", filters.start);
  if (filters.end) query = query.lte("data_evento", filters.end);

  if (filters.search) {
    const s = filters.search.replace(/[%,]/g, "");
    query = query.ilike("nome_cliente", `%${s}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as EventWithRelations[];
}

/** Busca evento por id. */
export async function getEventById(
  id: string,
): Promise<EventWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as EventWithRelations) ?? null;
}

/** Lista as parcelas de um evento, ordenadas por número. */
export async function getEventInstallments(
  eventId: string,
): Promise<PaymentInstallment[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("payment_installments")
    .select("*")
    .eq("event_id", eventId)
    .order("numero", { ascending: true });
  return (data ?? []) as PaymentInstallment[];
}
