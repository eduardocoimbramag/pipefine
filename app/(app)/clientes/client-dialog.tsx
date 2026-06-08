"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil } from "lucide-react";
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
import {
  createClientRecord,
  updateClientRecord,
} from "@/app/actions/clients";
import type { Client } from "@/types";

export function ClientDialog({ client }: { client?: Client }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  function onSubmit(formData: FormData) {
    start(async () => {
      const res = client
        ? await updateClientRecord(client.id, formData)
        : await createClientRecord(formData);
      if (res.ok) {
        toast.success(res.message ?? "Salvo");
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
        {client ? (
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4" /> Editar
          </Button>
        ) : (
          <Button size="sm">
            <Plus className="h-4 w-4" /> Novo cliente
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{client ? "Editar cliente" : "Novo cliente"}</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          <Field label="Nome" htmlFor="name" required>
            <Input id="name" name="name" defaultValue={client?.name ?? ""} required />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Telefone" htmlFor="phone">
              <Input id="phone" name="phone" defaultValue={client?.phone ?? ""} />
            </Field>
            <Field label="Instagram" htmlFor="instagram">
              <Input
                id="instagram"
                name="instagram"
                defaultValue={client?.instagram ?? ""}
                placeholder="@cliente"
              />
            </Field>
          </div>
          <Field label="E-mail" htmlFor="email">
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={client?.email ?? ""}
            />
          </Field>
          <Field label="Observações" htmlFor="notes">
            <Textarea id="notes" name="notes" defaultValue={client?.notes ?? ""} rows={2} />
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
