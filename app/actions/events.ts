"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { deletePendingFollowups } from "@/lib/followups";
import {
  replaceInstallments,
  recalcEventFromInstallments,
  paymentFeatureAvailable,
  isMissingPaymentFeatureError,
} from "@/lib/installments.server";
import type { GeneratedInstallment } from "@/lib/installments";
import { emptyToNull, toNumberOrNull } from "@/lib/utils";
import type {
  ActionResult,
  EventInsert,
  EventUpdate,
  EventStatus,
  PaymentStatus,
  PaymentMethod,
} from "@/types";

/** Lê e valida o array de parcelas vindo do formulário (campo JSON). */
function parseInstallments(raw: FormDataEntryValue | null): GeneratedInstallment[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(String(raw));
    if (!Array.isArray(arr)) return [];
    return arr
      .map((i, idx) => ({
        numero: Number(i.numero) || idx + 1,
        data_vencimento: String(i.data_vencimento ?? ""),
        valor: Number(i.valor) || 0,
      }))
      .filter((i) => i.data_vencimento.length > 0);
  } catch {
    return [];
  }
}

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
    payment_method:
      (emptyToNull(formData.get("payment_method")) as PaymentMethod | null) ??
      null,
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
    const paymentMethod =
      (emptyToNull(formData.get("payment_method")) as PaymentMethod | null) ??
      null;
    const installments = parseInstallments(formData.get("installments"));

    if (!dataEvento) {
      return { ok: false, error: "Informe a data do evento." };
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

    // O recurso de parcelas só é usado se a migração 002 estiver aplicada.
    const featureOk = await paymentFeatureAvailable();

    // Cria o evento (entra na aba Eventos e no Financeiro pelo mês da data).
    const eventPayload: EventInsert = {
      company_id: lead.company_id,
      lead_id: lead.id,
      client_id: clientId,
      nome_cliente: lead.nome_cliente,
      tipo_evento: lead.tipo_evento,
      data_evento: dataEvento,
      local_evento: local ?? lead.local_evento,
      quantidade_pessoas: lead.quantidade_pessoas,
      valor_total: total,
      valor_entrada: 0,
      valor_restante: total,
      // payment_method só quando o recurso existe (migração 002 aplicada).
      ...(featureOk ? { payment_method: paymentMethod } : {}),
      responsavel_id: lead.responsavel_id,
      status_evento: "confirmado",
      status_pagamento: "aguardando_pagamento",
    };

    const { data: novoEvento, error: evError } = await supabase
      .from("events")
      .insert(eventPayload)
      .select("id")
      .single();
    if (evError) throw evError;

    // Salva as parcelas e recalcula recebido/restante/status a partir delas.
    if (featureOk && installments.length > 0) {
      await replaceInstallments(novoEvento!.id, installments);
    }

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

    const installments = parseInstallments(formData.get("installments"));
    const featureOk = await paymentFeatureAvailable();

    payload.status_pagamento = derivePaymentStatus(
      payload.valor_total,
      payload.valor_entrada,
      payload.status_pagamento,
    );

    // Sem o recurso de parcelas (migração 002 não aplicada), não enviamos a
    // coluna payment_method (que não existe) — o evento é criado normalmente.
    const insertPayload: EventInsert = { ...payload };
    if (!featureOk) delete insertPayload.payment_method;

    const { data, error } = await supabase
      .from("events")
      .insert(insertPayload)
      .select("id")
      .single();
    if (error) throw error;

    // Com parcelas: elas definem recebido/restante/status.
    if (featureOk && installments.length > 0) {
      await replaceInstallments(data.id, installments);
    }

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

    const installments = parseInstallments(formData.get("installments"));
    const temParcelas = formData.get("installments") !== null;
    const featureOk = await paymentFeatureAvailable();

    payload.status_pagamento = derivePaymentStatus(
      payload.valor_total,
      payload.valor_entrada,
      payload.status_pagamento,
    );

    // Sem o recurso de parcelas, não enviamos a coluna payment_method.
    const updatePayload: EventUpdate = { ...payload };
    if (!featureOk) delete updatePayload.payment_method;

    const { error } = await supabase
      .from("events")
      .update(updatePayload)
      .eq("id", id);
    if (error) throw error;

    // Se o formulário enviou parcelas e o recurso existe, substitui o cronograma.
    if (featureOk && temParcelas) {
      await replaceInstallments(id, installments);
    }

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

/** Marca uma parcela como paga/pendente e recalcula os totais do evento. */
export async function toggleInstallmentPaid(
  installmentId: string,
  eventId: string,
  pago: boolean,
): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from("payment_installments")
      .update({ pago, pago_em: pago ? new Date().toISOString() : null })
      .eq("id", installmentId);
    if (error) throw error;

    await recalcEventFromInstallments(eventId);

    revalidatePath(`/eventos/${eventId}`);
    revalidatePath("/eventos");
    revalidatePath("/financeiro");
    revalidatePath("/dashboard");
    return {
      ok: true,
      message: pago ? "Parcela marcada como paga." : "Parcela reaberta.",
    };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

function errMsg(e: unknown): string {
  // Migração de parcelas ainda não aplicada no banco (tabela/coluna/enum ausentes).
  if (isMissingPaymentFeatureError(e)) {
    return "O recurso de parcelas ainda não foi ativado no banco. Rode a migração lib/sql/migrations/002_payment_installments.sql no Supabase.";
  }

  // Erros do Supabase/PostgREST são objetos com message (não Error).
  const obj = e as { message?: string } | null;
  if (e instanceof Error) return e.message;
  if (obj?.message) return obj.message;
  return "Ocorreu um erro inesperado.";
}
