-- =============================================================================
-- MIGRAÇÃO 002 — Formas de pagamento e parcelas (payment_installments)
-- =============================================================================
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run.
-- É idempotente (pode rodar mais de uma vez sem erro).
--
-- O que adiciona:
--   - enum payment_method (total, entrada_50_50, parcelado)
--   - coluna events.payment_method
--   - tabela payment_installments (cronograma de parcelas, com baixa por parcela)
--   - RLS, índices e trigger de updated_at
-- =============================================================================

-- FUNÇÃO de updated_at (cria se não existir, para a migração ser autossuficiente)
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ENUM: forma de pagamento ----------------------------------------------------
do $$ begin
  create type payment_method as enum ('total', 'entrada_50_50', 'parcelado');
exception when duplicate_object then null; end $$;

-- Coluna na tabela de eventos -------------------------------------------------
alter table events
  add column if not exists payment_method payment_method;

-- TABELA: parcelas ------------------------------------------------------------
create table if not exists payment_installments (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references events(id) on delete cascade,
  numero          integer not null,            -- 1, 2, 3...
  data_vencimento date not null,
  valor           numeric(12,2) not null default 0,
  pago            boolean not null default false,
  pago_em         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Índices
create index if not exists idx_installments_event on payment_installments(event_id);
create index if not exists idx_installments_venc  on payment_installments(data_vencimento);
create index if not exists idx_installments_pago  on payment_installments(pago);

-- Unicidade de (event_id, numero) — o app pressupõe 1 parcela por número/evento.
create unique index if not exists uq_installments_event_numero
  on payment_installments(event_id, numero);

-- Trigger de updated_at (reaproveita a função set_updated_at já existente)
drop trigger if exists trg_installments_updated on payment_installments;
create trigger trg_installments_updated before update on payment_installments
  for each row execute function set_updated_at();

-- RLS: acesso para qualquer usuário autenticado (mesmo padrão das demais tabelas)
alter table payment_installments enable row level security;

do $$
begin
  execute 'drop policy if exists "auth_select_payment_installments" on payment_installments';
  execute 'drop policy if exists "auth_insert_payment_installments" on payment_installments';
  execute 'drop policy if exists "auth_update_payment_installments" on payment_installments';
  execute 'drop policy if exists "auth_delete_payment_installments" on payment_installments';

  execute 'create policy "auth_select_payment_installments" on payment_installments
    for select to authenticated using (true)';
  execute 'create policy "auth_insert_payment_installments" on payment_installments
    for insert to authenticated with check (true)';
  execute 'create policy "auth_update_payment_installments" on payment_installments
    for update to authenticated using (true) with check (true)';
  execute 'create policy "auth_delete_payment_installments" on payment_installments
    for delete to authenticated using (true)';
end $$;

-- Recarrega o cache do PostgREST para a API enxergar a nova tabela/coluna.
notify pgrst, 'reload schema';

-- Fim da migração 002.
