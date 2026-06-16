"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { isEmailAllowedToSignup } from "@/lib/allowed-emails";
import {
  checkLoginRateLimit,
  checkIpRateLimit,
  recordFailedAttempt,
  clearAttempts,
} from "@/lib/login-rate-limit";
import type { ActionResult } from "@/types";

/**
 * Lê o IP do cliente a partir dos headers de proxy (best-effort).
 * Atenção: `x-forwarded-for` é falsificável pelo cliente quando não há um proxy
 * confiável na frente. Em provedores como a Vercel o header é definido pela
 * borda; em self-host sem reverse proxy confiável, não confie no valor cru.
 */
async function getClientIp(): Promise<string | null> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? null;
  return h.get("x-real-ip");
}

/** Mensagem de bloqueio por excesso de tentativas. */
function blockedMessage(retryAfterMinutes: number): string {
  return `Muitas tentativas de login. Tente novamente em ${retryAfterMinutes} minuto(s).`;
}

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

  // Rate limiting: bloqueia após MAX_ATTEMPTS falhas (por e-mail) ou
  // MAX_ATTEMPTS_PER_IP (por IP) dentro da janela de WINDOW_MINUTES minutos.
  const ip = await getClientIp();
  const [emailLimit, ipLimit] = await Promise.all([
    checkLoginRateLimit(email),
    checkIpRateLimit(ip),
  ]);
  if (emailLimit.blocked || ipLimit.blocked) {
    return {
      ok: false,
      error: blockedMessage(
        Math.max(emailLimit.retryAfterMinutes, ipLimit.retryAfterMinutes),
      ),
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await recordFailedAttempt(email, ip);

    // Recalcula após registrar esta falha: se ela atingiu o limite, avisa do
    // bloqueio com o tempo real de espera. Caso contrário, mantém a mensagem
    // genérica (não revela o contador, para não vazar estado da conta).
    const after = await checkLoginRateLimit(email);
    if (after.blocked) {
      return { ok: false, error: blockedMessage(after.retryAfterMinutes) };
    }

    return {
      ok: false,
      error:
        error.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos."
          : "Não foi possível entrar. Tente novamente.",
    };
  }

  // Login OK: zera o contador de tentativas deste e-mail.
  await clearAttempts(email);

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
    return {
      ok: false,
      error: "Não foi possível criar a conta: " + error.message,
    };
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
