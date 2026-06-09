"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Circle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleInstallmentPaid } from "@/app/actions/events";
import { formatCurrency, cn } from "@/lib/utils";
import { formatDate, isOverdue } from "@/lib/date";
import {
  PAYMENT_METHOD_LABELS,
  type PaymentInstallment,
  type PaymentMethod,
} from "@/types";

export function InstallmentsList({
  eventId,
  method,
  installments,
}: {
  eventId: string;
  method: PaymentMethod | null;
  installments: PaymentInstallment[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function toggle(id: string, pago: boolean) {
    start(async () => {
      const res = await toggleInstallmentPaid(id, eventId, pago);
      if (res.ok) {
        toast.success(res.message ?? "Atualizado");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  if (installments.length === 0) {
    return (
      <p className="py-4 text-center text-sm text-muted-foreground">
        Nenhuma parcela cadastrada. Edite o evento para definir a forma de
        pagamento.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {method && (
        <p className="text-xs text-muted-foreground">
          {PAYMENT_METHOD_LABELS[method]}
        </p>
      )}
      {installments.map((p) => {
        const venceuPendente = !p.pago && isOverdue(p.data_vencimento);
        return (
          <div
            key={p.id}
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg border p-3",
              p.pago && "bg-success/5",
            )}
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {p.numero}ª · {formatCurrency(Number(p.valor))}
              </p>
              <p
                className={cn(
                  "text-xs",
                  venceuPendente
                    ? "font-medium text-destructive"
                    : "text-muted-foreground",
                )}
              >
                Vence {formatDate(p.data_vencimento)}
                {venceuPendente && " · em atraso"}
                {p.pago && " · paga"}
              </p>
            </div>
            <Button
              size="sm"
              variant={p.pago ? "outline" : "success"}
              disabled={pending}
              onClick={() => toggle(p.id, !p.pago)}
            >
              {pending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : p.pago ? (
                <Circle className="h-4 w-4" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {p.pago ? "Reabrir" : "Marcar paga"}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
