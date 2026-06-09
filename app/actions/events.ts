"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { deletePendingFollowups } from "@/lib/followups";
import { emptyToNull, toNumberOrNull } from "@/lib/utils";
import type {
  ActionResult,
  EventInsert,
  EventStatus,
  PaymentStatus,
} from "@/types";

function parseEventForm(formData: FormData) {
  const total = toNumberOrNull(formData.get("valor_total")) ?? 0;
  const entrada = toNumberOrNull(formData.get("valor_entrada")) ?? 0;
  const pessoas = toNumberOrNull(formData.get("quantidade_pessoas"));
  return {
    company_id: String(formData.get("company_id") ?? ""),
    nome_cliente: String(formData.get("nome_cliente") ?? "").trim(),
    tipo_evento: emptyToNull(formData.get("tipo_evento")),
    data_evento: String(formData.get("data_evento") ?? ""),
    horario_inicio: emptyToNull(formData.get("horario_inicio")),
    horario_fim: emptyToNull(formData.get("horario_fim")),
    local_evento: emptyToNull(formData.get("local_evento")),
    quantidade_pessoas: pessoas !== null ? Math.round(pessoas) : null,
    servicos_contratados: emptyToNull(formData.get("servicos_contratados")),
    valor_total: total,
    valor_entrada: entrada,
    valor_restante: Math.max(total - entrada, 0),
    forma_pagamento: emptyToNull(formData.get("forma_pagamento")),
    status_pagamento: String(
      formData.get("status_pagamento") ?? "aguardando_pagamento",
    ) as PaymentStatus,
    status_evento: String(
      formData.get("status_evento") ?? "confirmado",
    ) as EventStatus,
    observacoes_operacionais: emptyToNull(
      formData.get("observacoes_operacionais"),
    ),
    responsavel_id: emptyToNull(formData.get("responsavel_id")),
  };
}

/** Deriva o status de pagamento automaticamente a partir dos valores. */
function derivePaymentStatus(
  total: number,
  entrada: number,
  current: PaymentStatus,
): PaymentStatus {
  if (total > 0 && entrada >= total) return "pago_integralmente";
  if (entrada > 0) return "entrada_paga";
  if (entrada <= 0 && current === "pago_integralmente") return current;
  return "aguardando_pagamento";
}

/**
 * Fecha um lead criando o evento a partir do pop-up do Kanban.
 *
 * - Cria/garante um cliente vinculado (vai para o "Banco de Clientes").
 * - Cria o evento (aparece na aba Eventos). O faturamento entra no mês da
 *   `data_evento`, pois o Financeiro agrega pela data do evento.
 * - Marca o lead como "fechado" (some do Kanban).
 *
 * Diferente de `convertLeadToEvent`, NÃO redireciona — retorna um ActionResult
 * para o pop-up tratar (toast + refresh).
 */
export async function closeLeadAsEvent(
  leadId: string,
  formData: FormData,
): Promise<ActionResult<{ eventId: string }>> {
  try {
    await requireUser();
    const supabase = await createClient();

    const dataEvento = String(formData.get("data_evento") ?? "");
    const local = emptyToNull(formData.get("local_evento"));
    const total = toNumberOrNull(formData.get("valor_total")) ?? 0;
    const entrada = toNumberOrNull(formData.get("valor_entrada")) ?? 0;

    if (!dataEvento) {
      return { ok: false, error: "Informe a data do evento." };
    }
    if (entrada > total) {
      return {
        ok: false,
        error: "A entrada não pode ser maior que o valor total.",
      };
    }

    const { data: lead } = await supabase
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();
    if (!lead) return { ok: false, error: "Lead não encontrado." };

    // Garante um cliente vinculado (Banco de Clientes).
    let clientId = lead.client_id;
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

    // Cria o evento (entra na aba Eventos e no Financeiro pelo mês da data).
    const { data: novoEvento, error: evError } = await supabase
      .from("events")
      .insert({
        company_id: lead.company_id,
        lead_id: lead.id,
        client_id: clientId,
        nome_cliente: lead.nome_cliente,
        tipo_evento: lead.tipo_evento,
        data_evento: dataEvento,
        local_evento: local ?? lead.local_evento,
        quantidade_pessoas: lead.quantidade_pessoas,
        valor_total: total,
        valor_entrada: entrada,
        valor_restante: Math.max(total - entrada, 0),
        responsavel_id: lead.responsavel_id,
        status_evento: "confirmado",
        status_pagamento: derivePaymentStatus(
          total,
          entrada,
          "aguardando_pagamento",
        ),
      })
      .select("id")
      .single();
    if (evError) throw evError;

    // Fecha o lead (some do Kanban) e vincula o cliente criado.
    await supabase
      .from("leads")
      .update({ status: "fechado", client_id: clientId })
      .eq("id", leadId);

    // Lead saiu do funil → remove follow-ups pendentes.
    await deletePendingFollowups(leadId);

    revalidatePath("/leads");
    revalidatePath("/eventos");
    revalidatePath("/financeiro");
    revalidatePath("/clientes");
    revalidatePath("/followups");
    revalidatePath("/dashboard");

    return {
      ok: true,
      data: { eventId: novoEvento!.id },
      message: "Lead fechado e evento criado.",
    };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function createEvent(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const supabase = await createClient();
    const payload = parseEventForm(formData);

    if (!payload.company_id) return { ok: false, error: "Selecione a empresa." };
    if (!payload.nome_cliente)
      return { ok: false, error: "Informe o nome do cliente." };
    if (!payload.data_evento)
      return { ok: false, error: "Informe a data do evento." };

    payload.status_pagamento = derivePaymentStatus(
      payload.valor_total,
      payload.valor_entrada,
      payload.status_pagamento,
    );

    const { data, error } = await supabase
      .from("events")
      .insert(payload as EventInsert)
      .select("id")
      .single();
    if (error) throw error;

    revalidatePath("/eventos");
    revalidatePath("/financeiro");
    revalidatePath("/dashboard");
    return { ok: true, data: { id: data.id }, message: "Evento criado." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function updateEvent(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const payload = parseEventForm(formData);
    if (!payload.nome_cliente)
      return { ok: false, error: "Informe o nome do cliente." };
    if (!payload.data_evento)
      return { ok: false, error: "Informe a data do evento." };

    payload.status_pagamento = derivePaymentStatus(
      payload.valor_total,
      payload.valor_entrada,
      payload.status_pagamento,
    );

    const { error } = await supabase
      .from("events")
      .update(payload)
      .eq("id", id);
    if (error) throw error;

    revalidatePath("/eventos");
    revalidatePath(`/eventos/${id}`);
    revalidatePath("/financeiro");
    revalidatePath("/dashboard");
    return { ok: true, message: "Evento atualizado." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteEvent(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/eventos");
    revalidatePath("/financeiro");
    revalidatePath("/dashboard");
    return { ok: true, message: "Evento excluído." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/**
 * Converte um lead em evento: marca o lead como "fechado", garante um cliente
 * no cadastro e cria o evento pré-preenchido com os dados do lead.
 * Redireciona para a edição do novo evento.
 */
export async function convertLeadToEvent(leadId: string): Promise<void> {
  await requireUser();
  const supabase = await createClient();

  const { data: lead } = await supabase
    .from("leads")
    .select("*")
    .eq("id", leadId)
    .single();
  if (!lead) redirect("/leads");

  // Garante um cliente vinculado
  let clientId = lead.client_id;
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
    if (clientId) {
      await supabase
        .from("leads")
        .update({ client_id: clientId })
        .eq("id", leadId);
    }
  }

  // Cria o evento
  const { data: novoEvento } = await supabase
    .from("events")
    .insert({
      company_id: lead.company_id,
      lead_id: lead.id,
      client_id: clientId,
      nome_cliente: lead.nome_cliente,
      tipo_evento: lead.tipo_evento,
      data_evento: lead.data_evento ?? new Date().toISOString().slice(0, 10),
      local_evento: lead.local_evento,
      quantidade_pessoas: lead.quantidade_pessoas,
      valor_total: lead.valor_estimado ?? 0,
      valor_entrada: 0,
      valor_restante: lead.valor_estimado ?? 0,
      responsavel_id: lead.responsavel_id,
      status_evento: "confirmado",
      status_pagamento: "aguardando_pagamento",
    })
    .select("id")
    .single();

  // Atualiza o lead para fechado
  await supabase.from("leads").update({ status: "fechado" }).eq("id", leadId);

  // Lead saiu do funil → remove follow-ups pendentes.
  await deletePendingFollowups(leadId);

  revalidatePath("/leads");
  revalidatePath("/eventos");
  revalidatePath("/followups");
  revalidatePath("/dashboard");

  if (novoEvento?.id) redirect(`/eventos/${novoEvento.id}/editar`);
  redirect("/eventos");
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Ocorreu um erro inesperado.";
}
