"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/form/field";
import {
  ClientPickerDialog,
  type ClientOption,
} from "./client-picker-dialog";
import { createLead, updateLead } from "@/app/actions/leads";
import {
  FUNNEL_STATUSES,
  LEAD_STATUS_LABELS,
  EVENT_TYPES,
  type LeadStatus,
} from "@/types";
import type { Company, Lead } from "@/types";

export function LeadForm({
  companies,
  lead,
  defaultCompanyId,
  clients = [],
}: {
  companies: Company[];
  lead?: Lead;
  /** Empresa em foco na topbar — pré-seleciona o campo ao criar um lead novo. */
  defaultCompanyId?: string;
  /** Clientes já cadastrados, para a opção "Cliente antigo?" (só ao criar). */
  clients?: ClientOption[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Estado controlado para os selects (Radix Select não envia value via name nativo)
  const [companyId, setCompanyId] = useState(
    lead?.company_id ?? defaultCompanyId ?? "",
  );
  const [status, setStatus] = useState(lead?.status ?? "novo_lead");
  const [tipoEvento, setTipoEvento] = useState(lead?.tipo_evento ?? "");

  // "Cliente antigo?" — disponível apenas ao criar um lead novo. Ao marcar,
  // abre o seletor de clientes; ao escolher, vincula o lead ao cliente
  // (client_id) e preenche nome/telefone/e-mail. O lead vai para o Kanban como
  // de costume e, quando fechado, conta para o histórico daquele cliente.
  const isEditing = Boolean(lead);
  const [oldClient, setOldClient] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [linkedClientId, setLinkedClientId] = useState("");

  // Campos preenchíveis pelo seletor de cliente (controlados quando re-vinculado).
  const [nomeCliente, setNomeCliente] = useState(lead?.nome_cliente ?? "");
  const [telefone, setTelefone] = useState(lead?.telefone ?? "");
  const [email, setEmail] = useState(lead?.email ?? "");

  function toggleOldClient(checked: boolean) {
    setOldClient(checked);
    if (checked) {
      setPickerOpen(true);
    } else {
      // Desmarcou → desfaz o vínculo e limpa os campos preenchidos.
      setLinkedClientId("");
      setNomeCliente("");
      setTelefone("");
      setEmail("");
    }
  }

  function handleSelectClient(client: ClientOption) {
    setLinkedClientId(client.id);
    setNomeCliente(client.name);
    setTelefone(client.phone ?? "");
    setEmail(client.email ?? "");
    setPickerOpen(false);
  }

  // Opções de status = funil do Kanban. Se estiver editando um lead com status
  // fora do funil (ex.: fechado/perdido), mantém o atual na lista para não perdê-lo.
  const statusOptions: LeadStatus[] =
    lead && !FUNNEL_STATUSES.includes(lead.status)
      ? [lead.status, ...FUNNEL_STATUSES]
      : FUNNEL_STATUSES;

  function onSubmit(formData: FormData) {
    setError(null);
    formData.set("company_id", companyId);
    formData.set("status", status);
    formData.set("tipo_evento", tipoEvento);
    // Vínculo com cliente antigo (somente na criação). Em edição o action ignora.
    formData.set("client_id", linkedClientId);

    start(async () => {
      const res = lead
        ? await updateLead(lead.id, formData)
        : await createLead(formData);
      if (res.ok) {
        toast.success(res.message ?? "Salvo");
        if (lead) router.push(`/leads/${lead.id}`);
        else if ("data" in res && res.data) router.push(`/leads/${res.data.id}`);
        else router.push("/leads");
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
        <Field label="Empresa" required className="sm:col-span-1">
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

        <Field label="Status" required>
          <Select value={status} onValueChange={(v) => setStatus(v as never)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((s) => (
                <SelectItem key={s} value={s}>
                  {LEAD_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Nome do cliente" htmlFor="nome_cliente" required>
          <Input
            id="nome_cliente"
            name="nome_cliente"
            value={nomeCliente}
            onChange={(e) => setNomeCliente(e.target.value)}
            required
          />
        </Field>

        <Field label="Telefone / WhatsApp" htmlFor="telefone">
          <Input
            id="telefone"
            name="telefone"
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(00) 00000-0000"
          />
        </Field>

        <Field label="E-mail" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="cliente@email.com"
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

        <Field label="Data do evento" htmlFor="data_evento">
          <Input
            id="data_evento"
            name="data_evento"
            type="date"
            defaultValue={lead?.data_evento ?? ""}
          />
        </Field>

        <Field label="Local do evento" htmlFor="local_evento">
          <Input
            id="local_evento"
            name="local_evento"
            defaultValue={lead?.local_evento ?? ""}
          />
        </Field>

        <Field label="Quantidade de pessoas" htmlFor="quantidade_pessoas">
          <Input
            id="quantidade_pessoas"
            name="quantidade_pessoas"
            type="number"
            min={0}
            defaultValue={lead?.quantidade_pessoas ?? ""}
          />
        </Field>
      </div>

      {status === "perdido" && (
        <Field label="Motivo da perda" htmlFor="motivo_perda">
          <Input
            id="motivo_perda"
            name="motivo_perda"
            defaultValue={lead?.motivo_perda ?? ""}
            placeholder="Ex.: preço, data indisponível, escolheu concorrente..."
          />
        </Field>
      )}

      {/* Cliente antigo? — re-vincular um cliente já cadastrado (só ao criar). */}
      {!isEditing && (
        <div className="rounded-lg border border-dashed bg-muted/30 p-4">
          <label className="flex items-start gap-3">
            <Checkbox
              checked={oldClient}
              onChange={(e) => toggleOldClient(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              <span className="text-sm font-medium">Cliente antigo?</span>
              <span className="block text-xs text-muted-foreground">
                Marque para abrir um novo evento para um cliente já cadastrado.
                O lead entra no Kanban vinculado a ele e, ao fechar, conta no
                histórico de eventos do cliente.
              </span>
            </span>
          </label>

          {linkedClientId && (
            <div className="mt-3 flex items-center justify-between gap-2 rounded-md border bg-card px-3 py-2">
              <span className="min-w-0 text-sm">
                <span className="font-medium">Vinculado a: </span>
                <span className="text-muted-foreground">{nomeCliente}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setPickerOpen(true)}
              >
                Trocar
              </Button>
            </div>
          )}
        </div>
      )}

      {!isEditing && (
        <ClientPickerDialog
          open={pickerOpen}
          onOpenChange={(o) => {
            setPickerOpen(o);
            // Fechou sem escolher e ainda não havia vínculo → desmarca.
            if (!o && !linkedClientId) setOldClient(false);
          }}
          clients={clients}
          onSelect={handleSelectClient}
        />
      )}

      {/*
        Campos removidos do formulário (instagram, origem, responsável,
        valor estimado, próximo follow-up, observações). Mantemos os valores
        existentes via inputs ocultos para não apagá-los ao editar um lead.
      */}
      <input
        type="hidden"
        name="instagram"
        defaultValue={lead?.instagram ?? ""}
      />
      <input
        type="hidden"
        name="origem_lead"
        defaultValue={lead?.origem_lead ?? ""}
      />
      <input
        type="hidden"
        name="responsavel_id"
        defaultValue={lead?.responsavel_id ?? ""}
      />
      <input
        type="hidden"
        name="valor_estimado"
        defaultValue={lead?.valor_estimado ?? ""}
      />
      {/* data_proximo_followup não é enviado: é derivado dos follow-ups. */}
      <input
        type="hidden"
        name="observacoes"
        defaultValue={lead?.observacoes ?? ""}
      />
      <input
        type="hidden"
        name="data_primeiro_contato"
        defaultValue={lead?.data_primeiro_contato ?? ""}
      />
      <input
        type="hidden"
        name="data_orcamento_enviado"
        defaultValue={lead?.data_orcamento_enviado ?? ""}
      />

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
          {lead ? "Salvar alterações" : "Criar lead"}
        </Button>
      </div>
    </form>
  );
}
