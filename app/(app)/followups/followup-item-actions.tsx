"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, XCircle, Loader2, MoreVertical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FollowupDuePicker } from "@/components/followup-due-picker";
import { rescheduleFollowup, cancelFollowup } from "@/app/actions/followups";
import { addDaysISO } from "@/lib/date";

export function FollowupItemActions({
  id,
  data,
}: {
  id: string;
  data: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [reschedule, setReschedule] = useState(false);
  const [novaData, setNovaData] = useState(data || addDaysISO(2));

  function doReschedule() {
    start(async () => {
      const res = await rescheduleFollowup(id, novaData);
      if (res.ok) {
        toast.success("Reagendado.");
        setReschedule(false);
        router.refresh();
      } else toast.error(res.error);
    });
  }

  function doCancel() {
    start(async () => {
      const res = await cancelFollowup(id);
      if (res.ok) {
        toast.success("Follow-up cancelado.");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" disabled={pending}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreVertical className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onSelect={() => {
              // Parte sempre da data atual do follow-up.
              setNovaData(data || addDaysISO(2));
              setReschedule(true);
            }}
          >
            <CalendarClock className="h-4 w-4" /> Reagendar
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onSelect={doCancel}
          >
            <XCircle className="h-4 w-4" /> Cancelar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={reschedule} onOpenChange={setReschedule}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reagendar follow-up</DialogTitle>
          </DialogHeader>
          <FollowupDuePicker
            value={novaData}
            onChange={setNovaData}
            label="Nova data"
            id="nova_data"
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReschedule(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button onClick={doReschedule} disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Reagendar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
