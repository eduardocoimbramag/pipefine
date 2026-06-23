"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { Loader2, XCircle, CalendarClock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/form/field";
import {
  PaymentPlanEditor,
  type PaymentPlanValue,
} from "@/components/payment-plan-editor";
import { FollowupDuePicker } from "@/components/followup-due-picker";
import { updateLeadStatus, markLeadAsPotential } from "@/app/actions/leads";
import { closeLeadAsEvent } from "@/app/actions/events";
import { generateInstallments } from "@/lib/installments";
import { formatCurrency, cn } from "@/lib/utils";
import { formatDate, isOverdue, todayISO, addDaysISO } from "@/lib/date";
import {
  KANBAN_COLUMNS,
  KANBAN_LOST_COLUMN,
  KANBAN_POTENTIAL_COLUMN,
  STATUS_TO_COLUMN,
  COLUMN_DEFAULT_STATUS,
  type LeadWithRelations,
  type LeadStatus,
} from "@/types";

type BoardLeads = Record<string, LeadWithRelations[]>;

/** Distribui os leads nas colunas a partir do status. */
function groupLeads(leads: LeadWithRelations[]): BoardLeads {
  const board: BoardLeads = {};
  for (const col of [
    ...KANBAN_COLUMNS,
    KANBAN_LOST_COLUMN,
    KANBAN_POTENTIAL_COLUMN,
  ])
    board[col.id] = [];
  for (const lead of leads) {
    const colId = STATUS_TO_COLUMN[lead.status] ?? KANBAN_COLUMNS[0].id;
    (board[colId] ??= []).push(lead);
  }
  return board;
}

export function KanbanBoard({ leads }: { leads: LeadWithRelations[] }) {
  const router = useRouter();
  const [board, setBoard] = useState<BoardLeads>(() => groupLeads(leads));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Diálogo de motivo de perda
  const [lossDialog, setLossDialog] = useState<{
    lead: LeadWithRelations;
    fromColumn: string;
  } | null>(null);
  const [motivo, setMotivo] = useState("");
  const [savingLoss, setSavingLoss] = useState(false);

  // Diálogo "Follow-up em quantos dias?" ao mover o card
  const [followupDialog, setFollowupDialog] = useState<{
    lead: LeadWithRelations;
    toColumn: string;
  } | null>(null);
  const [followupDate, setFollowupDate] = useState("");

  // Pop-up de marcação de evento ao mover para "Fechado"
  const [eventDialog, setEventDialog] = useState<{
    lead: LeadWithRelations;
  } | null>(null);
  const [eventForm, setEventForm] = useState({
    data_evento: "",
    valor_total: "",
    local_evento: "",
  });
  const [plan, setPlan] = useState<PaymentPlanValue>({
    method: "total",
    installments: [],
  });
  const [savingEvent, setSavingEvent] = useState(false);

  // Re-sincroniza quando os dados do servidor mudam (inclui a data do
  // follow-up para o card refletir reagendamentos sem mudança de status).
  const leadsKey = useMemo(
    () =>
      leads
        .map((l) => `${l.id}:${l.status}:${l.data_proximo_followup ?? ""}`)
        .join("|"),
    [leads],
  );
  const [lastKey, setLastKey] = useState(leadsKey);
  if (leadsKey !== lastKey) {
    setLastKey(leadsKey);
    setBoard(groupLeads(leads));
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
  );

  const activeLead = useMemo(() => {
    if (!activeId) return null;
    return leads.find((l) => l.id === activeId) ?? null;
  }, [activeId, leads]);

  function findColumnOfLead(id: string): string | null {
    for (const col of Object.keys(board)) {
      if (board[col].some((l) => l.id === id)) return col;
    }
    return null;
  }

  function persistStatus(
    leadId: string,
    status: LeadStatus,
    opts?: { motivoPerda?: string; followupDate?: string },
  ) {
    startTransition(async () => {
      const res = await updateLeadStatus(
        leadId,
        status,
        opts?.motivoPerda,
        opts?.followupDate ?? null,
      );
      if (res.ok) {
        if (opts?.followupDate)
          toast.success(
            `Status atualizado. Follow-up agendado para ${formatDate(opts.followupDate)}.`,
          );
        else if (status === "orcamento_enviado")
          toast.success("Status atualizado. Follow-up criado em 2 dias.");
        else toast.success("Status atualizado.");
        router.refresh();
      } else {
        toast.error(res.error);
        setBoard(groupLeads(leads)); // reverte
      }
    });
  }

  function persistPotential(lead: LeadWithRelations, fromColumn: string) {
    moveCardInState(lead.id, fromColumn, KANBAN_POTENTIAL_COLUMN.id);
    startTransition(async () => {
      const res = await markLeadAsPotential(lead.id);
      if (res.ok) {
        toast.success("Enviado para o Banco de Clientes como potencial.");
        router.refresh();
      } else {
        toast.error(res.error);
        setBoard(groupLeads(leads)); // reverte
      }
    });
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const leadId = String(active.id);
    const fromColumn = findColumnOfLead(leadId);
    // `over.id` pode ser uma coluna ou outro card — resolve para a coluna
    const overId = String(over.id);
    const toColumn = board[overId]
      ? overId
      : (findColumnOfLead(overId) ?? overId);

    if (!fromColumn || !toColumn || fromColumn === toColumn) return;

    const lead = board[fromColumn].find((l) => l.id === leadId);
    if (!lead) return;

    // Mover para Perdido exige motivo → abre diálogo, não move ainda
    if (toColumn === KANBAN_LOST_COLUMN.id) {
      setMotivo(lead.motivo_perda ?? "");
      setLossDialog({ lead, fromColumn });
      return;
    }

    // Mover para "Fechado" abre o pop-up de marcação de evento.
    // Não move ainda — o card sai do funil só ao concluir o pop-up.
    if (toColumn === "fechado") {
      const dataEv = lead.data_evento ?? todayISO();
      const totalEv = lead.valor_estimado ?? 0;
      setPlan({
        method: "total",
        installments: generateInstallments({
          method: "total",
          valorTotal: totalEv,
          dataEvento: dataEv,
          hoje: todayISO(),
        }),
      });
      setEventForm({
        data_evento: dataEv,
        valor_total:
          lead.valor_estimado != null ? String(lead.valor_estimado) : "",
        local_evento: lead.local_evento ?? "",
      });
      setEventDialog({ lead });
      return;
    }

    // Mover para "Potencial": cliente bom que não fechou agora. Ação direta —
    // vira cliente no Banco de Clientes (sem evento) e sai do funil.
    if (toColumn === KANBAN_POTENTIAL_COLUMN.id) {
      persistPotential(lead, fromColumn);
      return;
    }

    // Move otimista (demais colunas)
    moveCardInState(leadId, fromColumn, toColumn);

    // Pergunta o follow-up (com opção de pular). Sugestão: +2 dias.
    setFollowupDate(addDaysISO(2));
    setFollowupDialog({ lead, toColumn });
  }

  function confirmCloseEvent() {
    if (!eventDialog) return;
    const { lead } = eventDialog;

    const fd = new FormData();
    fd.set("data_evento", eventForm.data_evento);
    fd.set("valor_total", eventForm.valor_total);
    fd.set("local_evento", eventForm.local_evento);
    fd.set("payment_method", plan.method);
    fd.set("installments", JSON.stringify(plan.installments));

    setSavingEvent(true);
    startTransition(async () => {
      const res = await closeLeadAsEvent(lead.id, fd);
      setSavingEvent(false);
      if (res.ok) {
        toast.success("Lead fechado! Evento criado e cliente cadastrado.");
        setEventDialog(null);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  }

  function confirmFollowup(withFollowup: boolean) {
    if (!followupDialog) return;
    const { lead, toColumn } = followupDialog;
    const status = COLUMN_DEFAULT_STATUS[toColumn];

    if (withFollowup && !followupDate) {
      toast.error("Escolha a data do follow-up.");
      return;
    }

    // Fecha o diálogo na hora (salvamento otimista em segundo plano); o guard
    // `if (!followupDialog) return` acima evita disparo duplicado.
    setFollowupDialog(null);
    persistStatus(lead.id, status, {
      followupDate: withFollowup ? followupDate : undefined,
    });
  }

  function moveCardInState(leadId: string, from: string, to: string) {
    setBoard((prev) => {
      const lead = prev[from].find((l) => l.id === leadId);
      if (!lead) return prev;
      return {
        ...prev,
        [from]: prev[from].filter((l) => l.id !== leadId),
        [to]: [{ ...lead }, ...prev[to]],
      };
    });
  }

  function confirmLoss() {
    if (!lossDialog) return;
    setSavingLoss(true);
    const { lead, fromColumn } = lossDialog;
    moveCardInState(lead.id, fromColumn, KANBAN_LOST_COLUMN.id);
    startTransition(async () => {
      const res = await updateLeadStatus(lead.id, "perdido", motivo);
      setSavingLoss(false);
      if (res.ok) {
        toast.success("Lead marcado como perdido.");
        setLossDialog(null);
        setMotivo("");
        router.refresh();
      } else {
        toast.error(res.error);
        setBoard(groupLeads(leads));
        setLossDialog(null);
      }
    });
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-start gap-3 overflow-x-auto pb-2">
        {KANBAN_COLUMNS.map((col) => (
          <Column
            key={col.id}
            id={col.id}
            label={col.label}
            tone={col.tone}
            count={board[col.id]?.length ?? 0}
          >
            {board[col.id]?.map((lead) => (
              <KanbanCard key={lead.id} lead={lead} />
            ))}
          </Column>
        ))}

        {/* Coluna de descarte */}
        <Column
          id={KANBAN_LOST_COLUMN.id}
          label={KANBAN_LOST_COLUMN.label}
          tone={KANBAN_LOST_COLUMN.tone}
          count={board[KANBAN_LOST_COLUMN.id]?.length ?? 0}
          muted
        >
          {board[KANBAN_LOST_COLUMN.id]?.map((lead) => (
            <KanbanCard key={lead.id} lead={lead} />
          ))}
        </Column>

        {/* Coluna "Potencial": clientes bons que não fecharam agora →
            vão para o Banco de Clientes (sem evento). */}
        <Column
          id={KANBAN_POTENTIAL_COLUMN.id}
          label={KANBAN_POTENTIAL_COLUMN.label}
          tone={KANBAN_POTENTIAL_COLUMN.tone}
          count={board[KANBAN_POTENTIAL_COLUMN.id]?.length ?? 0}
          badgeClassName="text-warning"
          muted
        >
          {board[KANBAN_POTENTIAL_COLUMN.id]?.map((lead) => (
            <KanbanCard key={lead.id} lead={lead} />
          ))}
        </Column>
      </div>

      <DragOverlay>
        {activeLead ? <KanbanCard lead={activeLead} overlay /> : null}
      </DragOverlay>

      {/* Diálogo de motivo de perda */}
      <Dialog
        open={!!lossDialog}
        onOpenChange={(o) => {
          if (!o && !savingLoss) {
            setLossDialog(null);
            setMotivo("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" /> Marcar como
              perdido
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {lossDialog?.lead.nome_cliente}
          </p>
          <Field label="Motivo da perda" htmlFor="motivo_perda">
            <Textarea
              id="motivo_perda"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex.: preço, data indisponível, escolheu concorrente..."
              rows={3}
              autoFocus
            />
          </Field>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setLossDialog(null);
                setMotivo("");
              }}
              disabled={savingLoss}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmLoss}
              disabled={savingLoss}
            >
              {savingLoss && <Loader2 className="h-4 w-4 animate-spin" />}
              Marcar perdido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo: agendar follow-up ao mover o card */}
      <Dialog
        open={!!followupDialog}
        onOpenChange={(o) => {
          if (!o) {
            // Fechar pelo X/ESC = pular (mantém o status já alterado de forma otimista)
            confirmFollowup(false);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" /> Agendar
              follow-up
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {followupDialog?.lead.nome_cliente}
          </p>

          <FollowupDuePicker
            value={followupDate}
            onChange={setFollowupDate}
            label="Data do follow-up"
            id="kanban_followup_due"
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => confirmFollowup(false)}>
              Pular
            </Button>
            <Button onClick={() => confirmFollowup(true)}>
              Criar follow-up
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pop-up: marcar evento ao fechar o lead */}
      <Dialog
        open={!!eventDialog}
        onOpenChange={(o) => {
          if (!o && !savingEvent) setEventDialog(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-success" /> Fechar lead — novo
              evento
            </DialogTitle>
            <DialogDescription>
              {eventDialog?.lead.nome_cliente}
              {eventDialog?.lead.company?.name
                ? ` · ${eventDialog.lead.company.name}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Data do evento" htmlFor="ev_data" required>
              <Input
                id="ev_data"
                type="date"
                value={eventForm.data_evento}
                onChange={(e) =>
                  setEventForm((f) => ({ ...f, data_evento: e.target.value }))
                }
              />
            </Field>
            <Field label="Local" htmlFor="ev_local">
              <Input
                id="ev_local"
                value={eventForm.local_evento}
                onChange={(e) =>
                  setEventForm((f) => ({ ...f, local_evento: e.target.value }))
                }
              />
            </Field>
            <Field label="Valor total (R$)" htmlFor="ev_total">
              <Input
                id="ev_total"
                type="number"
                step="0.01"
                min={0}
                value={eventForm.valor_total}
                onChange={(e) =>
                  setEventForm((f) => ({ ...f, valor_total: e.target.value }))
                }
              />
            </Field>
          </div>

          {/* Forma de pagamento + parcelas */}
          <PaymentPlanEditor
            valorTotal={Number(eventForm.valor_total) || 0}
            dataEvento={eventForm.data_evento}
            onChange={setPlan}
            initialMethod="total"
          />

          <p className="text-xs text-muted-foreground">
            O faturamento entra no mês da data do evento. As parcelas marcadas
            como pagas viram o valor recebido. Após confirmar, o lead sai do
            funil e vai para o Banco de Clientes.
          </p>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEventDialog(null)}
              disabled={savingEvent}
            >
              Cancelar
            </Button>
            <Button
              variant="success"
              onClick={confirmCloseEvent}
              disabled={savingEvent || !eventForm.data_evento}
            >
              {savingEvent && <Loader2 className="h-4 w-4 animate-spin" />}
              Fechar e criar evento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}

/** Coluna droppable. */
function Column({
  id,
  label,
  tone,
  count,
  muted,
  badgeClassName,
  children,
}: {
  id: string;
  label: string;
  tone: React.ComponentProps<typeof Badge>["tone"];
  count: number;
  muted?: boolean;
  /** Classe extra para o badge de contagem (ex.: cor do número da coluna). */
  badgeClassName?: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-64 shrink-0 flex-col rounded-xl border bg-muted/30 transition-colors",
        isOver && "border-primary bg-primary/5 ring-2 ring-primary/30",
        muted && "bg-muted/10",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{label}</span>
          <Badge tone={tone} className={badgeClassName}>
            {count}
          </Badge>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 p-1.5">
        {children}
        {count === 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            Solte um lead aqui
          </p>
        )}
      </div>
    </div>
  );
}

/** Card de lead arrastável. */
function KanbanCard({
  lead,
  overlay,
}: {
  lead: LeadWithRelations;
  overlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: lead.id });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  const followupOverdue = isOverdue(lead.data_proximo_followup);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group cursor-grab touch-none rounded-lg border bg-card px-2.5 py-2 shadow-sm active:cursor-grabbing",
        isDragging && !overlay && "opacity-40",
        overlay && "rotate-2 cursor-grabbing shadow-lg",
      )}
    >
      <Link
        href={`/leads/${lead.id}`}
        className="block truncate text-sm font-medium hover:underline"
        onClick={(e) => isDragging && e.preventDefault()}
      >
        {lead.nome_cliente}
      </Link>
      <p className="truncate text-xs text-muted-foreground">
        {lead.company?.name ?? "—"}
        {lead.tipo_evento ? ` · ${lead.tipo_evento}` : ""}
      </p>

      {(lead.valor_estimado || lead.data_proximo_followup) && (
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
          {lead.valor_estimado ? (
            <span className="font-medium text-foreground">
              {formatCurrency(lead.valor_estimado)}
            </span>
          ) : null}
          {lead.data_proximo_followup && (
            <span
              className={cn(
                followupOverdue
                  ? "font-medium text-destructive"
                  : "text-muted-foreground",
              )}
            >
              Follow-up: {formatDate(lead.data_proximo_followup)}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
