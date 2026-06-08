"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isEmailAllowedToSignup } from "@/lib/allowed-emails";
import type { ActionResult } from "@/types";

export async function signIn(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirectTo") ?? "/dashboard");

  if (!email || !password) {
    return { ok: false, error: "Informe e-mail e senha." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return {
      ok: false,
      error:
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : "Não foi possível entrar. Tente novamente.",
    };
  }

  revalidatePath("/", "layout");
  redirect(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
}

export async function signUp(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!fullName || !email || !password) {
    return { ok: false, error: "Preencha todos os campos." };
  }
  if (password.length < 6) {
    return { ok: false, error: "A senha deve ter pelo menos 6 caracteres." };
  }

  // Só e-mails previamente autorizados podem criar conta.
  if (!isEmailAllowedToSignup(email)) {
    return {
      ok: false,
      error:
        "Este e-mail não está autorizado a criar uma conta. Fale com o administrador do sistema.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return { ok: false, error: "Não foi possível criar a conta: " + error.message };
  }

  return {
    ok: true,
    message:
      "Conta criada! Se a confirmação por e-mail estiver desativada, já pode entrar.",
  };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
