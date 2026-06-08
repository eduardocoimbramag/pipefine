import { cookies } from "next/headers";
import { getCompanies } from "@/lib/queries/shared";
import {
  ACTIVE_COMPANY_COOKIE,
  ALL_COMPANIES,
} from "@/lib/active-company-shared";
import type { Company } from "@/types";

export { ACTIVE_COMPANY_COOKIE, ALL_COMPANIES };

export interface ActiveCompanyContext {
  /** Lista de empresas ativas (para o seletor). */
  companies: Company[];
  /** ID da empresa ativa, ou null quando "Todas as empresas". */
  activeCompanyId: string | null;
  /** Objeto da empresa ativa, ou null quando "Todas". */
  activeCompany: Company | null;
}

/**
 * Resolve a empresa ativa a partir do cookie, validando contra as empresas
 * existentes. Se o cookie apontar para uma empresa inexistente/inativa, cai
 * para "Todas as empresas".
 */
export async function getActiveCompanyContext(): Promise<ActiveCompanyContext> {
  const [companies, cookieStore] = await Promise.all([
    getCompanies(),
    cookies(),
  ]);

  const activeOnly = companies.filter((c) => c.active);
  const raw = cookieStore.get(ACTIVE_COMPANY_COOKIE)?.value ?? ALL_COMPANIES;

  const match =
    raw !== ALL_COMPANIES
      ? activeOnly.find((c) => c.id === raw) ?? null
      : null;

  return {
    companies: activeOnly,
    activeCompanyId: match?.id ?? null,
    activeCompany: match,
  };
}

/** Apenas o ID da empresa ativa (ou undefined para "Todas"), para filtrar queries. */
export async function getActiveCompanyId(): Promise<string | undefined> {
  const { activeCompanyId } = await getActiveCompanyContext();
  return activeCompanyId ?? undefined;
}
