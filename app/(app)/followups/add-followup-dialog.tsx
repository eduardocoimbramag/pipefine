"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/form/field";
import { FollowupDuePicker } from "@/components/followup-due-picker";
import { createFollowup } from "@/app/actions/followups";
import { addDaysISO } from "@/lib/date";
import type { UserProfile } from "@/types";

interface LeadOption {
  id: string;
  nome_cliente: string;
}

export function AddFollowupDialog({
  leads,
  profiles,
  defaultLeadId,
  triggerLabel = "Novo follow-up",
  triggerVariant = "default",
}: {
  leads: LeadOption[];
  profiles: UserProfile[];
  defaultLeadId?: string;
  triggerLabel?: string;
  triggerVariant?: "default" | "outline" | "secondary";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [leadId, setLeadId] = useState(defaultLeadId ?? "");
  const [responsavel, setResponsavel] = useState("");
  const [vencimento, setVencimento] = useState(() => addDaysISO(2));

  function onSubmit(formData: FormData) {
    formData.set("lead_id", leadId);
    formData.set("responsavel_id", responsavel);
    formData.set("data_vencimento", vencimento);
    start(async () => {
      const res = await createFollowup(formData);
      if (res.ok) {
        toast.success("Follow-up criado.");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        // Ao reabrir, formulário limpo: sugestão +2 dias e seleções zeradas.
        if (o) {
          setVencimento(addDaysISO(2));
          setLeadId(defaultLeadId ?? "");
          setResponsavel("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size="sm">
          <Plus className="h-4 w-4" /> {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo follow-up</DialogTitle>
        </DialogHeader>
        <form action={onSubmit} className="space-y-4">
          {!defaultLeadId && (
            <Field label="Lead" required>
              <Select value={leadId} onValueChange={setLeadId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nome_cliente}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          <Field label="Título" htmlFor="titulo" required>
            <Input
              id="titulo"
              name="titulo"
              placeholder="Ex.: Ligar para confirmar orçamento"
              required
            />
          </Field>

          <Field label="Descrição" htmlFor="descricao">
            <Textarea id="descricao" name="descricao" rows={2} />
          </Field>

          <FollowupDuePicker
            value={vencimento}
            onChange={setVencimento}
            label="Vencimento"
            required
            id="add_followup_due"
          />

          <Field label="Responsável">
            <Select value={responsavel} onValueChange={setResponsavel}>
              <SelectTrigger>
                <SelectValue placeholder="Quem?" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name ?? p.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Button type="submit" disabled={pending || !leadId}>
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
