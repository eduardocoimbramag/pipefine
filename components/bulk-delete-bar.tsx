"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ActionResult } from "@/types";

/**
 * Barra de ações do modo de seleção (remover em lote).
 * Mostra quantos itens estão selecionados, botão de remover (com confirmação)
 * e botão de sair do modo. Reutilizado em Banco de Clientes e Leads Perdidos.
 */
export function BulkDeleteBar({
  selectedIds,
  onExit,
  onDeleted,
  deleteAction,
  entityLabel,
  confirmDescription,
}: {
  selectedIds: string[];
  onExit: () => void;
  onDeleted: () => void;
  deleteAction: (ids: string[]) => Promise<ActionResult<{ count: number }>>;
  /** Ex.: "cliente" / "lead". */
  entityLabel: string;
  /** Texto extra no diálogo de confirmação. */
  confirmDescription?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const count = selectedIds.length;

  function remove() {
    start(async () => {
      const res = await deleteAction(selectedIds);
      if (res.ok) {
        toast.success(res.message ?? "Removido.");
        setConfirm(false);
        onDeleted();
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2">
        <span className="text-sm font-medium">
          {count === 0
            ? "Selecione os registros que deseja remover"
            : `${count} selecionado(s)`}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onExit}>
            <X className="h-4 w-4" /> Cancelar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={count === 0}
            onClick={() => setConfirm(true)}
          >
            <Trash2 className="h-4 w-4" /> Remover
            {count > 0 ? ` (${count})` : ""}
          </Button>
        </div>
      </div>

      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" /> Remover{" "}
              {count === 1 ? entityLabel : `${count} ${entityLabel}s`}?
            </DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita.
              {confirmDescription ? ` ${confirmDescription}` : ""}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirm(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Remover {count > 0 ? `(${count})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
