import { getCompanies } from "@/lib/queries/shared";
import { getClients } from "@/lib/queries/clients";
import { getActiveCompanyId } from "@/lib/active-company";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { LeadForm } from "../lead-form";

export const metadata = { title: "Novo lead — Pipefine" };
export const dynamic = "force-dynamic";

export default async function NovoLeadPage() {
  const [companies, activeCompanyId, allClients] = await Promise.all([
    getCompanies(),
    getActiveCompanyId(),
    // Lista completa de clientes (todas as empresas) para a opção "Cliente antigo?".
    getClients(),
  ]);

  const clients = allClients.map((c) => ({
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Novo lead"
        description="Cadastre um novo contato no funil."
      />
      <Card>
        <CardContent className="pt-6">
          <LeadForm
            companies={companies}
            defaultCompanyId={activeCompanyId}
            clients={clients}
          />
        </CardContent>
      </Card>
    </div>
  );
}
