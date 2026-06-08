import { createClient } from "@/lib/supabase/server";
import type {
  Lead,
  LeadWithRelations,
  LeadInteraction,
  Followup,
  LeadStatus,
} from "@/types";

export interface LeadFilters {
  companyId?: string;
  status?: LeadStatus;
  responsavelId?: string;
  search?: string;
  dataEventoFrom?: string;
  dataEventoTo?: string;
  /** Incluir leads perdidos? Por padrão são excluídos (vão para a aba própria). */
  includeLost?: boolean;
}

const LEAD_SELECT = `
  *,
  company:companies ( id, name ),
  responsavel:users_profile!leads_responsavel_id_fkey ( id, full_name )
`;

/** Lista leads com filtros e busca. Exclui os perdidos por padrão. */
export async function getLeads(
  filters: LeadFilters = {},
): Promise<LeadWithRelations[]> {
  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select(LEAD_SELECT)
    .order("updated_at", { ascending: false });

  if (filters.companyId) query = query.eq("company_id", filters.companyId);
  if (filters.status) query = query.eq("status", filters.status);
  else if (!filters.includeLost) query = query.neq("status", "perdido");
  if (filters.responsavelId)
    query = query.eq("responsavel_id", filters.responsavelId);
  if (filters.dataEventoFrom)
    query = query.gte("data_evento", filters.dataEventoFrom);
  if (filters.dataEventoTo)
    query = query.lte("data_evento", filters.dataEventoTo);

  if (filters.search) {
    const s = filters.search.replace(/[%,]/g, "");
    query = query.or(
      `nome_cliente.ilike.%${s}%,telefone.ilike.%${s}%,instagram.ilike.%${s}%,email.ilike.%${s}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as LeadWithRelations[];
}

/** Lista os leads perdidos (status = perdido), com filtros de empresa/busca. */
export async function getLostLeads(filters: {
  companyId?: string;
  search?: string;
} = {}): Promise<LeadWithRelations[]> {
  const supabase = await createClient();
  let query = supabase
    .from("leads")
    .select(LEAD_SELECT)
    .eq("status", "perdido")
    .order("updated_at", { ascending: false });

  if (filters.companyId) query = query.eq("company_id", filters.companyId);
  if (filters.search) {
    const s = filters.search.replace(/[%,]/g, "");
    query = query.or(
      `nome_cliente.ilike.%${s}%,telefone.ilike.%${s}%,instagram.ilike.%${s}%,email.ilike.%${s}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as LeadWithRelations[];
}

/** Busca um lead por id com empresa e responsável. */
export async function getLeadById(
  id: string,
): Promise<LeadWithRelations | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .eq("id", id)
    .maybeSingle();
  return (data as unknown as LeadWithRelations) ?? null;
}

/** Histórico de interações de um lead. */
export async function getLeadInteractions(
  leadId: string,
): Promise<(LeadInteraction & { user: { full_name: string | null } | null })[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lead_interactions")
    .select(`*, user:users_profile ( full_name )`)
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });
  return (data ?? []) as never;
}

/** Follow-ups de um lead. */
export async function getLeadFollowups(leadId: string): Promise<Followup[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("followups")
    .select("*")
    .eq("lead_id", leadId)
    .order("data_vencimento", { ascending: true });
  return data ?? [];
}

export type { Lead };
