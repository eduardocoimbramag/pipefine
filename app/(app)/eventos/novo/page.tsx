import { getCompanies, getProfiles } from "@/lib/queries/shared";
import { getActiveCompanyId } from "@/lib/active-company";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EventForm } from "../event-form";

export const metadata = { title: "Novo evento — Pipefine" };

export default async function NovoEventoPage() {
  const [companies, profiles, activeCompanyId] = await Promise.all([
    getCompanies(),
    getProfiles(),
    getActiveCompanyId(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Novo evento"
        description="Cadastre um evento fechado manualmente."
      />
      <Card>
        <CardContent className="pt-6">
          <EventForm
            companies={companies}
            profiles={profiles}
            defaultCompanyId={activeCompanyId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
