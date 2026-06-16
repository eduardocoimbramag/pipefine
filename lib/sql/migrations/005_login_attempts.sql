-- =============================================================================
-- MIGRAÇÃO 005 — Tabela login_attempts (rate limiting do login)
-- =============================================================================
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run.
-- Pode rodar quantas vezes quiser (idempotente).
--
-- Contexto: o login não tinha nenhum freio contra adivinhação de senha. Esta
-- tabela registra UMA LINHA POR TENTATIVA FALHA, identificada pelo e-mail (e,
-- opcionalmente, pelo IP). O servidor conta as falhas dos últimos 15 minutos e
-- bloqueia novas tentativas a partir de 5. Em um login bem-sucedido, as linhas
-- daquele e-mail são apagadas (zera o contador).
--
-- ACESSO: o login acontece ANTES da autenticação, então nem o papel `anon` nem
-- o `authenticated` podem tocar nesta tabela. O RLS fica ATIVADO e SEM políticas
-- — apenas a SERVICE ROLE (que ignora o RLS) lê/escreve, a partir do servidor
-- (app/login/actions.ts via lib/supabase/admin.ts). Assim a chave pública do
-- navegador não consegue ler nem limpar as tentativas.
-- =============================================================================

-- FUNÇÃO de updated_at (cria se não existir, para a migração ser autossuficiente)
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- TABELA: tentativas de login ------------------------------------------------
create table if not exists login_attempts (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  ip          text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Índices: a consulta filtra por email (já gravado em minúsculas) ou ip, dentro
-- de uma janela de tempo. Índices compostos cobrem (chave + created_at) juntos.
create index if not exists idx_login_attempts_email   on login_attempts(email, created_at);
create index if not exists idx_login_attempts_ip      on login_attempts(ip, created_at);
create index if not exists idx_login_attempts_created on login_attempts(created_at);

-- Trigger de updated_at (reaproveita a função set_updated_at já existente)
drop trigger if exists trg_login_attempts_updated on login_attempts;
create trigger trg_login_attempts_updated before update on login_attempts
  for each row execute function set_updated_at();

-- RLS: ATIVADO e SEM POLÍTICAS. anon/authenticated ficam bloqueados; somente a
-- service role (que bypassa o RLS) acessa, a partir do servidor.
alter table login_attempts enable row level security;
alter table login_attempts force row level security;

-- Garante que nenhuma política antiga (de execuções anteriores) sobreviva.
do $$
begin
  execute 'drop policy if exists "auth_select_login_attempts" on login_attempts';
  execute 'drop policy if exists "auth_insert_login_attempts" on login_attempts';
  execute 'drop policy if exists "auth_update_login_attempts" on login_attempts';
  execute 'drop policy if exists "auth_delete_login_attempts" on login_attempts';
end $$;

-- Recarrega o cache do PostgREST para a API enxergar a nova tabela.
notify pgrst, 'reload schema';

-- Fim da migração 005.
