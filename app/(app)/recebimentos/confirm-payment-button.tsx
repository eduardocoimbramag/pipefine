"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Circle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { toggleInstallmentPaid } from "@/app/actions/events";

/**
 * Confirma (ou reabre) o pagamento de uma parcela diretamente da tela de
 * acompanhamento de recebimentos. Reaproveita a action toggleInstallmentPaid,
 * que recalcula os totais do evento e revalida as telas afetadas.
 */
export function ConfirmPaymentButton({
  installmentId,
  eventId,
  pago,
}: {
  installmentId: string;
  eventId: string;
  pago: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      size="sm"
      variant={pago ? "outline" : "success"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await toggleInstallmentPaid(installmentId, eventId, !pago);
          if (res.ok) {
            toast.success(res.message ?? "Atualizado");
            router.refresh();
          } else {
            toast.error(res.error);
          }
        })
      }
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : pago ? (
        <Circle className="h-4 w-4" />
      ) : (
        <Check className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">
        {pago ? "Reabrir" : "Confirmar pagamento"}
      </span>
    </Button>
  );
}
