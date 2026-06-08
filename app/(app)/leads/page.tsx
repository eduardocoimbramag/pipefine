import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { getLeads, type LeadFilters as Filters } from "@/lib/queries/leads";
import { getCompanies, getProfiles } from "@/lib/queries/shared";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LeadStatusBadge } from "@/components/status-badge";
import { LeadFilters } from "./lead-filters";
import { ViewToggle } from "./view-toggle";
import { KanbanBoard } from "./kanban-board";
import { getActiveCompanyContext } from "@/lib/active-company";
import { formatCurrency } from "@/lib/utils";
import { formatDate, isOverdue } from "@/lib/date";
import type { LeadStatus } from "@/types";

export const metadata = { title: "Leads — Pipefine" };
export const dynamic = "force-dynamic";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    company?: string;
    status?: string;
    responsavel?: string;
    view?: string;
  }>;
}) {
  const sp = await searchParams;
  const view: "lista" | "kanban" = sp.view === "kanban" ? "kanban" : "lista";
  const { activeCompanyId } = await getActiveCompanyContext();

  // A empresa em foco (topbar) tem prioridade; senão usa o filtro local da página.
  const effectiveCompanyId = activeCompanyId ?? sp.company;

  const filters: Filters = {
    search: sp.q,
    companyId: effectiveCompanyId,
    status: sp.status as LeadStatus | undefined,
    responsavelId: sp.responsavel,
  };

  const [leads, companies, profiles] = await Promise.all([
    getLeads(filters),
    getCompanies(),
    getProfiles(),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader title="Leads" description={`${leads.length} resultado(s)`}>
        <ViewToggle view={view} />
        <Button asChild>
          <Link href="/leads/novo">
            <Plus className="h-4 w-4" /> Novo lead
          </Link>
        </Button>
      </PageHeader>

      <LeadFilters
        companies={companies}
        profiles={profiles}
        lockCompany={activeCompanyId !== null}
      />

      {view === "kanban" ? (
        <KanbanBoard leads={leads} />
      ) : leads.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum lead encontrado"
          description="Ajuste os filtros ou cadastre um novo lead."
        >
          <Button asChild size="sm">
            <Link href="/leads/novo">
              <Plus className="h-4 w-4" /> Novo lead
            </Link>
          </Button>
        </EmptyState>
      ) : (
        <Card className="overflow-hidden p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Empresa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Evento</TableHead>
                <TableHead className="hidden sm:table-cell">Valor est.</TableHead>
                <TableHead className="hidden xl:table-cell">
                  Próx. follow-up
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.map((lead) => (
                <TableRow key={lead.id} className="cursor-pointer">
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
                  <TableCell>
                    <LeadStatusBadge status={lead.status} />
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">
                    {lead.tipo_evento ?? "—"}
                    {lead.data_evento && (
                      <span className="block text-xs text-muted-foreground">
                        {formatDate(lead.data_evento)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">
                    {lead.valor_estimado
                      ? formatCurrency(lead.valor_estimado)
                      : "—"}
                  </TableCell>
                  <TableCell className="hidden xl:table-cell text-sm">
                    {lead.data_proximo_followup ? (
                      <span
                        className={
                          isOverdue(lead.data_proximo_followup)
                            ? "text-destructive font-medium"
                            : ""
                        }
                      >
                        {formatDate(lead.data_proximo_followup)}
                      </span>
                    ) : (
                      "—"
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
