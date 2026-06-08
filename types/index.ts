import type {
  CompanyRow,
  UserProfileRow,
  ClientRow,
  LeadRow,
  LeadInteractionRow,
  FollowupRow,
  EventRow,
  Database,
} from "./database";

export * from "./enums";
export type { Database } from "./database";

// Tipos de leitura (linhas)
export type Company = CompanyRow;
export type UserProfile = UserProfileRow;
export type Client = ClientRow;
export type Lead = LeadRow;
export type LeadInteraction = LeadInteractionRow;
export type Followup = FollowupRow;
export type EventItem = EventRow;

// Tipos de Insert/Update (atalhos)
type Tables = Database["public"]["Tables"];
export type LeadInsert = Tables["leads"]["Insert"];
export type LeadUpdate = Tables["leads"]["Update"];
export type ClientInsert = Tables["clients"]["Insert"];
export type ClientUpdate = Tables["clients"]["Update"];
export type FollowupInsert = Tables["followups"]["Insert"];
export type FollowupUpdate = Tables["followups"]["Update"];
export type EventInsert = Tables["events"]["Insert"];
export type EventUpdate = Tables["events"]["Update"];
export type CompanyInsert = Tables["companies"]["Insert"];

// Tipos compostos (joins comuns)
export type LeadWithRelations = Lead & {
  company: Pick<Company, "id" | "name"> | null;
  responsavel: Pick<UserProfile, "id" | "full_name"> | null;
};

export type FollowupWithLead = Followup & {
  lead: Pick<Lead, "id" | "nome_cliente" | "company_id"> | null;
  responsavel: Pick<UserProfile, "id" | "full_name"> | null;
};

export type EventWithRelations = EventItem & {
  company: Pick<Company, "id" | "name"> | null;
};

// Resultado padrão de Server Actions
export type ActionResult<T = void> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: string };
