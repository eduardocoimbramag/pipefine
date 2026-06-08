"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { emptyToNull } from "@/lib/utils";
import type { ActionResult } from "@/types";

function parseClientForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    phone: emptyToNull(formData.get("phone")),
    email: emptyToNull(formData.get("email")),
    instagram: emptyToNull(formData.get("instagram")),
    notes: emptyToNull(formData.get("notes")),
  };
}

export async function createClientRecord(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireUser();
    const supabase = await createClient();
    const payload = parseClientForm(formData);
    if (!payload.name) return { ok: false, error: "Informe o nome." };

    const { data, error } = await supabase
      .from("clients")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw error;

    revalidatePath("/clientes");
    return { ok: true, data: { id: data.id }, message: "Cliente criado." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function updateClientRecord(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const payload = parseClientForm(formData);
    if (!payload.name) return { ok: false, error: "Informe o nome." };

    const { error } = await supabase
      .from("clients")
      .update(payload)
      .eq("id", id);
    if (error) throw error;

    revalidatePath("/clientes");
    revalidatePath(`/clientes/${id}`);
    return { ok: true, message: "Cliente atualizado." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function deleteClientRecord(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase.from("clients").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/clientes");
    return { ok: true, message: "Cliente excluído." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Ocorreu um erro inesperado.";
}
