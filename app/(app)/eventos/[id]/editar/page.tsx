import { notFound } from "next/navigation";
import { getEventById, getEventInstallments } from "@/lib/queries/events";
import { getCompanies, getProfiles } from "@/lib/queries/shared";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EventForm } from "../../event-form";

export const metadata = { title: "Editar evento — Pipefine" };

export default async function EditarEventoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [event, companies, profiles, installments] = await Promise.all([
    getEventById(id),
    getCompanies(),
    getProfiles(),
    getEventInstallments(id),
  ]);

  if (!event) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Editar evento" description={event.nome_cliente} />
      <Card>
        <CardContent className="pt-6">
          <EventForm
            companies={companies}
            profiles={profiles}
            event={event}
            initialInstallments={installments.map((i) => ({
              numero: i.numero,
              data_vencimento: i.data_vencimento,
              valor: Number(i.valor),
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
