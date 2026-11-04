-- =============================================================================
-- MIGRAÇÃO 007 — Tipo de cliente (Social / Corporativo) em leads e clients
-- =============================================================================
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run.
-- Pode rodar quantas vezes quiser (idempotente).
--
-- O que adiciona (em leads e em clients):
--   - segmento     'social' | 'corporativo' (padrão 'social')
--   - nome_empresa nome da empresa do cliente, usado só quando corporativo
--
-- O lead define o tipo no cadastro; ao virar cliente (fechado ou potencial) o
-- tipo é copiado para o Banco de Clientes. "Leads perdidos" e "Banco de
-- Clientes" exibem a coluna "Tipo de cliente": "Social" ou o nome da empresa.
--
-- ATENÇÃO: o app passa a gravar essas colunas — rode esta migração antes de
-- publicar a versão nova.
-- =============================================================================

alter table leads
  add column if not exists segmento text not null default 'social',
  add column if not exists nome_empresa text;

alter table clients
  add column if not exists segmento text not null default 'social',
  add column if not exists nome_empresa text;

do $$ begin
  alter table leads
    add constraint leads_segmento_check check (segmento in ('social', 'corporativo'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table clients
    add constraint clients_segmento_check check (segmento in ('social', 'corporativo'));
exception when duplicate_object then null; end $$;

-- Fim da migração 007.
