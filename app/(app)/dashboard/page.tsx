import Link from "next/link";
import {
  Flame,
  FileSignature,
  CalendarCheck,
  AlarmClock,
  CalendarDays,
  Wallet,
  TrendingUp,
  CircleDollarSign,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { getDashboardData } from "@/lib/queries/dashboard";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
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
import { CompleteFollowupButton } from "@/app/(app)/followups/complete-button";
import { getActiveCompanyContext } from "@/lib/active-company";
import { formatCurrency } from "@/lib/utils";
import { formatDate, formatMonthYear, isOverdue } from "@/lib/date";

export const metadata = { title: "Dashboard — Pipefine" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { activeCompanyId, activeCompany } = await getActiveCompanyContext();
  const d = await getDashboardData(activeCompanyId ?? undefined);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`${activeCompany ? activeCompany.name : "Todas as empresas"} · ${formatMonthYear(new Date())}`}
      />

      {/* Cards de métricas */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Leads Quentes"
          value={d.leadsQuentes}
          icon={Flame}
          tone="primary"
          hint="Ativos no funil"
          href="/leads"
        />
        <StatCard
          label="Falta assinar"
          value={d.faltaAssinar}
          icon={FileSignature}
          tone="purple"
          hint="Em negociação"
          href="/leads?status=negociacao"
        />
        <StatCard
          label="Follow-ups de hoje"
          value={d.followupsHoje}
          icon={CalendarCheck}
          tone="primary"
          href="/followups"
        />
        <StatCard
          label="Follow-ups atrasados"
          value={d.followupsAtrasados}
          icon={AlarmClock}
          tone={d.followupsAtrasados > 0 ? "destructive" : "default"}
          href="/followups?bucket=atrasados"
        />
        <StatCard
          label="Eventos do mês"
          value={d.eventosFechadosMes}
          icon={CalendarDays}
          tone="success"
          href="/eventos"
        />
        <StatCard
          label="Faturamento do mês"
          value={formatCurrency(d.faturamentoMes)}
          icon={Wallet}
          tone="primary"
        />
        <StatCard
          label="Valor recebido"
          value={formatCurrency(d.valorRecebido)}
          icon={CircleDollarSign}
          tone="success"
        />
        <StatCard
          label="Valor pendente"
          value={formatCurrency(d.valorPendente)}
          icon={TrendingUp}
          tone={d.valorPendente > 0 ? "warning" : "default"}
        />
      </div>

      {/* Seções */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Ações de hoje */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Ações de hoje</CardTitle>
            <Link
              href="/followups"
              className="text-sm text-primary hover:underline"
            >
              Ver tudo
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.acoesHoje.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Tudo em dia!"
                description="Nenhum follow-up pendente para hoje."
              />
            ) : (
              d.acoesHoje.map((f) => (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0">
                    <Link
                      href={f.lead ? `/leads/${f.lead.id}` : "/followups"}
                      className="block truncate font-medium hover:underline"
                    >
                      {f.titulo}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      {f.lead?.nome_cliente ?? "—"} ·{" "}
                      {isOverdue(f.data_vencimento) ? (
                        <span className="text-destructive">
                          Atrasado ({formatDate(f.data_vencimento)})
                        </span>
                      ) : (
                        `Vence ${formatDate(f.data_vencimento)}`
                      )}
                    </p>
                  </div>
                  <CompleteFollowupButton id={f.id} />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Clientes sem resposta */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Clientes sem resposta</CardTitle>
            <Link
              href="/leads"
              className="text-sm text-primary hover:underline"
            >
              Ver leads
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.clientesSemResposta.length === 0 ? (
              <EmptyState
                title="Nenhum cliente aguardando"
                description="Leads aguardando retorno aparecem aqui."
              />
            ) : (
              d.clientesSemResposta.map((lead) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{lead.nome_cliente}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {lead.company?.name ?? "—"}
                      {lead.valor_estimado
                        ? ` · ${formatCurrency(lead.valor_estimado)}`
                        : ""}
                    </p>
                  </div>
                  <LeadStatusBadge status={lead.status} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Próximos eventos */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Próximos eventos</CardTitle>
            <Link
              href="/eventos"
              className="text-sm text-primary hover:underline"
            >
              Ver agenda
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.proximosEventos.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="Sem eventos próximos"
                description="Eventos dos próximos 30 dias aparecem aqui."
              />
            ) : (
              d.proximosEventos.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/eventos/${ev.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{ev.nome_cliente}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(ev.data_evento)} · {ev.company?.name ?? "—"}
                    </p>
                  </div>
                  <EventStatusBadge status={ev.status_evento} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pagamentos pendentes */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Pagamentos pendentes</CardTitle>
            <Link
              href="/financeiro"
              className="text-sm text-primary hover:underline"
            >
              Financeiro
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {d.pagamentosPendentes.length === 0 ? (
              <EmptyState
                icon={CircleDollarSign}
                title="Nenhum pagamento pendente"
                description="Eventos com saldo a receber aparecem aqui."
              />
            ) : (
              d.pagamentosPendentes.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/eventos/${ev.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{ev.nome_cliente}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      Restante:{" "}
                      <span className="font-medium text-warning-foreground">
                        {formatCurrency(ev.valor_restante)}
                      </span>{" "}
                      · {formatDate(ev.data_evento)}
                    </p>
                  </div>
                  <PaymentStatusBadge status={ev.status_pagamento} />
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-center pt-2">
        <Link
          href="/relatorios"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          Ver relatórios completos <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
