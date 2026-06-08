import { createClient } from "@/lib/supabase/server";
import type { Company, UserProfile } from "@/types";

/** Lista todas as empresas ativas (para filtros e selects). */
export async function getCompanies(): Promise<Company[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("companies")
    .select("*")
    .order("name");
  return data ?? [];
}

/** Lista os perfis de usuários ativos (responsáveis). */
export async function getProfiles(): Promise<UserProfile[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users_profile")
    .select("*")
    .eq("active", true)
    .order("full_name");
  return data ?? [];
}
