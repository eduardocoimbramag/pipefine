import { createClient } from "@/lib/supabase/server";
import type {
  Client,
  LeadWithRelations,
  EventWithRelations,
} from "@/types";

/** Lista clientes com busca opcional. */
export async function getClients(search?: string): Promise<Client[]> {
  const supabase = await createClient();
  let query = supabase.from("clients").select("*").order("name");
  if (search) {
    const s = search.replace(/[%,]/g, "");
    query = query.or(
      `name.ilike.%${s}%,phone.ilike.%${s}%,instagram.ilike.%${s}%,email.ilike.%${s}%`,
    );
  }
  const { data } = await query;
  return data ?? [];
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
