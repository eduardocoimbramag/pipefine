import { createClient } from "@/lib/supabase/server";
import type {
  Client,
  LeadWithRelations,
  EventWithRelations,
} from "@/types";

/** Cliente enriquecido com os tipos de evento que realizou/buscou. */
export interface ClientWithTipos extends Client {
  tiposEvento: string[];
}

interface ClientRowEmbed extends Client {
  leads: { company_id: string; tipo_evento: string | null }[] | null;
  events: { company_id: string; tipo_evento: string | null }[] | null;
}

/**
 * Lista clientes com busca opcional, filtrados pela empresa em foco.
 *
 * Clientes não têm company_id próprio — a empresa vem dos leads/eventos
 * vinculados. Com `companyId`, retorna apenas clientes que tenham pelo menos
 * 1 lead ou evento naquela empresa. Sem `companyId` (Todas as empresas),
 * retorna todos.
 *
 * Também agrega os tipos de evento (de leads e eventos) para exibir na lista.
 */
export async function getClients(
  companyId?: string,
  search?: string,
): Promise<ClientWithTipos[]> {
  const supabase = await createClient();

  let query = supabase
    .from("clients")
    .select(
      `*,
       leads ( company_id, tipo_evento ),
       events ( company_id, tipo_evento )`,
    )
    .order("name");

  if (search) {
    const s = search.replace(/[%,]/g, "");
    query = query.or(
      `name.ilike.%${s}%,phone.ilike.%${s}%,instagram.ilike.%${s}%,email.ilike.%${s}%`,
    );
  }

  const { data } = await query;
  const rows = (data ?? []) as unknown as ClientRowEmbed[];

  const result: ClientWithTipos[] = [];
  for (const row of rows) {
    const leads = row.leads ?? [];
    const events = row.events ?? [];

    // Filtro por empresa: precisa de vínculo (lead OU evento) na empresa.
    if (companyId) {
      const temVinculo =
        leads.some((l) => l.company_id === companyId) ||
        events.some((e) => e.company_id === companyId);
      if (!temVinculo) continue;
    }

    // Tipos de evento (de leads e eventos), considerando o filtro de empresa.
    const tipos = new Set<string>();
    for (const l of leads) {
      if (companyId && l.company_id !== companyId) continue;
      if (l.tipo_evento) tipos.add(l.tipo_evento);
    }
    for (const e of events) {
      if (companyId && e.company_id !== companyId) continue;
      if (e.tipo_evento) tipos.add(e.tipo_evento);
    }

    // Remove os campos embutidos antes de devolver o cliente.
    const { leads: _l, events: _e, ...client } = row;
    void _l;
    void _e;
    result.push({ ...(client as Client), tiposEvento: Array.from(tipos) });
  }

  return result;
}

export interface ClientDetail {
  client: Client;
  leads: LeadWithRelations[];
  events: EventWithRelations[];
  totalFaturado: number;
  ultimoAtendimento: string | null;
}

/** Detalhe de um cliente: leads, eventos, total faturado, último atendimento. */
export async function getClientDetail(
  id: string,
): Promise<ClientDetail | null> {
  const supabase = await createClient();

  const { data: client } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!client) return null;

  const [leadsRes, eventsRes] = await Promise.all([
    supabase
      .from("leads")
      .select(`*, company:companies ( id, name ), responsavel:users_profile!leads_responsavel_id_fkey ( id, full_name )`)
      .eq("client_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("events")
      .select(`*, company:companies ( id, name )`)
      .eq("client_id", id)
      .order("data_evento", { ascending: false }),
  ]);

  const events = (eventsRes.data ?? []) as unknown as EventWithRelations[];
  const totalFaturado = events
    .filter((e) => e.status_evento !== "cancelado")
    .reduce((sum, e) => sum + (Number(e.valor_total) || 0), 0);

  const ultimoAtendimento =
    events.length > 0 ? events[0].data_evento : null;

  return {
    client,
    leads: (leadsRes.data ?? []) as unknown as LeadWithRelations[],
    events,
    totalFaturado,
    ultimoAtendimento,
  };
}
