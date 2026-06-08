import Link from "next/link";
import { Users, Target, FileText, Trophy } from "lucide-react";
import { getReportsData } from "@/lib/queries/reports";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  LeadsPorOrigemChart,
  EventosPorMesReportChart,
} from "./report-charts";
import { getActiveCompanyContext } from "@/lib/active-company";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export const metadata = { title: "Relatórios — Pipefine" };
export const dynamic = "force-dynamic";

export default async function RelatoriosPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const sp = await searchParams;
  const currentYear = new Date().getFullYear();
  const year = sp.year ? Number(sp.year) : currentYear;
  const years = [currentYear, currentYear - 1, currentYear - 2];

  const { activeCompanyId, activeCompany } = await getActiveCompanyContext();
  const r = await getReportsData(year, activeCompanyId ?? undefined);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relatórios"
        description={`${activeCompany ? activeCompany.name + " · " : ""}Indicadores de ${year}`}
      >
        <div className="flex gap-1">
          {years.map((y) => (
            <Link
              key={y}
              href={`/relatorios?year=${y}`}
              className={cn(
                "rounded-md border px-3 py-1.5 text-sm font-medium",
                y === year
                  ? "border-primary bg-primary/10 text-primary"
                  : "bg-card hover:bg-muted/50",
              )}
            >
              {y}
            </Link>
          ))}
        </div>
      </PageHeader>

      {/* Indicadores principais */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total de leads" value={r.totalLeads} icon={Users} tone="primary" />
        <StatCard
          label="Taxa de conversão"
          value={`${r.taxaConversao.toFixed(1)}%`}
          icon={Target}
          tone="success"
          hint={`${r.leadsFechados} fechados`}
        />
        <StatCard
          label="Orçamentos enviados"
          value={r.orcamentosEnviados}
          icon={FileText}
          tone="purple"
        />
        <StatCard
          label={`Faturamento ${year}`}
          value={formatCurrency(r.faturamentoAnual)}
          icon={Trophy}
          tone="primary"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Leads por origem</CardTitle>
          </CardHeader>
          <CardContent>
            <LeadsPorOrigemChart data={r.leadsPorOrigem} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Eventos por mês</CardTitle>
          </CardHeader>
          <CardContent>
            <EventosPorMesReportChart data={r.eventosPorMes} />
          </CardContent>
        </Card>

        {/* Empresas com maior faturamento + ticket médio */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Faturamento por empresa</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {r.empresasFaturamento.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Sem eventos no período.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead className="text-right">Eventos</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">Ticket médio</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {r.empresasFaturamento.map((e) => (
                    <TableRow key={e.empresa}>
                      <TableCell className="font-medium">{e.empresa}</TableCell>
                      <TableCell className="text-right">{e.eventos}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(e.faturamento)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(e.ticketMedio)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Motivos de perda */}
        <Card>
          <CardHeader>
            <CardTitle>Motivos de perda</CardTitle>
          </CardHeader>
          <CardContent>
            {r.motivosPerda.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Nenhum lead perdido. 🎉
              </p>
            ) : (
              <ul className="space-y-2">
                {r.motivosPerda.map((m) => (
                  <li
                    key={m.motivo}
                    className="flex items-center justify-between rounded-lg border p-2.5 text-sm"
                  >
                    <span>{m.motivo}</span>
                    <span className="font-semibold">{m.total}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Resumo do funil */}
        <Card>
          <CardHeader>
            <CardTitle>Funil de vendas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <FunnelRow label="Total de leads" value={r.totalLeads} max={r.totalLeads} />
            <FunnelRow
              label="Orçamentos enviados"
              value={r.orcamentosEnviados}
              max={r.totalLeads}
            />
            <FunnelRow
              label="Fechados"
              value={r.leadsFechados}
              max={r.totalLeads}
              tone="success"
            />
            <FunnelRow
              label="Perdidos"
              value={r.leadsPerdidos}
              max={r.totalLeads}
              tone="destructive"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function FunnelRow({
  label,
  value,
  max,
  tone = "primary",
}: {
  label: string;
  value: number;
  max: number;
  tone?: "primary" | "success" | "destructive";
}) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  const barColor = {
    primary: "bg-primary",
    success: "bg-success",
    destructive: "bg-destructive",
  }[tone];
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
