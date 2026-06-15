import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/date";
import type { FollowupWithLead } from "@/types";

/**
 * Embed do lead. Usamos `!inner` quando há filtro por empresa para que o filtro
 * em `leads.company_id` realmente restrinja as linhas (join interno).
 */
const followupSelect = (innerLead: boolean) => `
  *,
  lead:leads${innerLead ? "!inner" : ""} ( id, nome_cliente, company_id ),
  responsavel:users_profile!followups_responsavel_id_fkey ( id, full_name )
`;

export type FollowupBucket = "hoje" | "atrasados" | "proximos" | "todos";

/**
 * Lista follow-ups agrupados por janela temporal.
 * `companyId` filtra pela empresa do lead relacionado (a empresa em foco).
 */
export async function getFollowups(
  bucket: FollowupBucket = "todos",
  companyId?: string,
): Promise<FollowupWithLead[]> {
  const supabase = await createClient();
  const today = todayISO();

  let query = supabase
    .from("followups")
    .select(followupSelect(Boolean(companyId)));

  if (companyId) query = query.eq("leads.company_id", companyId);

  if (bucket === "hoje") {
    query = query
      .eq("status", "pendente")
      .eq("data_vencimento", today)
      .order("data_vencimento");
  } else if (bucket === "atrasados") {
    query = query
      .eq("status", "pendente")
      .lt("data_vencimento", today)
      .order("data_vencimento");
  } else if (bucket === "proximos") {
    query = query
      .eq("status", "pendente")
      .gt("data_vencimento", today)
      .order("data_vencimento");
  } else {
    query = query.order("data_vencimento", { ascending: false });
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as FollowupWithLead[];
}

export type GroupedFollowups = {
  atrasados: FollowupWithLead[];
  hoje: FollowupWithLead[];
  proximos: FollowupWithLead[];
};

/**
 * Retorna os follow-ups pendentes já separados em Atrasados, Hoje e Próximos,
 * todos ordenados por `data_vencimento` ascendente (mais próximos primeiro).
 */
export async function getGroupedFollowups(
  companyId?: string,
): Promise<GroupedFollowups> {
  const [atrasados, hoje, proximos] = await Promise.all([
    getFollowups("atrasados", companyId),
    getFollowups("hoje", companyId),
    getFollowups("proximos", companyId),
  ]);
  return { atrasados, hoje, proximos };
}
