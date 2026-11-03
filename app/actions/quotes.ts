"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import type { ActionResult } from "@/types";

/** Aba Orçamentos + contador da sidebar (que vive no layout). */
function revalidateQuoteViews() {
  revalidatePath("/orcamentos");
  revalidatePath("/", "layout");
}

/** Tira a comanda da fila: o orçamento foi enviado ao cliente. */
export async function markQuoteSent(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("quote_requests")
      .update({ status: "enviado", enviado_em: new Date().toISOString() })
      .eq("id", id)
      .eq("status", "pendente")
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return { ok: false, error: "Esta comanda já não está pendente." };
    }

    revalidateQuoteViews();
    return { ok: true, message: "Orçamento marcado como enviado." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/** Devolve um orçamento enviado para a fila de pendentes. */
export async function reopenQuote(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("quote_requests")
      .update({ status: "pendente", enviado_em: null })
      .eq("id", id)
      .eq("status", "enviado")
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) {
      return { ok: false, error: "Este orçamento já está pendente." };
    }

    revalidateQuoteViews();
    return { ok: true, message: "Comanda voltou para pendentes." };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/** Exclui um pedido (ex.: spam ou duplicado). */
export async function deleteQuote(id: string): Promise<ActionResult> {
  try {
    await requireUser();
    const supabase = await createClient();
    const { error } = await supabase
      .from("quote_requests")
      .delete()
      .eq("id", id);
    if (error) throw error;

    revalidateQuoteViews();
    return { ok: true, message: "Pedido excluído." };
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
