import { createClient } from "@/lib/supabase/server";

export interface FollowupData {
  titulo: string;
  descricao?: string | null;
  data_vencimento: string;
  responsavel_id?: string | null;
}

/**
 * Garante que cada lead tenha no máximo 1 follow-up ATIVO (pendente).
 *
 * - Se já existe um follow-up pendente para o lead, ele é ATUALIZADO com os
 *   novos dados (em vez de criar um segundo).
 * - Se não existe, cria um novo.
 *
 * Usado por todos os pontos que geram follow-up (Kanban, botão manual, regra
 * automática do orçamento) para manter a regra "1 follow-up ativo por lead".
 *
 * Deve ser chamado de dentro de um Server Action (usa o client de servidor).
 */
export async function upsertFollowupForLead(
  leadId: string,
  data: FollowupData,
): Promise<void> {
  const supabase = await createClient();

  const { data: existente } = await supabase
    .from("followups")
    .select("id")
    .eq("lead_id", leadId)
    .eq("status", "pendente")
    .order("data_vencimento", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existente) {
    await supabase
      .from("followups")
      .update({
        titulo: data.titulo,
        descricao: data.descricao ?? null,
        data_vencimento: data.data_vencimento,
        responsavel_id: data.responsavel_id ?? null,
        status: "pendente",
      })
      .eq("id", existente.id);
  } else {
    await supabase.from("followups").insert({
      lead_id: leadId,
      titulo: data.titulo,
      descricao: data.descricao ?? null,
      data_vencimento: data.data_vencimento,
      responsavel_id: data.responsavel_id ?? null,
      status: "pendente",
    });
  }
}

/**
 * Remove os follow-ups PENDENTES de um lead.
 *
 * Chamado quando o lead sai do funil (fechado ou perdido): como ele não precisa
 * mais de acompanhamento, os follow-ups pendentes são apagados para não
 * continuarem aparecendo nas listas de hoje/atrasados/pendentes.
 *
 * Deve ser chamado de dentro de um Server Action (usa o client de servidor).
 */
export async function deletePendingFollowups(leadId: string): Promise<void> {
  const supabase = await createClient();
  await supabase
    .from("followups")
    .delete()
    .eq("lead_id", leadId)
    .eq("status", "pendente");
}
