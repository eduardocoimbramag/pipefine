"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { upsertFollowupForLead } from "@/lib/followups";
import { addDaysISO } from "@/lib/date";
import { emptyToNull, toNumberOrNull } from "@/lib/utils";
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
    nome_cliente: String(formData.get("nome_cliente") ?? "").trim(),
    telefone: emptyToNull(formData.get("telefone")),
    email: emptyToNull(formData.get("email")),
    instagram: emptyToNull(formData.get("instagram")),
    origem_lead: (emptyToNull(formData.get("origem_lead")) as LeadOrigin) ?? null,
    tipo_evento: emptyToNull(formData.get("tipo_evento")),
    data_evento: emptyToNull(formData.get("data_evento")),
    local_evento: emptyToNull(formData.get("local_evento")),
    quantidade_pessoas: intPessoas !== null ? Math.round(intPessoas) : null,
    valor_estimado: toNumberOrNull(formData.get("valor_estimado")),
    status: (String(formData.get("status") ?? "novo_lead") as LeadStatus),
    responsavel_id: emptyToNull(formData.get("responsavel_id")),
    data_primeiro_contato: emptyToNull(formData.get("data_primeiro_contato")),
    data_orcamento_enviado: emptyToNull(formData.get("data_orcamento_enviado")),
    data_proximo_followup: emptyToNull(formData.get("data_proximo_followup")),
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

    const { data, error } = await supabase
      .from("leads")
      .insert(payload as LeadInsert)
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

    const { error } = await supabase
      .from("leads")
      .update(payload)
      .eq("id", id);
    if (error) throw error;

    await maybeCreateFollowupOnOrcamento(
      id,
      before?.status ?? null,
      payload.status,
    );

    revalidatePath("/leads");
    revalidatePath(`/leads/${id}`);
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
 * @param followupDays Quando informado (> 0), cria um follow-up vencendo em N
 *                     dias e atualiza a data do próximo follow-up do lead.
 *                     Usado pelo Kanban ao mover o card.
 */
export async function updateLeadStatus(
  id: string,
  status: LeadStatus,
  motivoPerda?: string | null,
  followupDays?: number | null,
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

    // Follow-up solicitado ao mover no Kanban.
    const dias =
      followupDays !== null && followupDays !== undefined && followupDays > 0
        ? Math.round(followupDays)
        : null;
    const vencimento = dias ? addDaysISO(dias) : null;
    if (vencimento) {
      patch.data_proximo_followup = vencimento;
    }

    const { error } = await supabase.from("leads").update(patch).eq("id", id);
    if (error) throw error;

    if (vencimento) {
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

export async function deleteLead(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/leads");
    revalidatePath("/dashboard");
    return { ok: true, message: "Lead excluído." };
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
