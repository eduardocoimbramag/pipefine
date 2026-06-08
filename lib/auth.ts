import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/types";

/** Retorna o usuário autenticado ou null (sem redirecionar). */
export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** Exige autenticação. Redireciona para /login se não houver sessão. */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** Retorna o perfil do usuário logado (users_profile), criando exigência de login. */
export async function getCurrentProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users_profile")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Fallback: se por algum motivo o perfil não existir, devolve um objeto mínimo.
  if (!data) {
    return {
      id: user.id,
      full_name: user.email?.split("@")[0] ?? null,
      email: user.email ?? null,
      role: "comercial",
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }
  return data;
}
