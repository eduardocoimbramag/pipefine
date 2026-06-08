"use client";

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";
import type { FinanceSummary } from "@/lib/queries/finance";

const COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const compact = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);

function TooltipBox({
  active,
  payload,
  label,
  money = true,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color?: string }[];
  label?: string;
  money?: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-card p-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: {money ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

export function FaturamentoPorMesChart({
  data,
}: {
  data: FinanceSummary["porMes"];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ left: -10, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
        <YAxis
          tickFormatter={compact}
          tick={{ fontSize: 12 }}
          stroke="var(--muted-foreground)"
        />
        <Tooltip content={<TooltipBox />} />
        <Line
          type="monotone"
          dataKey="faturamento"
          name="Faturamento"
          stroke="var(--chart-1)"
          strokeWidth={2.5}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function EventosPorMesChart({
  data,
}: {
  data: FinanceSummary["porMes"];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ left: -20, right: 8, top: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--muted-foreground)" />
        <Tooltip content={<TooltipBox money={false} />} />
        <Bar
          dataKey="eventos"
          name="Eventos"
          fill="var(--chart-2)"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function FaturamentoPorEmpresaChart({
  data,
}: {
  data: FinanceSummary["porEmpresa"];
}) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ left: 10, right: 16, top: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
        <XAxis
          type="number"
          tickFormatter={compact}
          tick={{ fontSize: 12 }}
          stroke="var(--muted-foreground)"
        />
        <YAxis
          type="category"
          dataKey="empresa"
          width={100}
          tick={{ fontSize: 12 }}
          stroke="var(--muted-foreground)"
        />
        <Tooltip content={<TooltipBox />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="faturamento" name="Faturamento" radius={[0, 4, 4, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RecebidoVsPendenteChart({
  data,
}: {
  data: FinanceSummary["recebidoVsPendente"];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        Sem dados no período.
      </div>
    );
  }
  const pieColors = ["var(--chart-2)", "var(--chart-4)"];
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={pieColors[i % pieColors.length]} />
          ))}
        </Pie>
        <Tooltip content={<TooltipBox />} />
        <Legend
          formatter={(value) => (
            <span className="text-xs text-muted-foreground">{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
