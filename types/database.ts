/**
 * Tipos do banco de dados (espelham lib/sql/schema.sql).
 *
 * Mantidos à mão para não depender de geração paga/externa.
 * Se você gerar via `supabase gen types typescript`, pode substituir este arquivo.
 */
import type {
  LeadStatus,
  LeadOrigin,
  FollowupStatus,
  EventStatus,
  PaymentStatus,
  UserRole,
} from "./enums";

type Timestamps = {
  created_at: string;
  updated_at: string;
};

// ---------------------------------------------------------------------------
// Linhas das tabelas
// ---------------------------------------------------------------------------
export type CompanyRow = Timestamps & {
  id: string;
  name: string;
  active: boolean;
};

export type UserProfileRow = Timestamps & {
  id: string; // = auth.users.id
  full_name: string | null;
  email: string | null;
  role: UserRole;
  active: boolean;
};

export type ClientRow = Timestamps & {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  notes: string | null;
};

export type LeadRow = Timestamps & {
  id: string;
  company_id: string;
  client_id: string | null;
  nome_cliente: string;
  telefone: string | null;
  email: string | null;
  instagram: string | null;
  origem_lead: LeadOrigin | null;
  tipo_evento: string | null;
  data_evento: string | null;
  local_evento: string | null;
  quantidade_pessoas: number | null;
  valor_estimado: number | null;
  status: LeadStatus;
  responsavel_id: string | null;
  data_primeiro_contato: string | null;
  data_orcamento_enviado: string | null;
  data_proximo_followup: string | null;
  observacoes: string | null;
  motivo_perda: string | null;
};

export type LeadInteractionRow = {
  id: string;
  lead_id: string;
  user_id: string | null;
  tipo: string;
  descricao: string;
  created_at: string;
};

export type FollowupRow = Timestamps & {
  id: string;
  lead_id: string;
  titulo: string;
  descricao: string | null;
  data_vencimento: string;
  status: FollowupStatus;
  responsavel_id: string | null;
  concluido_em: string | null;
};

export type EventRow = Timestamps & {
  id: string;
  company_id: string;
  lead_id: string | null;
  client_id: string | null;
  nome_cliente: string;
  tipo_evento: string | null;
  data_evento: string;
  horario_inicio: string | null;
  horario_fim: string | null;
  local_evento: string | null;
  quantidade_pessoas: number | null;
  servicos_contratados: string | null;
  valor_total: number;
  valor_entrada: number;
  valor_restante: number;
  forma_pagamento: string | null;
  status_pagamento: PaymentStatus;
  status_evento: EventStatus;
  observacoes_operacionais: string | null;
  responsavel_id: string | null;
};

export type ActivityLogRow = {
  id: string;
  user_id: string | null;
  entity: string;
  entity_id: string | null;
  action: string;
  detail: string | null;
  created_at: string;
};

// ---------------------------------------------------------------------------
// Helper para Insert/Update (campos auto-gerados ficam opcionais)
// ---------------------------------------------------------------------------
type AutoFields = "id" | "created_at" | "updated_at";

/** Chaves cujo valor aceita null (são opcionais no insert, pois têm default ou aceitam null). */
type NullableKeys<T> = {
  [K in keyof T]: null extends T[K] ? K : never;
}[keyof T];

/**
 * Tipo de Insert: campos auto-gerados, os listados em `Extra` (têm default no DB)
 * e todos os campos nullable ficam opcionais. Os demais permanecem obrigatórios.
 */
type Insert<T, Extra extends keyof T = never> = Omit<
  T,
  AutoFields | Extra | NullableKeys<T>
> &
  Partial<Pick<T, (AutoFields | Extra | NullableKeys<T>) & keyof T>>;

type Update<T> = Partial<Omit<T, "id" | "created_at">>;

interface TableDef<Row, Ins, Upd> {
  Row: Row;
  Insert: Ins;
  Update: Upd;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      companies: TableDef<
        CompanyRow,
        Insert<CompanyRow, "active">,
        Update<CompanyRow>
      >;
      users_profile: TableDef<
        UserProfileRow,
        Insert<UserProfileRow, "active" | "role">,
        Update<UserProfileRow>
      >;
      clients: TableDef<ClientRow, Insert<ClientRow>, Update<ClientRow>>;
      leads: TableDef<
        LeadRow,
        Insert<LeadRow, "status">,
        Update<LeadRow>
      >;
      lead_interactions: TableDef<
        LeadInteractionRow,
        Omit<LeadInteractionRow, "id" | "created_at"> &
          Partial<Pick<LeadInteractionRow, "id" | "created_at">>,
        Partial<Omit<LeadInteractionRow, "id" | "created_at">>
      >;
      followups: TableDef<
        FollowupRow,
        Insert<FollowupRow, "status">,
        Update<FollowupRow>
      >;
      events: TableDef<
        EventRow,
        Insert<EventRow, "status_pagamento" | "status_evento">,
        Update<EventRow>
      >;
      activity_logs: TableDef<
        ActivityLogRow,
        Omit<ActivityLogRow, "id" | "created_at"> &
          Partial<Pick<ActivityLogRow, "id" | "created_at">>,
        Partial<Omit<ActivityLogRow, "id" | "created_at">>
      >;
    };
    Views: Record<
      string,
      { Row: Record<string, unknown>; Relationships: [] }
    >;
    Functions: Record<
      string,
      { Args: Record<string, unknown>; Returns: unknown }
    >;
    Enums: Record<string, string>;
  };
}
