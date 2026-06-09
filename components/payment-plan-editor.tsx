"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/form/field";
import { formatCurrency, cn } from "@/lib/utils";
import { todayISO } from "@/lib/date";
import {
  generateInstallments,
  suggestNumeroParcelas,
  splitEqually,
  type GeneratedInstallment,
} from "@/lib/installments";
import {
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_DESCRIPTIONS,
  type PaymentMethod,
} from "@/types";

export interface PaymentPlanValue {
  method: PaymentMethod;
  installments: GeneratedInstallment[];
}

/**
 * Editor de forma de pagamento + cronograma de parcelas.
 *
 * Emite o valor via onChange; o formulário que o usa deve gravar
 * `method` no campo `payment_method` e `installments` (JSON) no campo
 * `installments`.
 */
export function PaymentPlanEditor({
  valorTotal,
  dataEvento,
  value,
  onChange,
  initialMethod = "total",
  initialInstallments,
}: {
  valorTotal: number;
  dataEvento: string;
  value?: PaymentPlanValue;
  onChange: (v: PaymentPlanValue) => void;
  initialMethod?: PaymentMethod;
  initialInstallments?: GeneratedInstallment[];
}) {
  const hoje = todayISO();
  const [method, setMethod] = useState<PaymentMethod>(
    value?.method ?? initialMethod,
  );

  // Parâmetros do parcelamento
  const [primeiraParcela, setPrimeiraParcela] = useState(hoje);
  const [numeroParcelas, setNumeroParcelas] = useState(() =>
    initialMethod === "parcelado"
      ? suggestNumeroParcelas(hoje, dataEvento)
      : 1,
  );

  // Inicializa as parcelas: usa as existentes (edição) ou gera pela forma.
  const [installments, setInstallments] = useState<GeneratedInstallment[]>(
    () => {
      const existentes = value?.installments ?? initialInstallments;
      if (existentes?.length) return existentes;
      return generateInstallments({
        method: initialMethod,
        valorTotal,
        dataEvento,
        hoje,
        primeiraParcela: hoje,
        numeroParcelas:
          initialMethod === "parcelado"
            ? suggestNumeroParcelas(hoje, dataEvento)
            : 1,
      });
    },
  );

  // Quando o valor total muda nas formas automáticas (total / 50-50),
  // recalcula as parcelas durante a renderização (padrão recomendado do React
  // para ajustar estado a partir de props, sem useEffect).
  const [lastTotal, setLastTotal] = useState(valorTotal);
  if (
    valorTotal !== lastTotal &&
    (method === "total" || method === "entrada_50_50")
  ) {
    setLastTotal(valorTotal);
    const gen = generateInstallments({
      method,
      valorTotal,
      dataEvento,
      hoje,
      primeiraParcela,
      numeroParcelas,
    });
    setInstallments(gen);
    onChange({ method, installments: gen });
  } else if (valorTotal !== lastTotal) {
    setLastTotal(valorTotal);
  }

  // (Re)gera as parcelas quando muda a forma, o total ou os parâmetros.
  function regenerate(
    m: PaymentMethod,
    opts?: { primeira?: string; n?: number },
  ) {
    const gen = generateInstallments({
      method: m,
      valorTotal,
      dataEvento,
      hoje,
      primeiraParcela: opts?.primeira ?? primeiraParcela,
      numeroParcelas: opts?.n ?? numeroParcelas,
    });
    setInstallments(gen);
    onChange({ method: m, installments: gen });
  }

  function changeMethod(m: PaymentMethod) {
    setMethod(m);
    if (m === "parcelado") {
      const n = suggestNumeroParcelas(primeiraParcela, dataEvento);
      setNumeroParcelas(n);
      regenerate("parcelado", { n });
    } else {
      regenerate(m);
    }
  }

  function updateRow(
    idx: number,
    patch: Partial<GeneratedInstallment>,
  ) {
    const next = installments.map((it, i) =>
      i === idx ? { ...it, ...patch } : it,
    );
    setInstallments(next);
    onChange({ method, installments: next });
  }

  function addRow() {
    const last = installments[installments.length - 1];
    const next = [
      ...installments,
      {
        numero: installments.length + 1,
        data_vencimento: last?.data_vencimento ?? dataEvento ?? hoje,
        valor: 0,
      },
    ];
    setInstallments(next);
    onChange({ method, installments: next });
  }

  function removeRow(idx: number) {
    const next = installments
      .filter((_, i) => i !== idx)
      .map((it, i) => ({ ...it, numero: i + 1 }));
    setInstallments(next);
    onChange({ method, installments: next });
  }

  function distribuirIgual() {
    const valores = splitEqually(valorTotal, installments.length);
    const next = installments.map((it, i) => ({ ...it, valor: valores[i] }));
    setInstallments(next);
    onChange({ method, installments: next });
  }

  const somaParcelas = useMemo(
    () =>
      Math.round(
        installments.reduce((s, i) => s + (Number(i.valor) || 0), 0) * 100,
      ) / 100,
    [installments],
  );
  const diferenca = Math.round((valorTotal - somaParcelas) * 100) / 100;

  return (
    <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
      <Field label="Forma de pagamento">
        <Select value={method} onValueChange={(v) => changeMethod(v as PaymentMethod)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {PAYMENT_METHOD_LABELS[m]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <p className="text-xs text-muted-foreground">
        {PAYMENT_METHOD_DESCRIPTIONS[method]}
      </p>

      {method === "parcelado" && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="1ª parcela em" htmlFor="primeira_parcela">
            <Input
              id="primeira_parcela"
              type="date"
              value={primeiraParcela}
              onChange={(e) => {
                setPrimeiraParcela(e.target.value);
                regenerate("parcelado", { primeira: e.target.value });
              }}
            />
          </Field>
          <Field label="Nº de parcelas" htmlFor="numero_parcelas">
            <Input
              id="numero_parcelas"
              type="number"
              min={1}
              value={numeroParcelas}
              onChange={(e) => {
                const n = Math.max(1, Number(e.target.value) || 1);
                setNumeroParcelas(n);
                regenerate("parcelado", { n });
              }}
            />
          </Field>
        </div>
      )}

      {/* Cronograma editável */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">
            Cronograma ({installments.length} parcela
            {installments.length !== 1 ? "s" : ""})
          </p>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={distribuirIgual}
            >
              Dividir igual
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4" /> Parcela
            </Button>
          </div>
        </div>

        <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
          {installments.map((it, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <span className="w-6 shrink-0 text-center text-xs text-muted-foreground">
                {idx + 1}
              </span>
              <Input
                type="date"
                value={it.data_vencimento}
                onChange={(e) =>
                  updateRow(idx, { data_vencimento: e.target.value })
                }
                className="h-8"
              />
              <Input
                type="number"
                step="0.01"
                min={0}
                value={it.valor}
                onChange={(e) =>
                  updateRow(idx, { valor: Number(e.target.value) || 0 })
                }
                className="h-8 w-28"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => removeRow(idx)}
                aria-label="Remover parcela"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        {/* Conferência da soma */}
        <div
          className={cn(
            "flex items-center justify-between rounded-md px-3 py-2 text-sm",
            Math.abs(diferenca) < 0.01
              ? "bg-success/10 text-success"
              : "bg-warning/15 text-warning-foreground",
          )}
        >
          <span>
            Soma das parcelas: {formatCurrency(somaParcelas)} de{" "}
            {formatCurrency(valorTotal)}
          </span>
          {Math.abs(diferenca) >= 0.01 && (
            <span className="flex items-center gap-1 font-medium">
              <AlertTriangle className="h-4 w-4" />
              {diferenca > 0 ? "Falta " : "Excede "}
              {formatCurrency(Math.abs(diferenca))}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
