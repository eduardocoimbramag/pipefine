-- =============================================================================
-- MIGRAÇÃO 004 — Coluna leads.relinked ("Cliente antigo?")
-- =============================================================================
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run.
-- Pode rodar quantas vezes quiser (idempotente).
--
-- Contexto: ao criar um lead a partir de um cliente já cadastrado
-- ("Cliente antigo?"), o lead é vinculado via client_id e marcado como
-- relinked = true. Esse marcador é IMUTÁVEL e independente de client_id
-- (que volta a NULL se o cliente for excluído do Banco de Clientes).
--
-- Isso garante que um lead re-vinculado NUNCA apareça em "Leads Perdidos",
-- mesmo que seja arrastado para "Perdido" no Kanban e o cliente seja
-- removido depois.
--
-- O app funciona mesmo SEM esta migração (degrada para o filtro por client_id);
-- aplicá-la torna o comportamento robusto a exclusões de cliente.
-- =============================================================================

alter table leads
  add column if not exists relinked boolean not null default false;

-- Backfill: leads que já têm client_id preenchido provavelmente vieram de um
-- cliente existente — marca como re-vinculados para manter o histórico coerente.
update leads
set relinked = true
where client_id is not null
  and relinked = false;

-- Fim da migração 004.
