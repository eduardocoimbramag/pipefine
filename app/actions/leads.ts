"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { upsertFollowupForLead, deletePendingFollowups } from "@/lib/followups";
import { relinkFeatureAvailable } from "@/lib/leads.server";
import { addDaysISO } from "@/lib/date";
import { emptyToNull, toNumberOrNull, parseMoney } from "@/lib/utils";
import { LEAD_STATUS_LABELS } from "@/types";
import type {
  ActionResult,
  LeadInsert,
  LeadUpdate,
  LeadStatus,
  LeadOrigin,
} from "@/types";

/** Extrai os campos do formulário de lead. */
function parseLeadForm(formData: FormData) {
  const intPessoas = toNumberOrNull(formData.get("quantidade_pessoas"));
  return {
    company_id: String(formData.get("company_id") ?? ""),
    // Vínculo com um cliente já existente ("Cliente antigo?"). Quando presente,
    // o lead conta para o histórico daquele cliente (Eventos) ao ser fechado e
    // nunca aparece em "Leads Perdidos".
    client_id: emptyToNull(formData.get("client_id")),
    nome_cliente: String(formData.get("nome_cliente") ?? "").trim(),
    telefone: emptyToNull(formData.get("telefone")),
    email: emptyToNull(formData.get("email")),
    instagram: emptyToNull(formData.get("instagram")),
    origem_lead: (emptyToNull(formData.get("origem_lead")) as LeadOrigin) ?? null,
    tipo_evento: emptyToNull(formData.get("tipo_evento")),
    data_evento: emptyToNull(formData.get("data_evento")),
    local_evento: emptyToNull(formData.get("local_evento")),
    quantidade_pessoas: intPessoas !== null ? Math.round(intPessoas) : null,
    valor_estimado: parseMoney(formData.get("valor_estimado")),
    status: (String(formData.get("status") ?? "novo_lead") as LeadStatus),
    responsavel_id: emptyToNull(formData.get("responsavel_id")),
    data_primeiro_contato: emptyToNull(formData.get("data_primeiro_contato")),
    data_orcamento_enviado: emptyToNull(formData.get("data_orcamento_enviado")),
    // data_proximo_followup NÃO entra aqui: é um campo DERIVADO, sincronizado
    // automaticamente a partir do follow-up pendente (syncLeadNextFollowup).
    observacoes: emptyToNull(formData.get("observacoes")),
    motivo_perda: emptyToNull(formData.get("motivo_perda")),
  };
}

export async function createLead(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const supabase = await createClient();
    const payload = parseLeadForm(formData);

    if (!payload.company_id) return { ok: false, error: "Selecione a empresa." };
    if (!payload.nome_cliente)
      return { ok: false, error: "Informe o nome do cliente." };

    // "Cliente antigo?": além do vínculo (client_id), grava o marcador imutável
    // `relinked` quando a coluna existe (migração 004). Assim o lead nunca volta
    // para "Leads Perdidos" mesmo que o cliente seja excluído depois.
    const isRelink = Boolean(payload.client_id);
    const insertPayload: LeadInsert = { ...(payload as LeadInsert) };
    if (isRelink && (await relinkFeatureAvailable())) {
      insertPayload.relinked = true;
    }

    const { data, error } = await supabase
      .from("leads")
      .insert(insertPayload)
      .select("id, status")
      .single();
    if (error) throw error;

    await maybeCreateFollowupOnOrcamento(data.id, null, payload.status);

    revalidatePath("/leads");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: data.id }, message: "Lead criado." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function updateLead(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();

    const { data: before } = await supabase
      .from("leads")
      .select("status")
      .eq("id", id)
      .single();

    const payload = parseLeadForm(formData);
    if (!payload.nome_cliente)
      return { ok: false, error: "Informe o nome do cliente." };

    // O vínculo com cliente é definido só na criação (re-link) e no fechamento.
    // Ao editar não mexemos nele, para não desvincular um lead já ligado.
    const { client_id: _ignoredClientId, ...updatePayload } = payload;
    void _ignoredClientId;

    const { error } = await supabase
      .from("leads")
      .update(updatePayload)
      .eq("id", id);
    if (error) throw error;

    if (payload.status === "fechado" || payload.status === "perdido") {
      // Lead saiu do funil → remove follow-ups pendentes.
      await deletePendingFollowups(id);
    } else {
      await maybeCreateFollowupOnOrcamento(
        id,
        before?.status ?? null,
        payload.status,
      );
    }

    revalidatePath("/leads");
    revalidatePath(`/leads/${id}`);
    revalidatePath("/followups");
    revalidatePath("/dashboard");
    return { ok: true, message: "Lead atualizado." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/**
 * Altera apenas o status (usado em ações rápidas e no Kanban).
 *
 * @param motivoPerda  Motivo, quando o status for "perdido".
 * @param followupDate Quando informado (yyyy-MM-dd), agenda um follow-up para
 *                     essa data. Usado pelo Kanban ao mover o card.
 *                     A data do lead (data_proximo_followup) é sincronizada
 *                     automaticamente pelo upsert.
 */
export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
  motivoPerda?: string | null,
  followupDate?: string | null,
): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();

    const { data: before } = await supabase
      .from("leads")
      .select("status, nome_cliente, responsavel_id")
      .eq("id", id)
      .single();

    const patch: LeadUpdate = { status };
    if (status === "orcamento_enviado") {
      patch.data_orcamento_enviado = new Date().toISOString().slice(0, 10);
    }
    if (status === "perdido") {
      patch.motivo_perda = motivoPerda?.trim() || null;
    }

    // Follow-up solicitado ao mover no Kanban (data específica).
    const vencimento =
      followupDate && /^\d{4}-\d{2}-\d{2}$/.test(followupDate)
        ? followupDate
        : null;

    const { error } = await supabase.from("leads").update(patch).eq("id", id);
    if (error) throw error;

    if (status === "fechado" || status === "perdido") {
      // Lead saiu do funil → remove follow-ups pendentes.
      await deletePendingFollowups(id);
    } else if (vencimento) {
      // Regra: 1 follow-up ativo por lead — atualiza o pendente se já existir.
      await upsertFollowupForLead(id, {
        titulo: `Follow-up — ${before?.nome_cliente ?? "cliente"}`,
        descricao: `Acompanhamento agendado ao mover o lead (${LEAD_STATUS_LABELS[status]}).`,
        data_vencimento: vencimento,
        responsavel_id: before?.responsavel_id ?? null,
      });
    } else {
      // Mantém a regra automática do orçamento quando nenhum follow-up manual foi pedido.
      await maybeCreateFollowupOnOrcamento(id, before?.status ?? null, status);
    }

    revalidatePath("/leads");
    revalidatePath(`/leads/${id}`);
    revalidatePath("/followups");
    revalidatePath("/dashboard");
    return { ok: true, message: "Status atualizado." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/**
 * Envia um lead para o Banco de Clientes como "Potencial" (coluna à direita do
 * Kanban): cliente muito bom que não fechou agora.
 *
 * Reusa a estrutura existente — sem migração:
 * - Garante um cliente vinculado (vai para o Banco de Clientes), SEM criar evento.
 * - Marca `relinked = true` (migração 004, já aplicada) e sai do funil, de modo
 *   que o lead NUNCA apareça em "Leads Perdidos" e some do Kanban ativo.
 * - Remove follow-ups pendentes (o lead saiu do funil).
 *
 * Internamente o lead recebe o status terminal `perdido` apenas para sair do
 * funil; como `relinked = true`, ele é filtrado fora de "Leads Perdidos" e o
 * usuário nunca vê esse rótulo. O que importa é: o cliente entra no banco.
 */
export async function markLeadAsPotential(
  id: string,
): Promise<ActionResult<{ clientId: string | null }>> {
  try {
    await requireUser();
    const supabase = await createClient();

    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", id)
      .single();
    if (!lead) return { ok: false, error: "Lead não encontrado." };

    // Garante um cliente vinculado (Banco de Clientes), sem criar evento.
    let clientId: string | null = lead.client_id;
    if (!clientId) {
      const { data: client } = await supabase
        .from("clients")
        .insert({
          name: lead.nome_cliente,
          phone: lead.telefone,
          email: lead.email,
          instagram: lead.instagram,
        })
        .select("id")
        .single();
      clientId = client?.id ?? null;
    }

    // Sai do funil + vínculo. `relinked = true` (migração 004) garante que o
    // lead nunca caia em "Leads Perdidos", mesmo que o cliente seja excluído.
    const patch: LeadUpdate = { status: "perdido", client_id: clientId };
    if (await relinkFeatureAvailable()) patch.relinked = true;

    const { error } = await supabase.from("leads").update(patch).eq("id", id);
    if (error) throw error;

    // Lead saiu do funil → remove follow-ups pendentes.
    await deletePendingFollowups(id);

    revalidatePath("/leads");
    revalidatePath(`/leads/${id}`);
    revalidatePath("/clientes");
    revalidatePath("/followups");
    revalidatePath("/dashboard");
    return {
      ok: true,
      data: { clientId },
      message: "Cliente adicionado ao Banco de Clientes.",
    };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteLead(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/leads");
    revalidatePath("/leads-perdidos");
    revalidatePath("/dashboard");
    return { ok: true, message: "Lead excluído." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/**
 * Exclui vários leads de uma vez (modo de seleção, ex.: aba Leads Perdidos).
 * Follow-ups e interações vinculados são removidos em cascata pelo banco;
 * eventos eventualmente vinculados apenas perdem o vínculo (set null).
 */
export async function deleteLeadsBulk(
  ids: string[],
): Promise<ActionResult<{ count: number }>> {
  try {
    await requireUser();
    if (!ids || ids.length === 0)
      return { ok: false, error: "Nenhum lead selecionado." };

    const supabase = await createClient();
    const { error } = await supabase.from("leads").delete().in("id", ids);
    if (error) throw error;

    revalidatePath("/leads");
    revalidatePath("/leads-perdidos");
    revalidatePath("/dashboard");
    return {
      ok: true,
      data: { count: ids.length },
      message:
        ids.length === 1
          ? "Lead removido."
          : `${ids.length} leads removidos.`,
    };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/** Adiciona uma interação (nota/histórico) ao lead. */
export async function addLeadInteraction(
  leadId: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const supabase = await createClient();
    const descricao = String(formData.get("descricao") ?? "").trim();
    const tipo = String(formData.get("tipo") ?? "nota");
    if (!descricao) return { ok: false, error: "Escreva a observação." };

    const { error } = await supabase.from("lead_interactions").insert({
      lead_id: leadId,
      user_id: user.id,
      tipo,
      descricao,
    });
    if (error) throw error;

    revalidatePath(`/leads/${leadId}`);
    return { ok: true, message: "Observação registrada." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/**
 * Regra de negócio: ao mudar o status para "orcamento_enviado",
 * agenda um follow-up para 2 dias depois. Respeita a regra de 1 follow-up
 * ativo por lead — atualiza o pendente existente em vez de criar outro.
 */
async function maybeCreateFollowupOnOrcamento(
  leadId: string,
  statusAntes: string | null,
  statusDepois: string,
) {
  if (statusDepois !== "orcamento_enviado") return;
  if (statusAntes === "orcamento_enviado") return; // já estava enviado

  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("nome_cliente, responsavel_id")
    .eq("id", leadId)
    .single();

  await upsertFollowupForLead(leadId, {
    titulo: `Follow-up: retorno do orçamento — ${lead?.nome_cliente ?? "cliente"}`,
    descricao: "Verificar se o cliente respondeu ao orçamento enviado.",
    data_vencimento: addDaysISO(2),
    responsavel_id: lead?.responsavel_id ?? null,
  });
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Ocorreu um erro inesperado.";
}
