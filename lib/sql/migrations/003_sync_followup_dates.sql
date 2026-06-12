-- =============================================================================
-- MIGRAÇÃO 003 — Acerto único: sincroniza leads.data_proximo_followup
-- =============================================================================
-- Rode no Supabase: SQL Editor > New query > cole tudo > Run.
-- Pode rodar quantas vezes quiser (idempotente).
--
-- Contexto: leads.data_proximo_followup é um campo DERIVADO — deve refletir o
-- follow-up PENDENTE mais próximo do lead. O app agora sincroniza isso
-- automaticamente a cada mutação, mas leads antigos podem ter ficado com data
-- desatualizada. Este script recalcula o campo para TODOS os leads de uma vez.
-- =============================================================================

update leads l
set data_proximo_followup = (
  select min(f.data_vencimento)
  from followups f
  where f.lead_id = l.id
    and f.status = 'pendente'
);

-- Fim da migração 003.
