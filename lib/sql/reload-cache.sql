-- =============================================================================
-- Força o PostgREST a recarregar o "schema cache".
-- Use isto sempre que a API REST do Supabase responder:
--   "Could not find the table 'public.xxx' in the schema cache" (PGRST205)
-- mesmo que a tabela exista no banco.
--
-- Como usar: SQL Editor > New query > cole e Run.
-- =============================================================================
notify pgrst, 'reload schema';
