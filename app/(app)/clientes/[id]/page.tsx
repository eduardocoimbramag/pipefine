import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  AtSign,
  Wallet,
  CalendarClock,
} from "lucide-react";
import { getClientDetail } from "@/lib/queries/clients";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LeadStatusBadge,
  EventStatusBadge,
  PaymentStatusBadge,
} from "@/components/status-badge";
import { ClientDialog } from "../client-dialog";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await getClientDetail(id);
  if (!detail) notFound();

  const { client, leads, events, totalFaturado, ultimoAtendimento } = detail;

  return (
    <div className="space-y-5">
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para clientes
      </Link>

      <PageHeader title={client.name}>
        <ClientDialog client={client} />
      </PageHeader>

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        {client.phone && (
          <span className="inline-flex items-center gap-1">
            <Phone className="h-4 w-4" /> {client.phone}
          </span>
        )}
        {client.email && (
          <span className="inline-flex items-center gap-1">
            <Mail className="h-4 w-4" /> {client.email}
          </span>
        )}
        {client.instagram && (
          <span className="inline-flex items-center gap-1">
            <AtSign className="h-4 w-4" /> {client.instagram}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total faturado"
          value={formatCurrency(totalFaturado)}
          icon={Wallet}
          tone="success"
        />
        <StatCard label="Eventos" value={events.length} tone="primary" />
        <StatCard label="Leads" value={leads.length} tone="purple" />
        <StatCard
          label="Último atendimento"
          value={ultimoAtendimento ? formatDate(ultimoAtendimento) : "—"}
          icon={CalendarClock}
        />
      </div>

      {client.notes && (
        <Card>
          <CardContent className="pt-5">
            <p className="mb-1 text-xs text-muted-foreground">Observações</p>
            <p className="whitespace-pre-wrap text-sm">{client.notes}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Eventos */}
        <Card>
          <CardHeader>
            <CardTitle>Eventos ({events.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {events.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum evento fechado.
              </p>
            ) : (
              events.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/eventos/${ev.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {ev.tipo_evento ?? "Evento"} ·{" "}
                      {formatCurrency(ev.valor_total)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(ev.data_evento)} · {ev.company?.name ?? "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <EventStatusBadge status={ev.status_evento} />
                    <PaymentStatusBadge status={ev.status_pagamento} />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Leads */}
        <Card>
          <CardHeader>
            <CardTitle>Leads ({leads.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leads.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                Nenhum lead vinculado.
              </p>
            ) : (
              leads.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {lead.tipo_evento ?? "Lead"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {lead.company?.name ?? "—"}
                      {lead.data_evento &&
                        ` · ${formatDate(lead.data_evento)}`}
                    </p>
                  </div>
                  <LeadStatusBadge status={lead.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
