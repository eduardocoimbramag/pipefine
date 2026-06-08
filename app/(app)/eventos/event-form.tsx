"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/form/field";
import { createEvent, updateEvent } from "@/app/actions/events";
import { formatCurrency } from "@/lib/utils";
import {
  EVENT_STATUSES,
  EVENT_STATUS_LABELS,
  EVENT_TYPES,
} from "@/types";
import type { Company, UserProfile, EventItem } from "@/types";

export function EventForm({
  companies,
  profiles,
  event,
  defaultCompanyId,
}: {
  companies: Company[];
  profiles: UserProfile[];
  event?: EventItem;
  /** Empresa em foco na topbar — pré-seleciona o campo ao criar um evento novo. */
  defaultCompanyId?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [companyId, setCompanyId] = useState(
    event?.company_id ?? defaultCompanyId ?? "",
  );
  const [statusEvento, setStatusEvento] = useState(
    event?.status_evento ?? "confirmado",
  );
  const [responsavel, setResponsavel] = useState(event?.responsavel_id ?? "");
  const [tipoEvento, setTipoEvento] = useState(event?.tipo_evento ?? "");

  // Cálculo do restante em tempo real
  const [total, setTotal] = useState(event?.valor_total ?? 0);
  const [entrada, setEntrada] = useState(event?.valor_entrada ?? 0);
  const restante = Math.max((Number(total) || 0) - (Number(entrada) || 0), 0);

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set("company_id", companyId);
    formData.set("status_evento", statusEvento);
    formData.set("responsavel_id", responsavel);
    formData.set("tipo_evento", tipoEvento);

    start(async () => {
      const res = event
        ? await updateEvent(event.id, formData)
        : await createEvent(formData);
      if (res.ok) {
        toast.success(res.message ?? "Salvo");
        if (event) router.push(`/eventos/${event.id}`);
        else if ("data" in res && res.data)
          router.push(`/eventos/${res.data.id}`);
        else router.push("/eventos");
        router.refresh();
      } else {
        setError(res.error);
        toast.error(res.error);
      }
    });
  }

  return (
    <form action={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Empresa" required>
          <Select value={companyId} onValueChange={setCompanyId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a empresa" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Status do evento" required>
          <Select
            value={statusEvento}
            onValueChange={(v) => setStatusEvento(v as never)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {EVENT_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Nome do cliente" htmlFor="nome_cliente" required>
          <Input
            id="nome_cliente"
            name="nome_cliente"
            defaultValue={event?.nome_cliente ?? ""}
            required
          />
        </Field>

        <Field label="Tipo de evento">
          <Select value={tipoEvento} onValueChange={setTipoEvento}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Data do evento" htmlFor="data_evento" required>
          <Input
            id="data_evento"
            name="data_evento"
            type="date"
            defaultValue={event?.data_evento ?? ""}
            required
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Início" htmlFor="horario_inicio">
            <Input
              id="horario_inicio"
              name="horario_inicio"
              type="time"
              defaultValue={event?.horario_inicio ?? ""}
            />
          </Field>
          <Field label="Fim" htmlFor="horario_fim">
            <Input
              id="horario_fim"
              name="horario_fim"
              type="time"
              defaultValue={event?.horario_fim ?? ""}
            />
          </Field>
        </div>

        <Field label="Local" htmlFor="local_evento">
          <Input
            id="local_evento"
            name="local_evento"
            defaultValue={event?.local_evento ?? ""}
          />
        </Field>

        <Field label="Quantidade de pessoas" htmlFor="quantidade_pessoas">
          <Input
            id="quantidade_pessoas"
            name="quantidade_pessoas"
            type="number"
            min={0}
            defaultValue={event?.quantidade_pessoas ?? ""}
          />
        </Field>

        <Field label="Responsável">
          <Select value={responsavel} onValueChange={setResponsavel}>
            <SelectTrigger>
              <SelectValue placeholder="Quem cuida?" />
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

        <Field label="Forma de pagamento" htmlFor="forma_pagamento">
          <Input
            id="forma_pagamento"
            name="forma_pagamento"
            defaultValue={event?.forma_pagamento ?? ""}
            placeholder="Ex.: Pix, dinheiro, parcelado..."
          />
        </Field>
      </div>

      <Field label="Serviços contratados" htmlFor="servicos_contratados">
        <Textarea
          id="servicos_contratados"
          name="servicos_contratados"
          defaultValue={event?.servicos_contratados ?? ""}
          rows={2}
          placeholder="Ex.: Buffet completo, bebidas, decoração..."
        />
      </Field>

      {/* Financeiro */}
      <div className="rounded-lg border bg-muted/30 p-4">
        <p className="mb-3 text-sm font-medium">Financeiro</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Valor total (R$)" htmlFor="valor_total">
            <Input
              id="valor_total"
              name="valor_total"
              type="number"
              step="0.01"
              min={0}
              value={total}
              onChange={(e) => setTotal(Number(e.target.value))}
            />
          </Field>
          <Field label="Entrada paga (R$)" htmlFor="valor_entrada">
            <Input
              id="valor_entrada"
              name="valor_entrada"
              type="number"
              step="0.01"
              min={0}
              value={entrada}
              onChange={(e) => setEntrada(Number(e.target.value))}
            />
          </Field>
          <Field label="Restante">
            <div className="flex h-9 items-center rounded-md border bg-card px-3 text-sm font-semibold text-warning-foreground">
              {formatCurrency(restante)}
            </div>
          </Field>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          O status de pagamento é calculado automaticamente a partir dos valores.
        </p>
      </div>

      <Field label="Observações operacionais" htmlFor="observacoes_operacionais">
        <Textarea
          id="observacoes_operacionais"
          name="observacoes_operacionais"
          defaultValue={event?.observacoes_operacionais ?? ""}
          rows={2}
        />
      </Field>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={pending}
        >
          Cancelar
        </Button>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {event ? "Salvar alterações" : "Criar evento"}
        </Button>
      </div>
    </form>
  );
}
