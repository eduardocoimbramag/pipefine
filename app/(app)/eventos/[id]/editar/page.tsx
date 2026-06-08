import { notFound } from "next/navigation";
import { getEventById } from "@/lib/queries/events";
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
  const [event, companies, profiles] = await Promise.all([
    getEventById(id),
    getCompanies(),
    getProfiles(),
  ]);

  if (!event) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Editar evento" description={event.nome_cliente} />
      <Card>
        <CardContent className="pt-6">
          <EventForm companies={companies} profiles={profiles} event={event} />
        </CardContent>
      </Card>
    </div>
  );
}
