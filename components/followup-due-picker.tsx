"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/form/field";
import { addDaysISO } from "@/lib/date";

const QUICK_DAYS = [1, 2, 3, 7];

/**
 * Seletor PADRÃO de vencimento de follow-up, usado em todo o sistema:
 * botões rápidos (+1d, +2d, +3d, +7d a partir de hoje) E campo de data
 * específica — os dois sincronizados (o botão preenche a data; digitar uma
 * data destaca o botão correspondente, se houver).
 */
export function FollowupDuePicker({
  value,
  onChange,
  label = "Vencimento",
  required,
  id = "followup_due",
}: {
  value: string;
  onChange: (date: string) => void;
  label?: string;
  required?: boolean;
  id?: string;
}) {
  return (
    <Field label={label} htmlFor={id} required={required}>
      <div className="space-y-2">
        <div className="flex gap-2">
          {QUICK_DAYS.map((d) => {
            const date = addDaysISO(d);
            const active = value === date;
            return (
              <Button
                key={d}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                className="flex-1"
                onClick={() => onChange(date)}
              >
                +{d}d
              </Button>
            );
          })}
        </div>
        <Input
          id={id}
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </div>
    </Field>
  );
}
