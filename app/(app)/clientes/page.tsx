import Link from "next/link";
import { Contact } from "lucide-react";
import { getClients } from "@/lib/queries/clients";
import { getActiveCompanyContext } from "@/lib/active-company";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ClientDialog } from "./client-dialog";
import { ClientSearch } from "./client-search";

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
      >
        <ClientDialog />
      </PageHeader>

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
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">Telefone</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Tipo de evento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>
                    <Link
                      href={`/clientes/${c.id}`}
                      className="font-medium hover:underline"
                    >
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {c.phone ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.empresas.length > 0 ? (
                      c.empresas.join(" / ")
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.tiposEvento.length > 0 ? (
                      c.tiposEvento.join(" / ")
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
