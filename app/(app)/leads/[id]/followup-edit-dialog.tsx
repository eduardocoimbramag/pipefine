"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field } from "@/components/form/field";
import { updateFollowup } from "@/app/actions/followups";
import type { Followup } from "@/types";

export function FollowupEditDialog({ followup }: { followup: Followup }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function onSubmit(formData: FormData) {
    start(async () => {
      const res = await updateFollowup(followup.id, formData);
      if (res.ok) {
        toast.success("Follow-up atualizado.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Editar follow-up">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar follow-up</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <Field label="Título" htmlFor="titulo" required>
            <Input
              id="titulo"
              name="titulo"
              defaultValue={followup.titulo}
              required
            />
          </Field>
          <Field label="Descrição" htmlFor="descricao">
            <Textarea
              id="descricao"
              name="descricao"
              defaultValue={followup.descricao ?? ""}
              rows={2}
            />
          </Field>
          <Field label="Vencimento" htmlFor="data_vencimento" required>
            <Input
              id="data_vencimento"
              name="data_vencimento"
              type="date"
              defaultValue={followup.data_vencimento}
              required
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
