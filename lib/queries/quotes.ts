import { createClient } from "@/lib/supabase/server";
import type { QuoteWithCompany } from "@/types";

/** Quantos pedidos enviados a aba mostra (os mais recentes). */
export const SENT_QUOTES_LIMIT = 100;

export interface QuoteBoard {
  /** false quando a migração 006 ainda não foi aplicada no banco. */
  available: boolean;
  /** Fila de comandas pendentes, a mais antiga primeiro (como na cozinha). */
  pendentes: QuoteWithCompany[];
  /** Orçamentos já enviados, o envio mais recente primeiro. */
  enviados: QuoteWithCompany[];
}

const QUOTE_SELECT = `*, company:companies ( id, name )`;

/** Tabela quote_requests ausente ou fora do schema cache (migração 006 pendente). */
function isMissingQuotesTable(e: { code?: string } | null): boolean {
  return e?.code === "PGRST205" || e?.code === "42P01";
}

/** Pedidos de orçamento da aba Orçamentos, escopados pela empresa em foco. */
export async function getQuoteBoard(companyId?: string): Promise<QuoteBoard> {
  const supabase = await createClient();

  let pendentesQuery = supabase
    .from("quote_requests")
    .select(QUOTE_SELECT)
    .eq("status", "pendente")
    .order("created_at", { ascending: true });

  let enviadosQuery = supabase
    .from("quote_requests")
    .select(QUOTE_SELECT)
    .eq("status", "enviado")
    .order("enviado_em", { ascending: false, nullsFirst: false })
    .limit(SENT_QUOTES_LIMIT);

  if (companyId) {
    pendentesQuery = pendentesQuery.eq("company_id", companyId);
    enviadosQuery = enviadosQuery.eq("company_id", companyId);
  }

  const [pendentesRes, enviadosRes] = await Promise.all([
    pendentesQuery,
    enviadosQuery,
  ]);

  if (
    isMissingQuotesTable(pendentesRes.error) ||
    isMissingQuotesTable(enviadosRes.error)
  ) {
    return { available: false, pendentes: [], enviados: [] };
  }
  if (pendentesRes.error) throw new Error(pendentesRes.error.message);
  if (enviadosRes.error) throw new Error(enviadosRes.error.message);

  return {
    available: true,
    pendentes: (pendentesRes.data ?? []) as unknown as QuoteWithCompany[],
    enviados: (enviadosRes.data ?? []) as unknown as QuoteWithCompany[],
  };
}

/**
 * Total de comandas pendentes (contador da sidebar). Nunca quebra o layout:
 * qualquer erro (inclusive migração não aplicada) vira 0.
 */
export async function getPendingQuoteCount(
  companyId?: string,
): Promise<number> {
  const supabase = await createClient();
  let query = supabase
    .from("quote_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pendente");
  if (companyId) query = query.eq("company_id", companyId);

  const { count, error } = await query;
  if (error) return 0;
  return count ?? 0;
}
