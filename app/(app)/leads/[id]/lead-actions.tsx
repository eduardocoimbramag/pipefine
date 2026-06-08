"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  MoreVertical,
  Pencil,
  FileCheck,
  CalendarPlus,
  Trash2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { updateLeadStatus, deleteLead } from "@/app/actions/leads";
import { convertLeadToEvent } from "@/app/actions/events";
import type { LeadStatus } from "@/types";

export function LeadActions({
  id,
  status,
}: {
  id: string;
  status: LeadStatus;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function markOrcamento() {
    start(async () => {
      const res = await updateLeadStatus(id, "orcamento_enviado");
      if (res.ok) {
        toast.success("Orçamento marcado como enviado. Follow-up criado em 2 dias.");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  function convert() {
    start(async () => {
      await convertLeadToEvent(id);
    });
  }

  function remove() {
    start(async () => {
      const res = await deleteLead(id);
      if (res.ok) {
        toast.success("Lead excluído.");
        router.push("/leads");
        router.refresh();
      } else {
        toast.error(res.error);
        setConfirmDelete(false);
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/leads/${id}/editar`}>
            <Pencil className="h-4 w-4" /> Editar
          </Link>
        </Button>

        {status !== "orcamento_enviado" &&
          status !== "fechado" &&
          status !== "perdido" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={markOrcamento}
              disabled={pending}
            >
              <FileCheck className="h-4 w-4" /> Orçamento enviado
            </Button>
          )}

        {status !== "fechado" && (
          <Button
            variant="success"
            size="sm"
            onClick={convert}
            disabled={pending}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CalendarPlus className="h-4 w-4" />
            )}
            Converter em evento
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/leads/${id}/editar`}>
                <Pencil className="h-4 w-4" /> Editar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={(e) => {
                e.preventDefault();
                setConfirmDelete(true);
              }}
            >
              <Trash2 className="h-4 w-4" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir lead?</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. Os follow-ups e o histórico deste
              lead também serão removidos.
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
            <Button variant="destructive" onClick={remove} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
