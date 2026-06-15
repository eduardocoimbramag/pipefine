import Link from "next/link";
import {
  HandCoins,
  CircleDollarSign,
  AlarmClock,
  CalendarClock,
} from "lucide-react";
import {
  getRecebimentosSummary,
  type InstallmentWithEvent,
} from "@/lib/queries/recebimentos";
import { getActiveCompanyContext } from "@/lib/active-company";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { formatDate, formatMonthYear, isOverdue } from "@/lib/date";
import { ConfirmPaymentButton } from "./confirm-payment-button";

export const metadata = { title: "Acompanhamento de recebimentos — Pipefine" };
export const dynamic = "force-dynamic";

function InstallmentsTable({
  installments,
  showAtraso,
}: {
  installments: InstallmentWithEvent[];
  /** Exibe o destaque "em atraso" na data (usado no quadro de atrasados). */
  showAtraso?: boolean;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Cliente</TableHead>
            <TableHead className="hidden sm:table-cell">Parcela</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Valor</TableHead>
            <TableHead className="text-right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {installments.map((p) => {
            const atrasada = !p.pago && isOverdue(p.data_vencimento);
            return (
              <TableRow key={p.id}>
                <TableCell>
                  {p.event ? (
                    <Link
                      href={`/eventos/${p.event.id}`}
                      className="font-medium hover:underline"
                    >
                      {p.event.nome_cliente}
                    </Link>
                  ) : (
                    <span className="font-medium">—</span>
                  )}
                  <span className="block text-xs text-muted-foreground sm:hidden">
                    {p.numero}ª parcela
                  </span>
                </TableCell>
                <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                  {p.numero}ª
                </TableCell>
                <TableCell className="text-sm">
                  <span
                    className={
                      showAtraso && atrasada
                        ? "font-medium text-destructive"
                        : ""
                    }
                  >
                    {formatDate(p.data_vencimento)}
                  </span>
                  {p.pago && (
                    <span className="block text-xs text-success">paga</span>
                  )}
                </TableCell>
                <TableCell className="text-sm font-medium">
                  {formatCurrency(Number(p.valor))}
                </TableCell>
                <TableCell className="text-right">
                  {p.event && (
                    <ConfirmPaymentButton
                      installmentId={p.id}
                      eventId={p.event.id}
                      pago={p.pago}
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

export default async function RecebimentosPage() {
  const { activeCompanyId, activeCompany } = await getActiveCompanyContext();

  const summary = await getRecebimentosSummary(activeCompanyId ?? undefined);

  const mesLabel = formatMonthYear(new Date());

  return (
    <div className="space-y-6">
      <PageHeader
        title="Acompanhamento de recebimentos"
        description={
          activeCompany
            ? `${activeCompany.name} · parcelas a receber e recebidas`
            : "Parcelas a receber, recebidas e em atraso."
        }
      />

      {/* Métricas */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label={`Valor a receber (${mesLabel})`}
          value={formatCurrency(summary.aReceberMes)}
          icon={HandCoins}
          tone="primary"
        />
        <StatCard
          label={`Valor recebido (${mesLabel})`}
          value={formatCurrency(summary.recebidoMes)}
          icon={CircleDollarSign}
          tone="success"
        />
        <StatCard
          label="Valor atrasado"
          value={formatCurrency(summary.atrasado)}
          icon={AlarmClock}
          tone={summary.atrasado > 0 ? "destructive" : "default"}
        />
      </div>

      {/* Parcelas atrasadas */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <AlarmClock className="h-4 w-4" />
          Parcelas atrasadas
          <span className="text-xs">({summary.atrasadas.length})</span>
        </div>
        {summary.atrasadas.length === 0 ? (
          <EmptyState
            icon={AlarmClock}
            title="Nenhuma parcela atrasada"
            description="Todas as parcelas vencidas estão quitadas."
          />
        ) : (
          <InstallmentsTable installments={summary.atrasadas} showAtraso />
        )}
      </section>

      {/* Parcelas do mês vigente */}
      <section className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <CalendarClock className="h-4 w-4" />
          Parcelas do mês ({mesLabel})
          <span className="text-xs">({summary.doMes.length})</span>
        </div>
        {summary.doMes.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Nenhuma parcela neste mês"
            description="Não há parcelas com vencimento no mês vigente."
          />
        ) : (
          <InstallmentsTable installments={summary.doMes} />
        )}
      </section>
    </div>
  );
}
