"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Loader2,
  MessageCircle,
  MoreHorizontal,
  Trash2,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { deleteQuote, markQuoteSent, reopenQuote } from "@/app/actions/quotes";
import type { ActionResult, QuoteStatus } from "@/types";
import { formatQuoteNumber, whatsappUrl } from "./quote-ticket";

/** Botões "de tinta" — combinam com o papel da comanda nos dois temas. */
const INK_BUTTON =
  "bg-ticket-ink text-ticket-paper hover:bg-ticket-ink/85 focus-visible:ring-ticket-ink";
const INK_OUTLINE =
  "border border-ticket-ink/40 bg-transparent text-ticket-ink hover:bg-ticket-ink/10 hover:text-ticket-ink";

/**
 * Ações no rodapé da comanda: marcar como enviado (pendente) ou voltar para a
 * fila (enviado), abrir o WhatsApp e excluir o pedido.
 */
export function QuoteTicketActions({
  id,
  numero,
  status,
  telefone,
  onDone,
}: {
  id: string;
  numero: number;
  status: QuoteStatus;
  telefone: string | null;
  /** Chamado após uma ação bem-sucedida (ex.: fechar o diálogo). */
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const whatsapp = whatsappUrl(telefone);

  function run(action: () => Promise<ActionResult>) {
    start(async () => {
      const res = await action();
      if (res.ok) {
        toast.success(res.message ?? "Atualizado");
        setConfirmDelete(false);
        onDone?.();
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2 font-sans">
        {status === "pendente" ? (
          <Button
            size="sm"
            className={`flex-1 ${INK_BUTTON}`}
            disabled={pending}
            onClick={() => run(() => markQuoteSent(id))}
          >
            {pending ? <Loader2 className="animate-spin" /> : <Check />}
            Orçamento enviado
          </Button>
        ) : (
          <Button
            size="sm"
            className={`flex-1 ${INK_OUTLINE}`}
            disabled={pending}
            onClick={() => run(() => reopenQuote(id))}
          >
            {pending ? <Loader2 className="animate-spin" /> : <Undo2 />}
            Voltar para pendentes
          </Button>
        )}

        {whatsapp && (
          <Button asChild size="icon" className={`size-8 ${INK_OUTLINE}`}>
            <a
              href={whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              title="Abrir no WhatsApp"
              aria-label="Abrir no WhatsApp"
            >
              <MessageCircle />
            </a>
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              className={`size-8 ${INK_OUTLINE}`}
              aria-label="Mais ações"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-4 w-4" /> Excluir pedido
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Excluir comanda Nº {formatQuoteNumber(numero)}?
            </DialogTitle>
            <DialogDescription>
              O pedido some do sistema e não pode ser recuperado. Use para spam
              ou pedidos duplicados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => run(() => deleteQuote(id))}
              disabled={pending}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
