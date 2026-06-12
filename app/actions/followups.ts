"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import {
  upsertFollowupForLead,
  syncLeadNextFollowup,
} from "@/lib/followups";
import { emptyToNull } from "@/lib/utils";
import type { ActionResult } from "@/types";

/**
 * Revalida todas as telas que exibem dados de follow-up:
 * aba Follow-ups, Kanban/lista de leads, página do lead e Dashboard.
 */
function revalidateFollowupViews(leadId?: string | null) {
  revalidatePath("/followups");
  revalidatePath("/leads");
  if (leadId) revalidatePath(`/leads/${leadId}`);
  revalidatePath("/dashboard");
}

export async function createFollowup(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireUser();

    const lead_id = String(formData.get("lead_id") ?? "");
    const titulo = String(formData.get("titulo") ?? "").trim();
    const data_vencimento = String(formData.get("data_vencimento") ?? "");

    if (!lead_id) return { ok: false, error: "Vincule a um lead." };
    if (!titulo) return { ok: false, error: "Informe o título." };
    if (!data_vencimento)
      return { ok: false, error: "Informe a data de vencimento." };

    // Regra: 1 follow-up ativo por lead — atualiza o pendente se já existir.
    // (upsertFollowupForLead também sincroniza lead.data_proximo_followup)
    await upsertFollowupForLead(lead_id, {
      titulo,
      descricao: emptyToNull(formData.get("descricao")),
      data_vencimento,
      responsavel_id: emptyToNull(formData.get("responsavel_id")),
    });

    revalidateFollowupViews(lead_id);
    return { ok: true, message: "Follow-up salvo." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/** Edita um follow-up existente (título, descrição e vencimento). */
export async function updateFollowup(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();

    const titulo = String(formData.get("titulo") ?? "").trim();
    const data_vencimento = String(formData.get("data_vencimento") ?? "");
    if (!titulo) return { ok: false, error: "Informe o título." };
    if (!data_vencimento)
      return { ok: false, error: "Informe a data de vencimento." };

    const { data: row, error } = await supabase
      .from("followups")
      .update({
        titulo,
        descricao: emptyToNull(formData.get("descricao")),
        data_vencimento,
      })
      .eq("id", id)
      .select("lead_id")
      .single();
    if (error) throw error;

    // Mantém o card do Kanban/lista coerente com a nova data.
    if (row?.lead_id) await syncLeadNextFollowup(row.lead_id);

    revalidateFollowupViews(row?.lead_id);
    return { ok: true, message: "Follow-up atualizado." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function completeFollowup(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("followups")
      .update({ status: "concluido", concluido_em: new Date().toISOString() })
      .eq("id", id)
      .select("lead_id")
      .single();
    if (error) throw error;

    if (row?.lead_id) await syncLeadNextFollowup(row.lead_id);

    revalidateFollowupViews(row?.lead_id);
    return { ok: true, message: "Follow-up concluído." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function rescheduleFollowup(
  id: string,
  novaData: string,
): Promise<ActionResult> {
  try {
    await requireUser();
    if (!novaData) return { ok: false, error: "Selecione a nova data." };
    const supabase = await createClient();
    // Só follow-ups pendentes podem ser reagendados (não "ressuscita"
    // cancelados/concluídos, o que violaria a regra de 1 ativo por lead).
    const { data: row, error } = await supabase
      .from("followups")
      .update({ data_vencimento: novaData })
      .eq("id", id)
      .eq("status", "pendente")
      .select("lead_id")
      .maybeSingle();
    if (error) throw error;
    if (!row) {
      return {
        ok: false,
        error: "Só é possível reagendar um follow-up pendente.",
      };
    }

    await syncLeadNextFollowup(row.lead_id);

    revalidateFollowupViews(row.lead_id);
    return { ok: true, message: "Follow-up reagendado." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function cancelFollowup(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("followups")
      .update({ status: "cancelado" })
      .eq("id", id)
      .select("lead_id")
      .single();
    if (error) throw error;

    if (row?.lead_id) await syncLeadNextFollowup(row.lead_id);

    revalidateFollowupViews(row?.lead_id);
    return { ok: true, message: "Follow-up cancelado." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteFollowup(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { data: row, error } = await supabase
      .from("followups")
      .delete()
      .eq("id", id)
      .select("lead_id")
      .single();
    if (error) throw error;

    if (row?.lead_id) await syncLeadNextFollowup(row.lead_id);

    revalidateFollowupViews(row?.lead_id);
    return { ok: true, message: "Follow-up excluído." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  const obj = e as { message?: string } | null;
  if (obj?.message) return obj.message;
  return "Ocorreu um erro inesperado.";
}
