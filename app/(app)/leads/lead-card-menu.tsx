"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarClock,
  Loader2,
  MoreVertical,
  Pencil,
  Trash2,
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
import { FollowupDuePicker } from "@/components/followup-due-picker";
import { deleteLead } from "@/app/actions/leads";
import { setLeadFollowupDate } from "@/app/actions/followups";
import { addDaysISO } from "@/lib/date";

/**
 * Menu "⋮" fixo no card do Kanban: editar lead, editar follow-up e remover.
 * Os diálogos ficam fora do card arrastável (quem renderiza deve colocar este
 * componente dentro de um wrapper que bloqueia o início de arraste).
 */
export function LeadCardMenu({
  leadId,
  nome,
  followupDate,
}: {
  leadId: string;
  nome: string;
  followupDate: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [followupOpen, setFollowupOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [date, setDate] = useState(followupDate ?? "");

  function saveFollowup() {
    if (!date) {
      toast.error("Escolha a data do follow-up.");
      return;
    }
    start(async () => {
      const res = await setLeadFollowupDate(leadId, date);
      if (res.ok) {
        toast.success(res.message ?? "Follow-up atualizado.");
        setFollowupOpen(false);
        router.refresh();
      } else toast.error(res.error);
    });
  }

  function remove() {
    start(async () => {
      const res = await deleteLead(leadId);
      if (res.ok) {
        toast.success("Lead removido.");
        setDeleteOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <div onPointerDown={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            aria-label="Ações do lead"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/leads/${leadId}/editar`}>
              <Pencil className="h-4 w-4" /> Editar lead
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              setDate(followupDate ?? addDaysISO(2));
              setFollowupOpen(true);
            }}
          >
            <CalendarClock className="h-4 w-4" /> Editar follow-up
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={() => setDeleteOpen(true)}
          >
            <Trash2 className="h-4 w-4" /> Remover lead
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={followupOpen} onOpenChange={setFollowupOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" /> Editar
              follow-up
            </DialogTitle>
            <DialogDescription>{nome}</DialogDescription>
          </DialogHeader>
          <FollowupDuePicker
            value={date}
            onChange={setDate}
            label="Data do follow-up"
            id={`card_followup_${leadId}`}
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setFollowupOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button onClick={saveFollowup} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Remover lead?</DialogTitle>
            <DialogDescription>
              {nome} será excluído, junto com os follow-ups e o histórico. Esta
              ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={remove} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
