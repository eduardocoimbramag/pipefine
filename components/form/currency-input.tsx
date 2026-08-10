"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn, moneyToFormValue, roundMoney, toNumberOrNull } from "@/lib/utils";

const DECIMAL_FORMAT = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Limite de dígitos = numeric(12,2) do banco (10 inteiros + 2 centavos). */
const MAX_DIGITOS = 12;

/** Reais → centavos inteiros (1943.5 → 194350). */
function toCents(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.round(Math.abs(value) * 100);
}

/** Centavos inteiros → texto exibido ("194350" → "1.943,50"). */
function formatCents(cents: number): string {
  return DECIMAL_FORMAT.format(cents / 100);
}

/**
 * Campo de valor em Real, com máscara de centavos (padrão dos sistemas
 * brasileiros): o usuário digita só números e eles preenchem da direita para a
 * esquerda — 1 → R$ 0,01 · 194 → R$ 1,94 · 194350 → R$ 1.943,50.
 *
 * Os centavos são sempre fixos (2 casas), então nunca há ambiguidade entre
 * ponto e vírgula. O valor é publicado de duas formas:
 *  - `onValueChange`, em reais, para o estado do formulário;
 *  - um input oculto `name`, no formato de máquina ("1943.50"), para o FormData
 *    lido pelas Server Actions.
 */
export function CurrencyInput({
  value,
  onValueChange,
  name,
  className,
  wrapperClassName,
  disabled,
  ...props
}: {
  /** Valor em reais (ex.: 1943.5). */
  value: number | null | undefined;
  onValueChange: (value: number) => void;
  /** Nome do campo no FormData. Omita em diálogos que montam o FormData à mão. */
  name?: string;
  /** Classes do contêiner — use para largura/layout (o input ocupa 100%). */
  wrapperClassName?: string;
} & Omit<
  React.ComponentProps<"input">,
  "value" | "defaultValue" | "onChange" | "type" | "name"
>) {
  const cents = toCents(value);
  // Zero é exibido como campo vazio (o placeholder mostra "0,00").
  const display = cents === 0 ? "" : formatCents(cents);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digitos = e.target.value.replace(/\D/g, "").slice(0, MAX_DIGITOS);
    onValueChange(digitos ? roundMoney(Number(digitos) / 100) : 0);
  }

  /**
   * Colar um valor já formatado ("R$ 1.943,50", "1943.50") respeita os centavos
   * informados. Sem separador decimal explícito, segue a máscara (só dígitos).
   */
  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const texto = e.clipboardData.getData("text").trim();
    if (!/[.,]\d{1,2}$/.test(texto)) return;
    const n = toNumberOrNull(texto);
    if (n === null) return;
    e.preventDefault();
    onValueChange(roundMoney(Math.abs(n)));
  }

  return (
    <div className={cn("relative", wrapperClassName)}>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 select-none text-sm text-muted-foreground",
          disabled && "opacity-50",
        )}
      >
        R$
      </span>
      <Input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        disabled={disabled}
        value={display}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder={props.placeholder ?? "0,00"}
        className={cn("pl-9 tabular-nums", className)}
      />
      {/* Sempre derivado dos centavos exibidos: o que se vê é o que é enviado. */}
      {name && (
        <input type="hidden" name={name} value={moneyToFormValue(cents / 100)} />
      )}
    </div>
  );
}
