import { getCompanies } from "@/lib/queries/shared";
import { getActiveCompanyId } from "@/lib/active-company";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { LeadForm } from "../lead-form";

export const metadata = { title: "Novo lead — Pipefine" };

export default async function NovoLeadPage() {
  const [companies, activeCompanyId] = await Promise.all([
    getCompanies(),
    getActiveCompanyId(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Novo lead"
        description="Cadastre um novo contato no funil."
      />
      <Card>
        <CardContent className="pt-6">
          <LeadForm companies={companies} defaultCompanyId={activeCompanyId} />
        </CardContent>
      </Card>
    </div>
  );
}
