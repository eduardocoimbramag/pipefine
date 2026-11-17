# Colar no Supabase

Supabase → **SQL Editor** → **New query** → cole todo o bloco abaixo → **Run**.

No final aparece uma tabela com 3 linhas (`origem`, `data_evento`, `ref_externa`). Se aparecer, está pronto.

```sql
-- =============================================================================
-- MIGRAÇÃO 008 — Pedidos do casamentos.com (agentes de e-mail)
-- =============================================================================
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run.
-- Pode rodar quantas vezes quiser (idempotente). Requer a migração 006.
--
-- O que adiciona:
--   - colunas em quote_requests: origem, data_evento, ref_externa
--   - índice único (company_id, ref_externa): o mesmo e-mail não vira 2 comandas
--   - função submit_casamentos_request(...), usada pelos agentes de e-mail
--
-- A função submit_quote_request (formulário dos sites) NÃO é alterada.
-- Ver docs/estacaodograo.md e docs/sofistic.md.
-- =============================================================================

-- COLUNAS ----------------------------------------------------------------------
-- origem: 'site' (formulário) ou 'casamentos.com'. As linhas antigas viram 'site'.
alter table quote_requests
  add column if not exists origem      text not null default 'site',
  add column if not exists data_evento date,
  add column if not exists ref_externa text;

-- Única por empresa. Pedidos do site têm ref_externa null e não conflitam.
create unique index if not exists uq_quotes_company_ref
  on quote_requests(company_id, ref_externa);

create index if not exists idx_quotes_company_origem_created
  on quote_requests(company_id, origem, created_at);

-- =============================================================================
-- FUNÇÃO PÚBLICA: submit_casamentos_request
-- Chamada pelos agentes via POST /rest/v1/rpc/submit_casamentos_request,
-- com a mesma chave publishable dos sites.
-- Retorna {"comanda": <número>, "duplicado": true|false}.
-- =============================================================================
create or replace function submit_casamentos_request(
  p_company_id   uuid,
  p_nome         text,
  p_ref_externa  text,
  p_telefone     text default null,
  p_email        text default null,
  p_quantitativo text default null,
  p_data_evento  date default null,
  p_descricao    text default null
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_nome         text := nullif(btrim(p_nome), '');
  v_ref          text := nullif(btrim(p_ref_externa), '');
  v_telefone     text := nullif(btrim(p_telefone), '');
  v_email        text := lower(nullif(btrim(p_email), ''));
  v_quantitativo text := nullif(btrim(p_quantitativo), '');
  v_descricao    text := nullif(btrim(p_descricao), '');
  v_numero       bigint;
begin
  if not exists (select 1 from companies where id = p_company_id and active) then
    raise exception 'Empresa inválida.' using errcode = '22023';
  end if;

  if v_nome is null then
    raise exception 'Informe o nome.' using errcode = '22023';
  end if;

  if v_ref is null then
    raise exception 'Informe a referência externa (p_ref_externa).' using errcode = '22023';
  end if;

  if v_email is not null and v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;

  if length(v_nome) > 150
     or length(v_ref) > 300
     or length(coalesce(v_telefone, '')) > 40
     or length(coalesce(v_email, '')) > 200
     or length(coalesce(v_quantitativo, '')) > 60
     or length(coalesce(v_descricao, '')) > 5000 then
    raise exception 'Algum campo passou do tamanho máximo.' using errcode = '22023';
  end if;

  -- Já registrado? Devolve a comanda existente (antes do limite, para que
  -- reenvios nunca falhem por causa dele).
  select numero into v_numero
  from quote_requests
  where company_id = p_company_id and ref_externa = v_ref;

  if v_numero is not null then
    return json_build_object('comanda', v_numero, 'duplicado', true);
  end if;

  -- Limite por empresa: no máximo 200 pedidos do casamentos.com por hora.
  if (
    select count(*) from quote_requests q
    where q.company_id = p_company_id
      and q.origem = 'casamentos.com'
      and q.created_at > now() - interval '1 hour'
  ) >= 200 then
    raise exception 'Muitos pedidos em pouco tempo. Tente novamente mais tarde.' using errcode = '22023';
  end if;

  insert into quote_requests (
    company_id, nome, telefone, email, quantitativo, segmento, tipo_evento,
    descricao, consentimento, origem, data_evento, ref_externa
  ) values (
    p_company_id, v_nome, v_telefone, v_email, v_quantitativo, 'social', 'Casamento',
    v_descricao, false, 'casamentos.com', p_data_evento, v_ref
  )
  on conflict (company_id, ref_externa) do nothing
  returning numero into v_numero;

  -- Corrida: outra chamada com a mesma ref gravou entre o select e o insert.
  if v_numero is null then
    select numero into v_numero
    from quote_requests
    where company_id = p_company_id and ref_externa = v_ref;
    return json_build_object('comanda', v_numero, 'duplicado', true);
  end if;

  return json_build_object('comanda', v_numero, 'duplicado', false);
end;
$$;

revoke all on function submit_casamentos_request(uuid, text, text, text, text, text, date, text)
  from public, anon, authenticated;
grant execute on function submit_casamentos_request(uuid, text, text, text, text, text, date, text)
  to anon, authenticated;

-- Recarrega o cache do PostgREST para a API enxergar as colunas e a função.
notify pgrst, 'reload schema';

-- Fim da migração 008.

-- Conferência: deve listar origem, data_evento e ref_externa.
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'quote_requests'
  and column_name in ('origem', 'data_evento', 'ref_externa');
```
