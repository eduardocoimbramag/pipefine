"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { upsertFollowupForLead } from "@/lib/followups";
import { emptyToNull } from "@/lib/utils";
import type { ActionResult } from "@/types";

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
    await upsertFollowupForLead(lead_id, {
      titulo,
      descricao: emptyToNull(formData.get("descricao")),
      data_vencimento,
      responsavel_id: emptyToNull(formData.get("responsavel_id")),
    });

    revalidatePath("/followups");
    revalidatePath(`/leads/${lead_id}`);
    revalidatePath("/dashboard");
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

    revalidatePath("/followups");
    if (row?.lead_id) revalidatePath(`/leads/${row.lead_id}`);
    revalidatePath("/dashboard");
    return { ok: true, message: "Follow-up atualizado." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function completeFollowup(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from("followups")
      .update({ status: "concluido", concluido_em: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/followups");
    revalidatePath("/dashboard");
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
    const { error } = await supabase
      .from("followups")
      .update({ data_vencimento: novaData, status: "pendente" })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/followups");
    revalidatePath("/dashboard");
    return { ok: true, message: "Follow-up reagendado." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function cancelFollowup(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from("followups")
      .update({ status: "cancelado" })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/followups");
    revalidatePath("/dashboard");
    return { ok: true, message: "Follow-up cancelado." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteFollowup(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase.from("followups").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/followups");
    revalidatePath("/dashboard");
    return { ok: true, message: "Follow-up excluído." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Ocorreu um erro inesperado.";
}
