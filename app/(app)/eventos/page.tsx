import Link from "next/link";
import { Plus, CalendarDays } from "lucide-react";
import { getEvents, type EventFilters as Filters } from "@/lib/queries/events";
import { getCompanies } from "@/lib/queries/shared";
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
import { EventStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { EventFilters } from "./event-filters";
import { getActiveCompanyContext } from "@/lib/active-company";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import type { EventStatus, PaymentStatus } from "@/types";

export const metadata = { title: "Eventos — Pipefine" };
export const dynamic = "force-dynamic";

export default async function EventosPage({
  searchParams,
}: {
  searchParams: Promise<{
    company?: string;
    statusEvento?: string;
    statusPagamento?: string;
    month?: string;
  }>;
}) {
  const sp = await searchParams;
  const { activeCompanyId } = await getActiveCompanyContext();
  const effectiveCompanyId = activeCompanyId ?? sp.company;

  const filters: Filters = {
    companyId: effectiveCompanyId,
    statusEvento: sp.statusEvento as EventStatus | undefined,
    statusPagamento: sp.statusPagamento as PaymentStatus | undefined,
    month: sp.month,
  };

  const [events, companies] = await Promise.all([
    getEvents(filters),
    getCompanies(),
  ]);

  const totalPeriodo = events
    .filter((e) => e.status_evento !== "cancelado")
    .reduce((s, e) => s + (Number(e.valor_total) || 0), 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Eventos"
        description={`${events.length} evento(s) · ${formatCurrency(totalPeriodo)} em contratos`}
      >
        <Button asChild>
          <Link href="/eventos/novo">
            <Plus className="h-4 w-4" /> Novo evento
          </Link>
        </Button>
      </PageHeader>

      <EventFilters
        companies={companies}
        lockCompany={activeCompanyId !== null}
      />

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nenhum evento encontrado"
          description="Ajuste os filtros ou cadastre um novo evento."
        >
          <Button asChild size="sm">
            <Link href="/eventos/novo">
              <Plus className="h-4 w-4" /> Novo evento
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
                <TableHead>Data</TableHead>
                <TableHead className="hidden sm:table-cell">Valor</TableHead>
                <TableHead className="hidden lg:table-cell">Pagamento</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((ev) => (
                <TableRow key={ev.id}>
                  <TableCell>
                    <Link href={`/eventos/${ev.id}`} className="block">
                      <span className="font-medium">{ev.nome_cliente}</span>
                      <span className="block text-xs text-muted-foreground">
                        {ev.tipo_evento ?? "—"}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {ev.company?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(ev.data_evento)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">
                    <span className="font-medium">
                      {formatCurrency(ev.valor_total)}
                    </span>
                    {ev.valor_restante > 0 && (
                      <span className="block text-xs text-warning-foreground">
                        Resta {formatCurrency(ev.valor_restante)}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <PaymentStatusBadge status={ev.status_pagamento} />
                  </TableCell>
                  <TableCell>
                    <EventStatusBadge status={ev.status_evento} />
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
