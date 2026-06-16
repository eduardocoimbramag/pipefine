import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/** Máximo de falhas por e-mail dentro da janela antes de bloquear. */
export const MAX_ATTEMPTS = 5;
/** Máximo de falhas por IP dentro da janela (mais alto: IPs são compartilhados). */
export const MAX_ATTEMPTS_PER_IP = 20;
/** Tamanho da janela de contagem, em minutos. */
export const WINDOW_MINUTES = 15;

export interface RateLimitStatus {
  /** true se atingiu o limite na janela. */
  blocked: boolean;
  /** Quantas falhas restam antes do bloqueio (0 quando bloqueado). */
  remaining: number;
  /** Minutos até liberar (arredondado para cima), quando bloqueado. */
  retryAfterMinutes: number;
}

function windowStartISO(): string {
  return new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
}

/** Calcula o status a partir das datas de criação das falhas na janela. */
function statusFromRows(
  rows: { created_at: string }[],
  max: number,
): RateLimitStatus {
  const count = rows.length;
  const blocked = count >= max;
  let retryAfterMinutes = 0;
  if (blocked) {
    // Libera quando a tentativa mais antiga sair da janela (rolling window).
    const oldest = new Date(rows[0].created_at).getTime();
    const freeAt = oldest + WINDOW_MINUTES * 60_000;
    retryAfterMinutes = Math.max(1, Math.ceil((freeAt - Date.now()) / 60_000));
  }
  return { blocked, remaining: Math.max(0, max - count), retryAfterMinutes };
}

/**
 * Status de rate limiting para um e-mail: conta as falhas dentro da janela.
 * Degrada para "não bloqueado" se o cliente admin não estiver configurado
 * (sem service-role key) ou o banco falhar — o login segue funcionando.
 */
export async function checkLoginRateLimit(
  email: string,
): Promise<RateLimitStatus> {
  const admin = createAdminClient();
  if (!admin)
    return { blocked: false, remaining: MAX_ATTEMPTS, retryAfterMinutes: 0 };

  const { data, error } = await admin
    .from("login_attempts")
    .select("created_at")
    .eq("email", email.toLowerCase())
    .gte("created_at", windowStartISO())
    .order("created_at", { ascending: true });

  if (error || !data) {
    return { blocked: false, remaining: MAX_ATTEMPTS, retryAfterMinutes: 0 };
  }
  return statusFromRows(data, MAX_ATTEMPTS);
}

/**
 * Status de rate limiting para um IP. Limite mais alto que o de e-mail, pois
 * vários usuários legítimos podem compartilhar o mesmo IP (NAT). Sem IP ou sem
 * admin, degrada para "não bloqueado".
 */
export async function checkIpRateLimit(
  ip: string | null,
): Promise<RateLimitStatus> {
  const admin = createAdminClient();
  if (!admin || !ip)
    return {
      blocked: false,
      remaining: MAX_ATTEMPTS_PER_IP,
      retryAfterMinutes: 0,
    };

  const { data, error } = await admin
    .from("login_attempts")
    .select("created_at")
    .eq("ip", ip)
    .gte("created_at", windowStartISO())
    .order("created_at", { ascending: true });

  if (error || !data) {
    return {
      blocked: false,
      remaining: MAX_ATTEMPTS_PER_IP,
      retryAfterMinutes: 0,
    };
  }
  return statusFromRows(data, MAX_ATTEMPTS_PER_IP);
}

/**
 * Registra uma tentativa de login FALHA (e-mail + IP, se houver) e, de forma
 * oportunista, remove as tentativas que já saíram da janela — isso mantém a
 * tabela limitada à atividade recente mesmo para e-mails que nunca logam
 * (evita crescimento ilimitado por força bruta).
 */
export async function recordFailedAttempt(
  email: string,
  ip: string | null,
): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;

  const { error: insErr } = await admin
    .from("login_attempts")
    .insert({ email: email.toLowerCase(), ip });
  if (insErr) {
    console.error(
      "[login-rate-limit] falha ao registrar tentativa:",
      insErr.message,
    );
  }

  // Poda oportunista das tentativas expiradas (de todos os e-mails/IPs).
  const { error: pruneErr } = await admin
    .from("login_attempts")
    .delete()
    .lt("created_at", windowStartISO());
  if (pruneErr) {
    console.error(
      "[login-rate-limit] falha ao podar tentativas antigas:",
      pruneErr.message,
    );
  }
}

/** Limpa as tentativas de um e-mail (após login bem-sucedido). */
export async function clearAttempts(email: string): Promise<void> {
  const admin = createAdminClient();
  if (!admin) return;
  const { error } = await admin
    .from("login_attempts")
    .delete()
    .eq("email", email.toLowerCase());
  if (error) {
    console.error(
      "[login-rate-limit] falha ao limpar tentativas:",
      error.message,
    );
  }
}
