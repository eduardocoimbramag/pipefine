import Link from "next/link";
import { UserX } from "lucide-react";
import { getLostLeads } from "@/lib/queries/leads";
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
import { formatDate } from "@/lib/date";

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
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Empresa</TableHead>
                <TableHead>Motivo da perda</TableHead>
                <TableHead className="hidden lg:table-cell">Evento</TableHead>
                <TableHead className="hidden sm:table-cell">Perdido em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <Link href={`/leads/${lead.id}`} className="block">
                      <span className="font-medium">{lead.nome_cliente}</span>
                      <span className="block text-xs text-muted-foreground">
                        {lead.telefone ?? lead.instagram ?? lead.email ?? "—"}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {lead.company?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {lead.motivo_perda ? (
                      <span>{lead.motivo_perda}</span>
                    ) : (
                      <span className="text-muted-foreground">
                        Não informado
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {lead.tipo_evento ?? "—"}
                    {lead.data_evento && (
                      <span className="block text-xs">
                        {formatDate(lead.data_evento)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {formatDate(lead.updated_at)}
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
