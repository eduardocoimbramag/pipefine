import { notFound } from "next/navigation";
import { getLeadById } from "@/lib/queries/leads";
import { getCompanies } from "@/lib/queries/shared";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { LeadForm } from "../../lead-form";

export const metadata = { title: "Editar lead — Pipefine" };

export default async function EditarLeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [lead, companies] = await Promise.all([
    getLeadById(id),
    getCompanies(),
  ]);

  if (!lead) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Editar lead" description={lead.nome_cliente} />
      <Card>
        <CardContent className="pt-6">
          <LeadForm companies={companies} lead={lead} />
        </CardContent>
      </Card>
    </div>
  );
}
