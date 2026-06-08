import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/date";
import type { FollowupWithLead } from "@/types";

const FOLLOWUP_SELECT = `
  *,
  lead:leads ( id, nome_cliente, company_id ),
  responsavel:users_profile!followups_responsavel_id_fkey ( id, full_name )
`;

export type FollowupBucket = "hoje" | "atrasados" | "proximos" | "todos";

/** Lista follow-ups agrupados por janela temporal. */
export async function getFollowups(
  bucket: FollowupBucket = "todos",
): Promise<FollowupWithLead[]> {
  const supabase = await createClient();
  const today = todayISO();

  let query = supabase.from("followups").select(FOLLOWUP_SELECT);

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
