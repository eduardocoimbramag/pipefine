"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Plus, Trash2, CalendarDays, LayoutList, CalendarRange } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ViewToggle } from "@/components/view-toggle";
import { EventsCalendar } from "./events-calendar";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BulkDeleteBar } from "@/components/bulk-delete-bar";
import { PaymentStatusBadge } from "@/components/status-badge";
import { deleteEventsBulk } from "@/app/actions/events";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { EventWithRelations } from "@/types";

export type EventsView = "lista" | "calendario";

export function EventsManager({
  events,
  description,
  filters,
  view,
}: {
  events: EventWithRelations[];
  description: string;
  /** Barra de filtros (server-rendered), inserida entre o cabeçalho e a lista. */
  filters: ReactNode;
  view: EventsView;
}) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const isCalendario = view === "calendario";

  const allSelected = events.length > 0 && selected.size === events.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(events.map((e) => e.id)));
  }
  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function exitSelecting() {
    setSelecting(false);
    setSelected(new Set());
  }

  return (
    <>
      <PageHeader title="Eventos" description={description}>
        <ViewToggle<EventsView>
          value={view}
          defaultView="lista"
          options={[
            { key: "lista", label: "Lista", icon: LayoutList },
            { key: "calendario", label: "Calendário", icon: CalendarRange },
          ]}
        />
        {/* Seleção múltipla é exclusiva da lista. */}
        {!selecting && !isCalendario && (
          <Button
            variant="outline"
            onClick={() => setSelecting(true)}
            disabled={events.length === 0}
          >
            <Trash2 className="h-4 w-4" /> Remover evento
          </Button>
        )}
        <Button asChild>
          <Link href="/eventos/novo">
            <Plus className="h-4 w-4" /> Novo evento
          </Link>
        </Button>
      </PageHeader>

      {filters}

      {isCalendario ? (
        <EventsCalendar events={events} />
      ) : events.length === 0 ? (
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
        <>
          {selecting && (
            <BulkDeleteBar
              selectedIds={Array.from(selected)}
              onExit={exitSelecting}
              onDeleted={exitSelecting}
              deleteAction={deleteEventsBulk}
              entityLabel="evento"
              confirmDescription="As parcelas vinculadas também serão removidas. O cliente de origem é preservado."
            />
          )}

          <Card className="overflow-hidden p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {selecting && (
                    <TableHead className="w-10">
                      <Checkbox
                        aria-label="Selecionar todos"
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={toggleAll}
                      />
                    </TableHead>
                  )}
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Empresa
                  </TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead className="hidden sm:table-cell">Valor</TableHead>
                  <TableHead className="hidden sm:table-cell">
                    Pagamento
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((ev) => {
                  const isSel = selected.has(ev.id);
                  return (
                    <TableRow
                      key={ev.id}
                      className={cn(selecting && isSel && "bg-primary/5")}
                    >
                      {selecting && (
                        <TableCell>
                          <Checkbox
                            aria-label={`Selecionar ${ev.nome_cliente}`}
                            checked={isSel}
                            onChange={() => toggleOne(ev.id)}
                          />
                        </TableCell>
                      )}
                      <TableCell>
                        {selecting ? (
                          <button
                            type="button"
                            onClick={() => toggleOne(ev.id)}
                            className="block text-left"
                          >
                            <span className="font-medium">
                              {ev.nome_cliente}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {ev.tipo_evento ?? "—"}
                            </span>
                          </button>
                        ) : (
                          <Link href={`/eventos/${ev.id}`} className="block">
                            <span className="font-medium">
                              {ev.nome_cliente}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {ev.tipo_evento ?? "—"}
                            </span>
                          </Link>
                        )}
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
                      <TableCell className="hidden sm:table-cell">
                        <PaymentStatusBadge status={ev.status_pagamento} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        </>
      )}
    </>
  );
}
