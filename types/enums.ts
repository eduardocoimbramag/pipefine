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
    id: "contato",
    label: "Em contato",
    // `novo_lead` (legado) também cai aqui; o drop aplica `contato_iniciado`.
    statuses: ["contato_iniciado", "briefing_solicitado", "novo_lead"],
    tone: "info",
  },
  {
    id: "orcamento",
    label: "Orçamento",
    // Status de acompanhamento (legado) também caem aqui.
    statuses: [
      "orcamento_pendente",
      "orcamento_enviado",
      "aguardando_retorno",
      "followup_1",
      "followup_2",
      "sem_resposta",
    ],
    tone: "purple",
  },
  {
    id: "negociacao",
    label: "Negociação",
    statuses: ["negociacao"],
    tone: "purple",
  },
];

/**
 * Coluna final "Encerrado": ZONA DE AÇÃO. Ao soltar, abre um pop-up para
 * escolher o desfecho — Fechado (vira evento), Perdido (pede motivo) ou
 * Potencial (vira cliente sem evento). Leads fechados/perdidos saem do funil,
 * mas se aparecerem no board ficam nesta coluna.
 */
export const KANBAN_CLOSED_COLUMN: KanbanColumn = {
  id: "encerrado",
  label: "Encerrado",
  statuses: ["fechado", "perdido"],
  tone: "neutral",
};

/** Mapa status → id da coluna a que pertence (inclui Encerrado). */
export const STATUS_TO_COLUMN: Record<LeadStatus, string> = (() => {
  const map = {} as Record<LeadStatus, string>;
  for (const col of [...KANBAN_COLUMNS, KANBAN_CLOSED_COLUMN]) {
    for (const s of col.statuses) map[s] = col.id;
  }
  return map;
})();

/** Status padrão aplicado ao soltar um card numa coluna do funil. */
export const COLUMN_DEFAULT_STATUS: Record<string, LeadStatus> = (() => {
  const map: Record<string, LeadStatus> = {};
  for (const col of KANBAN_COLUMNS) map[col.id] = col.statuses[0];
  return map;
})();

/**
 * Status do funil para seleção (1 por coluna do Kanban), usado no formulário de
 * novo lead e no filtro de status da lista. "Encerrado" fica de fora (desfecho
 * escolhido via pop-up).
 */
export const FUNNEL_STATUSES: LeadStatus[] = KANBAN_COLUMNS.map(
  (c) => c.statuses[0],
);

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
// Pedidos de orçamento vindos dos sites (aba Orçamentos)
// ---------------------------------------------------------------------------
export const QUOTE_STATUSES = ["pendente", "enviado"] as const;
export type QuoteStatus = (typeof QUOTE_STATUSES)[number];

export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  pendente: "Pendente",
  enviado: "Enviado",
};

export const QUOTE_SEGMENTS = ["social", "corporativo"] as const;
export type QuoteSegment = (typeof QUOTE_SEGMENTS)[number];

export const QUOTE_SEGMENT_LABELS: Record<QuoteSegment, string> = {
  social: "Social",
  corporativo: "Corporativo",
};

// ---------------------------------------------------------------------------
// Tipo de cliente (leads e Banco de Clientes)
// ---------------------------------------------------------------------------
export const CLIENT_SEGMENTS = ["social", "corporativo"] as const;
export type ClientSegment = (typeof CLIENT_SEGMENTS)[number];

export const CLIENT_SEGMENT_LABELS: Record<ClientSegment, string> = {
  social: "Social",
  corporativo: "Corporativo",
};

/** Texto da coluna "Tipo de cliente": "Social" ou o nome da empresa. */
export function clientTypeLabel(c: {
  segmento?: ClientSegment | null;
  nome_empresa?: string | null;
}): string {
  if (c.segmento === "corporativo")
    return c.nome_empresa?.trim() || CLIENT_SEGMENT_LABELS.corporativo;
  return CLIENT_SEGMENT_LABELS.social;
}

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
