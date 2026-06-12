import { Contact } from "lucide-react";
import { getClients } from "@/lib/queries/clients";
import { getActiveCompanyContext } from "@/lib/active-company";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { ClientDialog } from "./client-dialog";
import { ClientSearch } from "./client-search";
import { ClientsTable } from "./clients-table";

export const metadata = { title: "Banco de Clientes — Pipefine" };
export const dynamic = "force-dynamic";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const sp = await searchParams;
  const { activeCompanyId, activeCompany } = await getActiveCompanyContext();
  const clients = await getClients(activeCompanyId ?? undefined, sp.q);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Banco de Clientes"
        description={`${activeCompany ? activeCompany.name + " · " : ""}${clients.length} cliente(s)`}
      />

      <ClientSearch />

      {clients.length === 0 ? (
        <EmptyState
          icon={Contact}
          title="Nenhum cliente"
          description="Clientes são criados automaticamente ao fechar um lead em evento, ou manualmente aqui."
        >
          <ClientDialog />
        </EmptyState>
      ) : (
        <ClientsTable clients={clients} />
      )}
    </div>
  );
}
