import { UserX } from "lucide-react";
import { getLostLeads } from "@/lib/queries/leads";
import { getActiveCompanyContext } from "@/lib/active-company";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { LostLeadsTable } from "./lost-leads-table";

export const metadata = { title: "Leads perdidos — Pipefine" };
export const dynamic = "force-dynamic";

export default async function LeadsPerdidosPage() {
  const { activeCompanyId, activeCompany } = await getActiveCompanyContext();
  const leads = await getLostLeads({
    companyId: activeCompanyId ?? undefined,
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Leads perdidos"
        description={`${activeCompany ? activeCompany.name + " · " : ""}${leads.length} lead(s) perdido(s)`}
      />

      {leads.length === 0 ? (
        <EmptyState
          icon={UserX}
          title="Nenhum lead perdido"
          description="Leads que você arrastar para 'Perdido' no Kanban aparecem aqui."
        />
      ) : (
        <LostLeadsTable leads={leads} />
      )}
    </div>
  );
}
