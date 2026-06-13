import { createClient } from "@/lib/supabase/server";
import { isMissingPaymentFeatureError } from "@/lib/installments.server";

/**
 * Verifica se a coluna leads.relinked existe no banco (migração 004 aplicada).
 *
 * Usado para degradar graciosamente: sem a coluna, o vínculo "Cliente antigo?"
 * é inferido por client_id (menos robusto, mas funcional). Com a coluna, o
 * marcador é imutável e sobrevive à exclusão do cliente.
 */
export async function relinkFeatureAvailable(): Promise<boolean> {
  const supabase = await createClient();
  const { error } = await supabase.from("leads").select("relinked").limit(1);
  // Reusa os mesmos códigos de "coluna/tabela ausente" do recurso de parcelas.
  if (error && isMissingPaymentFeatureError(error)) return false;
  return true;
}
