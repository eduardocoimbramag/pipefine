-- =============================================================================
-- PIPEFINE — Schema completo do banco de dados (Supabase / PostgreSQL)
-- =============================================================================
-- Como usar:
--   1. Supabase Dashboard > SQL Editor > New query
--   2. Cole TODO este arquivo e clique em "Run".
--   3. Crie os usuários em Authentication > Users (ou pela tela de login).
--
-- Modelo de acesso: todos os usuários autenticados acessam todas as empresas
-- e todos os dados (negócio de família). RLS apenas exige login.
-- =============================================================================

-- Extensão para gen_random_uuid()
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('admin', 'comercial', 'operacional', 'financeiro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_status as enum (
    'novo_lead', 'contato_iniciado', 'briefing_solicitado', 'orcamento_pendente',
    'orcamento_enviado', 'aguardando_retorno', 'followup_1', 'followup_2',
    'negociacao', 'fechado', 'perdido', 'sem_resposta'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type lead_origin as enum (
    'instagram', 'indicacao', 'google', 'site', 'whatsapp', 'facebook', 'evento', 'outro'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type followup_status as enum ('pendente', 'concluido', 'cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_status as enum ('confirmado', 'em_producao', 'finalizado', 'cancelado');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('aguardando_pagamento', 'entrada_paga', 'pago_integralmente');
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_method as enum ('total', 'entrada_50_50', 'parcelado');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- FUNÇÃO: trigger de updated_at
-- -----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- =============================================================================
-- TABELAS
-- =============================================================================

-- COMPANIES --------------------------------------------------------------------
create table if not exists companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- USERS_PROFILE ----------------------------------------------------------------
create table if not exists users_profile (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  email       text,
  role        user_role not null default 'comercial',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- CLIENTS ----------------------------------------------------------------------
create table if not exists clients (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  phone       text,
  email       text,
  instagram   text,
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- LEADS ------------------------------------------------------------------------
create table if not exists leads (
  id                      uuid primary key default gen_random_uuid(),
  company_id              uuid not null references companies(id) on delete restrict,
  client_id               uuid references clients(id) on delete set null,
  nome_cliente            text not null,
  telefone                text,
  email                   text,
  instagram               text,
  origem_lead             lead_origin,
  tipo_evento             text,
  data_evento             date,
  local_evento            text,
  quantidade_pessoas      integer,
  valor_estimado          numeric(12,2),
  status                  lead_status not null default 'novo_lead',
  responsavel_id          uuid references users_profile(id) on delete set null,
  data_primeiro_contato   date,
  data_orcamento_enviado  date,
  data_proximo_followup   date,
  observacoes             text,
  motivo_perda            text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- LEAD_INTERACTIONS (histórico de contato) ------------------------------------
create table if not exists lead_interactions (
  id          uuid primary key default gen_random_uuid(),
  lead_id     uuid not null references leads(id) on delete cascade,
  user_id     uuid references users_profile(id) on delete set null,
  tipo        text not null default 'nota',
  descricao   text not null,
  created_at  timestamptz not null default now()
);

-- FOLLOWUPS --------------------------------------------------------------------
create table if not exists followups (
  id              uuid primary key default gen_random_uuid(),
  lead_id         uuid not null references leads(id) on delete cascade,
  titulo          text not null,
  descricao       text,
  data_vencimento date not null,
  status          followup_status not null default 'pendente',
  responsavel_id  uuid references users_profile(id) on delete set null,
  concluido_em    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- EVENTS -----------------------------------------------------------------------
create table if not exists events (
  id                        uuid primary key default gen_random_uuid(),
  company_id                uuid not null references companies(id) on delete restrict,
  lead_id                   uuid references leads(id) on delete set null,
  client_id                 uuid references clients(id) on delete set null,
  nome_cliente              text not null,
  tipo_evento               text,
  data_evento               date not null,
  horario_inicio            time,
  horario_fim               time,
  local_evento              text,
  quantidade_pessoas        integer,
  servicos_contratados      text,
  valor_total               numeric(12,2) not null default 0,
  valor_entrada             numeric(12,2) not null default 0,
  valor_restante            numeric(12,2) not null default 0,
  forma_pagamento           text,
  payment_method            payment_method,
  status_pagamento          payment_status not null default 'aguardando_pagamento',
  status_evento             event_status not null default 'confirmado',
  observacoes_operacionais  text,
  responsavel_id            uuid references users_profile(id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

-- PAYMENT_INSTALLMENTS (parcelas) ---------------------------------------------
create table if not exists payment_installments (
  id              uuid primary key default gen_random_uuid(),
  event_id        uuid not null references events(id) on delete cascade,
  numero          integer not null,
  data_vencimento date not null,
  valor           numeric(12,2) not null default 0,
  pago            boolean not null default false,
  pago_em         timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ACTIVITY_LOGS ----------------------------------------------------------------
create table if not exists activity_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references users_profile(id) on delete set null,
  entity      text not null,
  entity_id   uuid,
  action      text not null,
  detail      text,
  created_at  timestamptz not null default now()
);

-- =============================================================================
-- ÍNDICES
-- =============================================================================
create index if not exists idx_leads_company       on leads(company_id);
create index if not exists idx_leads_status         on leads(status);
create index if not exists idx_leads_responsavel    on leads(responsavel_id);
create index if not exists idx_leads_data_evento    on leads(data_evento);
create index if not exists idx_leads_followup       on leads(data_proximo_followup);
create index if not exists idx_leads_client         on leads(client_id);

create index if not exists idx_interactions_lead    on lead_interactions(lead_id);

create index if not exists idx_followups_lead       on followups(lead_id);
create index if not exists idx_followups_venc       on followups(data_vencimento);
create index if not exists idx_followups_status     on followups(status);

create index if not exists idx_events_company       on events(company_id);
create index if not exists idx_events_data          on events(data_evento);
create index if not exists idx_events_status_pag    on events(status_pagamento);
create index if not exists idx_events_status_ev     on events(status_evento);
create index if not exists idx_events_client        on events(client_id);

create index if not exists idx_installments_event   on payment_installments(event_id);
create index if not exists idx_installments_venc    on payment_installments(data_vencimento);
create index if not exists idx_installments_pago    on payment_installments(pago);

-- =============================================================================
-- TRIGGERS de updated_at
-- =============================================================================
drop trigger if exists trg_companies_updated   on companies;
create trigger trg_companies_updated   before update on companies
  for each row execute function set_updated_at();

drop trigger if exists trg_users_updated       on users_profile;
create trigger trg_users_updated       before update on users_profile
  for each row execute function set_updated_at();

drop trigger if exists trg_clients_updated     on clients;
create trigger trg_clients_updated     before update on clients
  for each row execute function set_updated_at();

drop trigger if exists trg_leads_updated       on leads;
create trigger trg_leads_updated       before update on leads
  for each row execute function set_updated_at();

drop trigger if exists trg_followups_updated   on followups;
create trigger trg_followups_updated   before update on followups
  for each row execute function set_updated_at();

drop trigger if exists trg_events_updated      on events;
create trigger trg_events_updated      before update on events
  for each row execute function set_updated_at();

drop trigger if exists trg_installments_updated on payment_installments;
create trigger trg_installments_updated before update on payment_installments
  for each row execute function set_updated_at();

-- =============================================================================
-- TRIGGER: criar perfil automaticamente ao registrar usuário no Auth
-- =============================================================================
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.users_profile (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =============================================================================
-- ROW LEVEL SECURITY
-- Política simples: qualquer usuário autenticado pode ler/escrever tudo.
-- =============================================================================
alter table companies         enable row level security;
alter table users_profile     enable row level security;
alter table clients           enable row level security;
alter table leads             enable row level security;
alter table lead_interactions enable row level security;
alter table followups         enable row level security;
alter table events            enable row level security;
alter table activity_logs     enable row level security;
alter table payment_installments enable row level security;

-- Helper macro via DO: cria política "authenticated full access" em cada tabela
do $$
declare t text;
begin
  foreach t in array array[
    'companies','users_profile','clients','leads',
    'lead_interactions','followups','events','activity_logs',
    'payment_installments'
  ]
  loop
    execute format('drop policy if exists "auth_select_%1$s" on %1$s;', t);
    execute format('drop policy if exists "auth_insert_%1$s" on %1$s;', t);
    execute format('drop policy if exists "auth_update_%1$s" on %1$s;', t);
    execute format('drop policy if exists "auth_delete_%1$s" on %1$s;', t);

    execute format($f$create policy "auth_select_%1$s" on %1$s
      for select to authenticated using (true);$f$, t);
    execute format($f$create policy "auth_insert_%1$s" on %1$s
      for insert to authenticated with check (true);$f$, t);
    execute format($f$create policy "auth_update_%1$s" on %1$s
      for update to authenticated using (true) with check (true);$f$, t);
    execute format($f$create policy "auth_delete_%1$s" on %1$s
      for delete to authenticated using (true);$f$, t);
  end loop;
end $$;

-- =============================================================================
-- SEEDS — empresas iniciais
-- =============================================================================
insert into companies (name) values ('Sofistic Buffet')
  on conflict (name) do nothing;
insert into companies (name) values ('Gran Dose')
  on conflict (name) do nothing;

-- Fim do schema.
