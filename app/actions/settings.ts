"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { emptyToNull } from "@/lib/utils";
import type { ActionResult, UserRole } from "@/types";

export async function createCompany(
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const name = String(formData.get("name") ?? "").trim();
    if (!name) return { ok: false, error: "Informe o nome da empresa." };

    const { error } = await supabase.from("companies").insert({ name });
    if (error) {
      if (error.code === "23505")
        return { ok: false, error: "Já existe uma empresa com esse nome." };
      throw error;
    }
    // Revalida o layout para que a nova empresa apareça no seletor da topbar.
    revalidatePath("/", "layout");
    return { ok: true, message: "Empresa criada." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function toggleCompany(
  id: string,
  active: boolean,
): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from("companies")
      .update({ active })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/", "layout");
    return { ok: true, message: "Empresa atualizada." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/**
 * Exclui permanentemente uma empresa.
 * Bloqueia a exclusão se houver leads ou eventos vinculados (o banco usa
 * `on delete restrict`), retornando uma mensagem explicativa.
 */
export async function deleteCompany(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();

    // Conta vínculos antes de tentar excluir, para dar uma mensagem clara.
    const [leadsRes, eventsRes] = await Promise.all([
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("company_id", id),
      supabase
        .from("events")
        .select("id", { count: "exact", head: true })
        .eq("company_id", id),
    ]);

    const leads = leadsRes.count ?? 0;
    const events = eventsRes.count ?? 0;

    if (leads > 0 || events > 0) {
      const partes: string[] = [];
      if (leads > 0) partes.push(`${leads} lead${leads > 1 ? "s" : ""}`);
      if (events > 0) partes.push(`${events} evento${events > 1 ? "s" : ""}`);
      return {
        ok: false,
        error: `Não é possível excluir: há ${partes.join(" e ")} vinculado(s) a esta empresa. Desative-a em vez de excluir.`,
      };
    }

    const { error } = await supabase.from("companies").delete().eq("id", id);
    if (error) {
      // Rede de segurança caso surjam vínculos entre a contagem e o delete.
      if (error.code === "23503") {
        return {
          ok: false,
          error:
            "Não é possível excluir: há registros vinculados a esta empresa. Desative-a em vez de excluir.",
        };
      }
      throw error;
    }

    revalidatePath("/", "layout");
    return { ok: true, message: "Empresa excluída." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function updateProfile(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from("users_profile")
      .update({
        full_name: emptyToNull(formData.get("full_name")),
        role: String(formData.get("role") ?? "comercial") as UserRole,
      })
      .eq("id", id);
    if (error) throw error;
    revalidatePath("/configuracoes");
    return { ok: true, message: "Perfil atualizado." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Ocorreu um erro inesperado.";
}
