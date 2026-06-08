import { Badge } from "@/components/ui/badge";
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_TONE,
  EVENT_STATUS_LABELS,
  EVENT_STATUS_TONE,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_TONE,
  FOLLOWUP_STATUS_LABELS,
  type LeadStatus,
  type EventStatus,
  type PaymentStatus,
  type FollowupStatus,
  type BadgeTone,
} from "@/types/enums";

export function LeadStatusBadge({ status }: { status: LeadStatus }) {
  return (
    <Badge tone={LEAD_STATUS_TONE[status]}>{LEAD_STATUS_LABELS[status]}</Badge>
  );
}

export function EventStatusBadge({ status }: { status: EventStatus }) {
  return (
    <Badge tone={EVENT_STATUS_TONE[status]}>
      {EVENT_STATUS_LABELS[status]}
    </Badge>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  return (
    <Badge tone={PAYMENT_STATUS_TONE[status]}>
      {PAYMENT_STATUS_LABELS[status]}
    </Badge>
  );
}

const FOLLOWUP_TONE: Record<FollowupStatus, BadgeTone> = {
  pendente: "info",
  concluido: "success",
  cancelado: "neutral",
};

/** Follow-up vencido e ainda pendente é exibido como "Atrasado". */
export function FollowupStatusBadge({
  status,
  overdue = false,
}: {
  status: FollowupStatus;
  overdue?: boolean;
}) {
  if (overdue && status === "pendente") {
    return <Badge tone="destructive">Atrasado</Badge>;
  }
  return (
    <Badge tone={FOLLOWUP_TONE[status]}>{FOLLOWUP_STATUS_LABELS[status]}</Badge>
  );
}
