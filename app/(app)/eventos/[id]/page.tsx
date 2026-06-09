import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock,
  MapPin,
  Users,
  CreditCard,
  Briefcase,
} from "lucide-react";
import { getEventById, getEventInstallments } from "@/lib/queries/events";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { EventStatusBadge, PaymentStatusBadge } from "@/components/status-badge";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/date";
import { EventActions } from "./event-actions";
import { InstallmentsList } from "./installments-list";

export const dynamic = "force-dynamic";

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}

export default async function EventoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ev = await getEventById(id);
  if (!ev) notFound();

  const installments = await getEventInstallments(id);

  return (
    <div className="space-y-5">
      <Link
        href="/eventos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para eventos
      </Link>

      <PageHeader title={ev.nome_cliente} description={ev.tipo_evento ?? undefined}>
        <EventActions id={ev.id} />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <EventStatusBadge status={ev.status_evento} />
        <PaymentStatusBadge status={ev.status_pagamento} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Detalhes do evento</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <InfoRow icon={Building2} label="Empresa" value={ev.company?.name} />
            <InfoRow
              icon={CalendarDays}
              label="Data"
              value={formatDate(ev.data_evento)}
            />
            <InfoRow
              icon={Clock}
              label="Horário"
              value={
                ev.horario_inicio
                  ? `${ev.horario_inicio}${ev.horario_fim ? ` às ${ev.horario_fim}` : ""}`
                  : "—"
              }
            />
            <InfoRow icon={MapPin} label="Local" value={ev.local_evento} />
            <InfoRow
              icon={Users}
              label="Pessoas"
              value={ev.quantidade_pessoas?.toString()}
            />
            <InfoRow
              icon={CreditCard}
              label="Forma de pagamento"
              value={ev.forma_pagamento}
            />
            {ev.servicos_contratados && (
              <div className="sm:col-span-2">
                <Separator className="my-1" />
                <InfoRow
                  icon={Briefcase}
                  label="Serviços contratados"
                  value={
                    <span className="whitespace-pre-wrap">
                      {ev.servicos_contratados}
                    </span>
                  }
                />
              </div>
            )}
            {ev.observacoes_operacionais && (
              <div className="sm:col-span-2">
                <p className="mb-1 text-xs text-muted-foreground">
                  Observações operacionais
                </p>
                <p className="whitespace-pre-wrap text-sm">
                  {ev.observacoes_operacionais}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Resumo financeiro */}
        <Card>
          <CardHeader>
            <CardTitle>Financeiro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Valor total</span>
              <span className="text-lg font-bold">
                {formatCurrency(ev.valor_total)}
              </span>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Entrada paga</span>
              <span className="font-medium text-success">
                {formatCurrency(ev.valor_entrada)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Restante</span>
              <span className="font-medium text-warning-foreground">
                {formatCurrency(ev.valor_restante)}
              </span>
            </div>
            <Separator />
            <div className="pt-1">
              <PaymentStatusBadge status={ev.status_pagamento} />
            </div>
            {ev.lead_id && (
              <Link
                href={`/leads/${ev.lead_id}`}
                className="block pt-2 text-sm text-primary hover:underline"
              >
                Ver lead de origem →
              </Link>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Parcelas / cronograma de pagamento */}
      <Card>
        <CardHeader>
          <CardTitle>Parcelas</CardTitle>
        </CardHeader>
        <CardContent>
          <InstallmentsList
            eventId={ev.id}
            method={ev.payment_method}
            installments={installments}
          />
        </CardContent>
      </Card>
    </div>
  );
}
