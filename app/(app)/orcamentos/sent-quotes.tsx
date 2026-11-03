"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/date";
import { QUOTE_SEGMENT_LABELS, type QuoteWithCompany } from "@/types";
import { QuoteTicket, formatQuoteNumber } from "./quote-ticket";
import { QuoteTicketActions } from "./quote-ticket-actions";

/** Lista de orçamentos enviados; cada linha abre a comanda carimbada. */
export function SentQuotes({ quotes }: { quotes: QuoteWithCompany[] }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const open = quotes.find((q) => q.id === openId) ?? null;

  return (
    <>
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Nº</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="hidden md:table-cell">Evento</TableHead>
              <TableHead className="hidden lg:table-cell">Empresa</TableHead>
              <TableHead className="hidden sm:table-cell">Recebido</TableHead>
              <TableHead>Enviado</TableHead>
              <TableHead className="text-right">
                <span className="sr-only">Ação</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {quotes.map((q) => (
              <TableRow key={q.id}>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {formatQuoteNumber(q.numero)}
                </TableCell>
                <TableCell>
                  <span className="font-medium">{q.nome}</span>
                  {q.segmento === "corporativo" && q.nome_empresa && (
                    <span className="block text-xs text-muted-foreground">
                      {q.nome_empresa}
                    </span>
                  )}
                </TableCell>
                <TableCell className="hidden text-sm md:table-cell">
                  {q.tipo_evento ?? "—"}
                  <span className="block text-xs text-muted-foreground">
                    {QUOTE_SEGMENT_LABELS[q.segmento] ?? q.segmento}
                    {q.quantitativo && ` · ${q.quantitativo}`}
                  </span>
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                  {q.company?.name ?? "—"}
                </TableCell>
                <TableCell className="hidden text-sm text-muted-foreground sm:table-cell">
                  {formatDateTime(q.created_at)}
                </TableCell>
                <TableCell className="text-sm">
                  {formatDateTime(q.enviado_em)}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setOpenId(q.id)}
                  >
                    <Eye className="h-4 w-4" />
                    <span className="hidden sm:inline">Ver comanda</span>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={open !== null}
        onOpenChange={(v) => {
          if (!v) setOpenId(null);
        }}
      >
        <DialogContent
          aria-describedby={undefined}
          className="max-w-sm border-0 bg-transparent p-2 shadow-none sm:max-w-sm [&>button]:bg-card [&>button]:p-1">
          {open && (
            <>
              <DialogTitle className="sr-only">
                Comanda Nº {formatQuoteNumber(open.numero)}
              </DialogTitle>
              <QuoteTicket
                quote={open}
                actions={
                  <QuoteTicketActions
                    id={open.id}
                    numero={open.numero}
                    status={open.status}
                    telefone={open.telefone}
                    onDone={() => setOpenId(null)}
                  />
                }
              />
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
