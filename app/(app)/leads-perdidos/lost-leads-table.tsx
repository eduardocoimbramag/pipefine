"use client";

import { useState } from "react";
import Link from "next/link";
import { Trash2 } from "lucide-react";
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
import { deleteLeadsBulk } from "@/app/actions/leads";
import { formatDate } from "@/lib/date";
import { cn } from "@/lib/utils";
import type { LeadWithRelations } from "@/types";

export function LostLeadsTable({ leads }: { leads: LeadWithRelations[] }) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = leads.length > 0 && selected.size === leads.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(leads.map((l) => l.id)));
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
    <div className="space-y-3">
      <div className="flex justify-end">
        {!selecting && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelecting(true)}
            disabled={leads.length === 0}
          >
            <Trash2 className="h-4 w-4" /> Remover Lead
          </Button>
        )}
      </div>

      {selecting && (
        <BulkDeleteBar
          selectedIds={Array.from(selected)}
          onExit={exitSelecting}
          onDeleted={exitSelecting}
          deleteAction={deleteLeadsBulk}
          entityLabel="lead"
          confirmDescription="Os follow-ups e o histórico desses leads também serão removidos."
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
              <TableHead className="hidden md:table-cell">Empresa</TableHead>
              <TableHead>Motivo da perda</TableHead>
              <TableHead className="hidden lg:table-cell">Evento</TableHead>
              <TableHead className="hidden sm:table-cell">Perdido em</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leads.map((lead) => {
              const isSel = selected.has(lead.id);
              return (
                <TableRow
                  key={lead.id}
                  className={cn(selecting && isSel && "bg-primary/5")}
                >
                  {selecting && (
                    <TableCell>
                      <Checkbox
                        aria-label={`Selecionar ${lead.nome_cliente}`}
                        checked={isSel}
                        onChange={() => toggleOne(lead.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    {selecting ? (
                      <button
                        type="button"
                        onClick={() => toggleOne(lead.id)}
                        className="block text-left"
                      >
                        <span className="font-medium">{lead.nome_cliente}</span>
                        <span className="block text-xs text-muted-foreground">
                          {lead.telefone ??
                            lead.instagram ??
                            lead.email ??
                            "—"}
                        </span>
                      </button>
                    ) : (
                      <Link href={`/leads/${lead.id}`} className="block">
                        <span className="font-medium">{lead.nome_cliente}</span>
                        <span className="block text-xs text-muted-foreground">
                          {lead.telefone ??
                            lead.instagram ??
                            lead.email ??
                            "—"}
                        </span>
                      </Link>
                    )}
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
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
