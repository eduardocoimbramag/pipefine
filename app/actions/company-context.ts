"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  ACTIVE_COMPANY_COOKIE,
  ALL_COMPANIES,
} from "@/lib/active-company-shared";

/**
 * Define a empresa ativa (persistida em cookie) e revalida o app inteiro
 * para que todas as páginas re-renderizem filtradas pela nova empresa.
 */
export async function setActiveCompany(companyId: string): Promise<void> {
  const value = companyId === ALL_COMPANIES ? ALL_COMPANIES : companyId;

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_COMPANY_COOKIE, value, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 ano
  });

  // Revalida todo o layout autenticado para refletir o novo filtro.
  revalidatePath("/", "layout");
}
