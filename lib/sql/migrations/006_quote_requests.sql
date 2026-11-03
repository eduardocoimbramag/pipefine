-- =============================================================================
-- MIGRAÇÃO 006 — Pedidos de orçamento vindos dos sites (quote_requests)
-- =============================================================================
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run.
-- Pode rodar quantas vezes quiser (idempotente).
--
-- O que adiciona:
--   - enum quote_status ('pendente' | 'enviado')
--   - tabela quote_requests (as "comandas" da aba Orçamentos)
--   - função submit_quote_request(...), a ÚNICA porta de entrada dos sites
--
-- Segurança: os sites usam a chave PÚBLICA (publishable/anon). Essa chave NÃO
-- tem acesso à tabela (RLS sem política para anon); ela só pode executar a
-- função submit_quote_request, que valida os campos e grava o pedido. Assim um
-- visitante consegue enviar um orçamento, mas nunca ler, editar ou apagar os
-- pedidos de ninguém. Ver docs/integracaosites.md.
-- =============================================================================

-- ENUM -------------------------------------------------------------------------
do $$ begin
  create type quote_status as enum ('pendente', 'enviado');
exception when duplicate_object then null; end $$;

-- FUNÇÃO de updated_at (cria se não existir, para a migração ser autossuficiente)
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- TABELA -----------------------------------------------------------------------
create table if not exists quote_requests (
  id             uuid primary key default gen_random_uuid(),
  -- Número sequencial da comanda (exibido como "Nº 0042").
  numero         bigint generated always as identity,
  -- Empresa dona do site que recebeu o pedido.
  company_id     uuid not null references companies(id) on delete restrict,
  nome           text not null,
  telefone       text,
  email          text,
  -- Texto livre: o site pode mandar "150", "150 pessoas", "100 a 150"...
  quantitativo   text,
  segmento       text not null check (segmento in ('social', 'corporativo')),
  -- Preenchido só quando segmento = 'corporativo'.
  nome_empresa   text,
  -- Casamento, feira, congresso, aniversário... (texto livre)
  tipo_evento    text,
  descricao      text,
  consentimento  boolean not null default false,
  status         quote_status not null default 'pendente',
  enviado_em     timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_quotes_status_created on quote_requests(status, created_at);
create index if not exists idx_quotes_company        on quote_requests(company_id);
create index if not exists idx_quotes_email          on quote_requests(email, created_at);
create index if not exists idx_quotes_telefone       on quote_requests(telefone, created_at);

drop trigger if exists trg_quotes_updated on quote_requests;
create trigger trg_quotes_updated before update on quote_requests
  for each row execute function set_updated_at();

-- RLS: usuários logados do CRM leem/editam tudo; anon não tem política (nada).
alter table quote_requests enable row level security;

drop policy if exists "auth_select_quote_requests" on quote_requests;
drop policy if exists "auth_insert_quote_requests" on quote_requests;
drop policy if exists "auth_update_quote_requests" on quote_requests;
drop policy if exists "auth_delete_quote_requests" on quote_requests;

create policy "auth_select_quote_requests" on quote_requests
  for select to authenticated using (true);
create policy "auth_insert_quote_requests" on quote_requests
  for insert to authenticated with check (true);
create policy "auth_update_quote_requests" on quote_requests
  for update to authenticated using (true) with check (true);
create policy "auth_delete_quote_requests" on quote_requests
  for delete to authenticated using (true);

-- Projetos novos do Supabase podem não liberar tabelas novas na API sozinhos.
grant select, insert, update, delete on quote_requests to authenticated;

-- =============================================================================
-- FUNÇÃO PÚBLICA: submit_quote_request
-- Chamada pelos sites via POST /rest/v1/rpc/submit_quote_request.
-- Valida tudo no banco (o site pode ser burlado) e devolve o número da comanda.
-- =============================================================================
create or replace function submit_quote_request(
  p_company_id    uuid,
  p_nome          text,
  p_telefone      text    default null,
  p_email         text    default null,
  p_quantitativo  text    default null,
  p_segmento      text    default 'social',
  p_nome_empresa  text    default null,
  p_tipo_evento   text    default null,
  p_descricao     text    default null,
  p_consentimento boolean default false
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome         text := nullif(btrim(p_nome), '');
  v_telefone     text := nullif(btrim(p_telefone), '');
  v_email        text := lower(nullif(btrim(p_email), ''));
  v_quantitativo text := nullif(btrim(p_quantitativo), '');
  v_segmento     text := lower(coalesce(nullif(btrim(p_segmento), ''), 'social'));
  v_nome_empresa text := nullif(btrim(p_nome_empresa), '');
  v_tipo_evento  text := nullif(btrim(p_tipo_evento), '');
  v_descricao    text := nullif(btrim(p_descricao), '');
  v_numero       bigint;
begin
  if not exists (select 1 from companies where id = p_company_id and active) then
    raise exception 'Empresa inválida.' using errcode = '22023';
  end if;

  if v_nome is null then
    raise exception 'Informe o nome.' using errcode = '22023';
  end if;

  if v_telefone is null and v_email is null then
    raise exception 'Informe um telefone ou e-mail para contato.' using errcode = '22023';
  end if;

  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;

  if v_segmento not in ('social', 'corporativo') then
    raise exception 'Segmento inválido (use social ou corporativo).' using errcode = '22023';
  end if;

  if not coalesce(p_consentimento, false) then
    raise exception 'É preciso autorizar o contato.' using errcode = '22023';
  end if;

  if length(v_nome) > 150
     or length(coalesce(v_telefone, '')) > 40
     or length(coalesce(v_email, '')) > 200
     or length(coalesce(v_quantitativo, '')) > 60
     or length(coalesce(v_nome_empresa, '')) > 200
     or length(coalesce(v_tipo_evento, '')) > 100
     or length(coalesce(v_descricao, '')) > 5000 then
    raise exception 'Algum campo passou do tamanho máximo.' using errcode = '22023';
  end if;

  -- Anti-flood: no máximo 3 pedidos do mesmo telefone/e-mail em 10 minutos.
  if (
    select count(*) from quote_requests q
    where q.created_at > now() - interval '10 minutes'
      and ((v_email is not null and q.email = v_email)
        or (v_telefone is not null and q.telefone = v_telefone))
  ) >= 3 then
    raise exception 'Muitos pedidos em pouco tempo. Tente novamente mais tarde.' using errcode = '22023';
  end if;

  insert into quote_requests (
    company_id, nome, telefone, email, quantitativo, segmento,
    nome_empresa, tipo_evento, descricao, consentimento
  ) values (
    p_company_id, v_nome, v_telefone, v_email, v_quantitativo, v_segmento,
    case when v_segmento = 'corporativo' then v_nome_empresa end,
    v_tipo_evento, v_descricao, true
  )
  returning numero into v_numero;

  return v_numero;
end;
$$;

-- Só a função fica exposta para anon (e para usuários logados, para testes).
revoke all on function submit_quote_request(uuid, text, text, text, text, text, text, text, text, boolean)
  from public, anon, authenticated;
grant execute on function submit_quote_request(uuid, text, text, text, text, text, text, text, text, boolean)
  to anon, authenticated;

-- Recarrega o cache do PostgREST para a API enxergar a tabela e a função.
notify pgrst, 'reload schema';

-- Fim da migração 006.
