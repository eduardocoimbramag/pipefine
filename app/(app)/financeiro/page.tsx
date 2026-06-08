import {
  Wallet,
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  Receipt,
  CalendarCheck,
} from "lucide-react";
import { getFinanceSummary } from "@/lib/queries/finance";
import { getCompanies } from "@/lib/queries/shared";
import { getActiveCompanyContext } from "@/lib/active-company";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FinanceFilters } from "./finance-filters";
import {
  FaturamentoPorMesChart,
  EventosPorMesChart,
  FaturamentoPorEmpresaChart,
  RecebidoVsPendenteChart,
} from "./finance-charts";
import { formatCurrency } from "@/lib/utils";

export const metadata = { title: "Financeiro — Pipefine" };
export const dynamic = "force-dynamic";

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; company?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = sp.year ? Number(sp.year) : currentYear;
  const years = [currentYear, currentYear - 1, currentYear - 2];

  const { activeCompanyId, activeCompany } = await getActiveCompanyContext();
  const effectiveCompanyId = activeCompanyId ?? sp.company;

  const [summary, companies] = await Promise.all([
    getFinanceSummary(year, effectiveCompanyId, sp.month),
    getCompanies(),
  ]);

  const variacao =
    summary.faturamentoMesAnterior > 0
      ? ((summary.faturamentoMes - summary.faturamentoMesAnterior) /
          summary.faturamentoMesAnterior) *
        100
      : null;
  const subiu = (variacao ?? 0) >= 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description={
          activeCompany
            ? `${activeCompany.name} · controle de faturamento e recebimentos`
            : "Controle manual de faturamento e recebimentos."
        }
      />

      <FinanceFilters
        companies={companies}
        currentYear={currentYear}
        years={years}
        lockCompany={activeCompanyId !== null}
      />

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Faturamento do mês"
          value={formatCurrency(summary.faturamentoMes)}
          icon={Wallet}
          tone="primary"
          hint={
            variacao !== null
              ? `${subiu ? "+" : ""}${variacao.toFixed(0)}% vs. mês anterior`
              : "Sem base de comparação"
          }
        />
        <StatCard
          label="Valor recebido"
          value={formatCurrency(summary.valorRecebido)}
          icon={CircleDollarSign}
          tone="success"
        />
        <StatCard
          label="Valor pendente"
          value={formatCurrency(summary.valorPendente)}
          icon={summary.valorPendente > 0 ? TrendingUp : TrendingDown}
          tone={summary.valorPendente > 0 ? "warning" : "default"}
        />
        <StatCard
          label="Ticket médio"
          value={formatCurrency(summary.ticketMedio)}
          icon={Receipt}
          tone="purple"
        />
        <StatCard
          label="Eventos no ano"
          value={summary.eventosFechados}
          icon={CalendarCheck}
          tone="default"
        />
        <StatCard
          label={`Faturamento ${year}`}
          value={formatCurrency(summary.faturamentoAno)}
          icon={Wallet}
          tone="primary"
        />
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Faturamento por mês ({year})</CardTitle>
          </CardHeader>
          <CardContent>
            <FaturamentoPorMesChart data={summary.porMes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eventos por mês ({year})</CardTitle>
          </CardHeader>
          <CardContent>
            <EventosPorMesChart data={summary.porMes} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Faturamento por empresa</CardTitle>
          </CardHeader>
          <CardContent>
            {summary.porEmpresa.length === 0 ? (
              <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
                Sem dados no período.
              </div>
            ) : (
              <FaturamentoPorEmpresaChart data={summary.porEmpresa} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recebido x Pendente (mês ref.)</CardTitle>
          </CardHeader>
          <CardContent>
            <RecebidoVsPendenteChart data={summary.recebidoVsPendente} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
