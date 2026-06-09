/**
 * Enums e constantes de domínio do Pipefine.
 * Mantém os valores em sincronia com o schema SQL (lib/sql/schema.sql).
 */

// ---------------------------------------------------------------------------
// Leads
// ---------------------------------------------------------------------------
export const LEAD_STATUSES = [
  "novo_lead",
  "contato_iniciado",
  "briefing_solicitado",
  "orcamento_pendente",
  "orcamento_enviado",
  "aguardando_retorno",
  "followup_1",
  "followup_2",
  "negociacao",
  "fechado",
  "perdido",
  "sem_resposta",
] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  novo_lead: "Novo lead",
  contato_iniciado: "Contato iniciado",
  briefing_solicitado: "Briefing solicitado",
  orcamento_pendente: "Orçamento pendente",
  orcamento_enviado: "Orçamento enviado",
  aguardando_retorno: "Aguardando retorno",
  followup_1: "Follow-up 1",
  followup_2: "Follow-up 2",
  negociacao: "Negociação",
  fechado: "Fechado",
  perdido: "Perdido",
  sem_resposta: "Sem resposta",
};

/** Variante visual de badge por status (mapeada no componente StatusBadge). */
export const LEAD_STATUS_TONE: Record<LeadStatus, BadgeTone> = {
  novo_lead: "info",
  contato_iniciado: "info",
  briefing_solicitado: "neutral",
  orcamento_pendente: "warning",
  orcamento_enviado: "purple",
  aguardando_retorno: "warning",
  followup_1: "warning",
  followup_2: "warning",
  negociacao: "purple",
  fechado: "success",
  perdido: "destructive",
  sem_resposta: "destructive",
};

// ---------------------------------------------------------------------------
// Kanban — agrupamento dos 12 status em colunas de pipeline
// ---------------------------------------------------------------------------
export interface KanbanColumn {
  id: string;
  label: string;
  /** Status que pertencem a esta coluna. O primeiro é o status aplicado ao soltar. */
  statuses: LeadStatus[];
  tone: BadgeTone;
}

export const KANBAN_COLUMNS: KanbanColumn[] = [
  {
    id: "novos",
    label: "Novos",
    statuses: ["novo_lead"],
    tone: "info",
  },
  {
    id: "contato",
    label: "Em contato",
    statuses: ["contato_iniciado", "briefing_solicitado"],
    tone: "info",
  },
  {
    id: "orcamento",
    label: "Orçamento",
    statuses: ["orcamento_pendente", "orcamento_enviado"],
    tone: "purple",
  },
  {
    id: "followup",
    label: "Acompanhamento",
    statuses: ["aguardando_retorno", "followup_1", "followup_2", "sem_resposta"],
    tone: "warning",
  },
  {
    id: "negociacao",
    label: "Negociação",
    statuses: ["negociacao"],
    tone: "purple",
  },
  {
    id: "fechado",
    label: "Fechado",
    statuses: ["fechado"],
    tone: "success",
  },
];

/** Coluna especial de descarte (renderizada como zona de soltar à parte). */
export const KANBAN_LOST_COLUMN: KanbanColumn = {
  id: "perdido",
  label: "Perdido",
  statuses: ["perdido"],
  tone: "destructive",
};

/** Mapa status → id da coluna a que pertence (inclui Perdido). */
export const STATUS_TO_COLUMN: Record<LeadStatus, string> = (() => {
  const map = {} as Record<LeadStatus, string>;
  for (const col of [...KANBAN_COLUMNS, KANBAN_LOST_COLUMN]) {
    for (const s of col.statuses) map[s] = col.id;
  }
  return map;
})();

/** Status padrão aplicado ao soltar um card numa coluna. */
export const COLUMN_DEFAULT_STATUS: Record<string, LeadStatus> = (() => {
  const map: Record<string, LeadStatus> = {};
  for (const col of [...KANBAN_COLUMNS, KANBAN_LOST_COLUMN]) {
    map[col.id] = col.statuses[0];
  }
  return map;
})();

/**
 * Status do funil para seleção (1 por coluna do Kanban), usado no formulário de
 * novo lead e no filtro de status da lista. Exclui "Fechado" (vira evento via
 * pop-up) e "Perdido" (tem aba própria).
 */
export const FUNNEL_STATUSES: LeadStatus[] = KANBAN_COLUMNS.filter(
  (c) => c.id !== "fechado",
).map((c) => c.statuses[0]);

export const LEAD_ORIGINS = [
  "instagram",
  "indicacao",
  "google",
  "site",
  "whatsapp",
  "facebook",
  "evento",
  "outro",
] as const;
export type LeadOrigin = (typeof LEAD_ORIGINS)[number];

export const LEAD_ORIGIN_LABELS: Record<LeadOrigin, string> = {
  instagram: "Instagram",
  indicacao: "Indicação",
  google: "Google",
  site: "Site",
  whatsapp: "WhatsApp",
  facebook: "Facebook",
  evento: "Evento",
  outro: "Outro",
};

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------
export const FOLLOWUP_STATUSES = [
  "pendente",
  "concluido",
  "cancelado",
] as const;
export type FollowupStatus = (typeof FOLLOWUP_STATUSES)[number];

export const FOLLOWUP_STATUS_LABELS: Record<FollowupStatus, string> = {
  pendente: "Pendente",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

// ---------------------------------------------------------------------------
// Eventos
// ---------------------------------------------------------------------------
export const EVENT_STATUSES = [
  "confirmado",
  "em_producao",
  "finalizado",
  "cancelado",
] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  confirmado: "Confirmado",
  em_producao: "Em produção",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export const EVENT_STATUS_TONE: Record<EventStatus, BadgeTone> = {
  confirmado: "info",
  em_producao: "purple",
  finalizado: "success",
  cancelado: "destructive",
};

export const PAYMENT_STATUSES = [
  "aguardando_pagamento",
  "entrada_paga",
  "pago_integralmente",
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  aguardando_pagamento: "Aguardando pagamento",
  entrada_paga: "Entrada paga",
  pago_integralmente: "Pago integralmente",
};

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, BadgeTone> = {
  aguardando_pagamento: "warning",
  entrada_paga: "info",
  pago_integralmente: "success",
};

// ---------------------------------------------------------------------------
// Formas de pagamento (3 modelos)
// ---------------------------------------------------------------------------
export const PAYMENT_METHODS = [
  "total",
  "entrada_50_50",
  "parcelado",
] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  total: "Pagamento total",
  entrada_50_50: "50% reserva + 50% antes do evento",
  parcelado: "Parcelado até o evento",
};

export const PAYMENT_METHOD_DESCRIPTIONS: Record<PaymentMethod, string> = {
  total: "Valor integral em uma única parcela.",
  entrada_50_50:
    "50% no ato do contrato (reserva da data) e 50% até 5 dias antes do evento.",
  parcelado:
    "1ª parcela em uma data escolhida e o restante na mesma data dos meses seguintes, até o evento.",
};

// ---------------------------------------------------------------------------
// Perfis de usuário
// ---------------------------------------------------------------------------
export const USER_ROLES = [
  "admin",
  "comercial",
  "operacional",
  "financeiro",
] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  comercial: "Comercial",
  operacional: "Operacional",
  financeiro: "Financeiro",
};

// ---------------------------------------------------------------------------
// Tipos de evento (sugestões comuns; campo é texto livre)
// ---------------------------------------------------------------------------
export const EVENT_TYPES = [
  "Casamento",
  "Aniversário",
  "Corporativo",
  "Formatura",
  "Confraternização",
  "Batizado",
  "Outro",
] as const;

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------
export type BadgeTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "destructive"
  | "purple";
