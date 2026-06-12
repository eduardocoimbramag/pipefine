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
import { ClientDialog } from "./client-dialog";
import { deleteClientsBulk } from "@/app/actions/clients";
import { cn } from "@/lib/utils";
import type { ClientWithTipos } from "@/lib/queries/clients";

export function ClientsTable({ clients }: { clients: ClientWithTipos[] }) {
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = clients.length > 0 && selected.size === clients.length;
  const someSelected = selected.size > 0 && !allSelected;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(clients.map((c) => c.id)));
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
      {/* Barra de ações */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {!selecting ? (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelecting(true)}
              disabled={clients.length === 0}
            >
              <Trash2 className="h-4 w-4" /> Remover Cliente
            </Button>
            <ClientDialog />
          </>
        ) : null}
      </div>

      {selecting && (
        <BulkDeleteBar
          selectedIds={Array.from(selected)}
          onExit={exitSelecting}
          onDeleted={exitSelecting}
          deleteAction={deleteClientsBulk}
          entityLabel="cliente"
          confirmDescription="Os eventos e leads vinculados não são apagados — apenas deixam de ficar ligados a este cliente."
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
              <TableHead>Nome</TableHead>
              <TableHead className="hidden sm:table-cell">Telefone</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Tipo de evento</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => {
              const isSel = selected.has(c.id);
              return (
                <TableRow
                  key={c.id}
                  className={cn(selecting && isSel && "bg-primary/5")}
                >
                  {selecting && (
                    <TableCell>
                      <Checkbox
                        aria-label={`Selecionar ${c.name}`}
                        checked={isSel}
                        onChange={() => toggleOne(c.id)}
                      />
                    </TableCell>
                  )}
                  <TableCell>
                    {selecting ? (
                      <button
                        type="button"
                        onClick={() => toggleOne(c.id)}
                        className="text-left font-medium"
                      >
                        {c.name}
                      </button>
                    ) : (
                      <Link
                        href={`/clientes/${c.id}`}
                        className="font-medium hover:underline"
                      >
                        {c.name}
                      </Link>
                    )}
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
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
