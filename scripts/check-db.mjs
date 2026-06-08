/**
 * Diagnóstico de conexão com o Supabase.
 * Uso: node scripts/check-db.mjs
 *
 * Lê .env.local, verifica cada tabela e tenta um SELECT real.
 * Útil quando aparecer "Could not find the table ... in the schema cache".
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = readFileSync(new URL("../.env.local", import.meta.url), "utf8");
for (const line of env.split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("❌ Faltam NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY no .env.local");
  process.exit(1);
}
console.log("URL:", url);
console.log("KEY:", key.slice(0, 22) + "...\n");

const supabase = createClient(url, key);
const tables = [
  "companies",
  "users_profile",
  "clients",
  "leads",
  "lead_interactions",
  "followups",
  "events",
  "activity_logs",
];

let allOk = true;
for (const t of tables) {
  const { error } = await supabase.from(t).select("id").limit(1);
  if (error) {
    allOk = false;
    console.log(`❌ ${t.padEnd(20)} ${error.code} — ${error.message}`);
  } else {
    console.log(`✅ ${t.padEnd(20)} OK`);
  }
}

console.log("");
if (allOk) {
  console.log("🎉 Tudo certo! Todas as tabelas respondem. Reinicie o npm run dev.");
} else {
  console.log(
    "⚠️  Alguma tabela falhou. No SQL Editor do Supabase, rode:\n" +
      "    notify pgrst, 'reload schema';\n" +
      "Se persistir, rode lib/sql/schema.sql inteiro novamente.",
  );
}
