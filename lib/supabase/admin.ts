import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Cliente Supabase com a SERVICE ROLE (ignora o RLS). NUNCA use no cliente nem
 * exponha a chave: ela é secreta e só existe no servidor. Hoje é usado apenas
 * pelo rate limiting do login (tabela login_attempts), que precisa de acesso
 * ANTES do usuário estar autenticado.
 *
 * Retorna `null` quando a SUPABASE_SERVICE_ROLE_KEY não está configurada — assim
 * o login continua funcionando (apenas sem rate limiting) em ambientes onde a
 * chave ainda não foi adicionada.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
