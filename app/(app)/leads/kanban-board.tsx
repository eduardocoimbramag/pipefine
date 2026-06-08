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
import { GripVertical, Loader2, XCircle, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/form/field";
import { updateLeadStatus } from "@/app/actions/leads";
import { formatCurrency, cn } from "@/lib/utils";
import { formatDate, isOverdue } from "@/lib/date";
import {
  KANBAN_COLUMNS,
  KANBAN_LOST_COLUMN,
  STATUS_TO_COLUMN,
  COLUMN_DEFAULT_STATUS,
  LEAD_STATUS_LABELS,
  type LeadWithRelations,
  type LeadStatus,
} from "@/types";

type BoardLeads = Record<string, LeadWithRelations[]>;

/** Distribui os leads nas colunas a partir do status. */
function groupLeads(leads: LeadWithRelations[]): BoardLeads {
  const board: BoardLeads = {};
  for (const col of [...KANBAN_COLUMNS, KANBAN_LOST_COLUMN]) board[col.id] = [];
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
  const [followupDays, setFollowupDays] = useState("2");
  const [savingFollowup, setSavingFollowup] = useState(false);

  // Re-sincroniza quando os dados do servidor mudam
  const leadsKey = useMemo(
    () => leads.map((l) => `${l.id}:${l.status}`).join("|"),
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
    opts?: { motivoPerda?: string; followupDays?: number },
  ) {
    startTransition(async () => {
      const res = await updateLeadStatus(
        leadId,
        status,
        opts?.motivoPerda,
        opts?.followupDays ?? null,
      );
      if (res.ok) {
        if (opts?.followupDays)
          toast.success(
            `Status atualizado. Follow-up criado em ${opts.followupDays} dia(s).`,
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

    // Move otimista
    moveCardInState(leadId, fromColumn, toColumn);

    // "Fechado" não precisa de follow-up — move direto.
    if (toColumn === "fechado") {
      persistStatus(leadId, COLUMN_DEFAULT_STATUS[toColumn]);
      return;
    }

    // Demais colunas: pergunta o follow-up (com opção de pular).
    setFollowupDays("2");
    setFollowupDialog({ lead, toColumn });
  }

  function confirmFollowup(withFollowup: boolean) {
    if (!followupDialog) return;
    const { lead, toColumn } = followupDialog;
    const status = COLUMN_DEFAULT_STATUS[toColumn];
    const dias = Number(followupDays);

    if (withFollowup && (!Number.isFinite(dias) || dias <= 0)) {
      toast.error("Informe um número de dias válido.");
      return;
    }

    setSavingFollowup(true);
    persistStatus(lead.id, status, {
      followupDays: withFollowup ? Math.round(dias) : undefined,
    });
    setSavingFollowup(false);
    setFollowupDialog(null);
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
      <div className="flex gap-3 overflow-x-auto pb-4">
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

      {/* Diálogo: Follow-up em quantos dias? (ao mover o card) */}
      <Dialog
        open={!!followupDialog}
        onOpenChange={(o) => {
          if (!o && !savingFollowup) {
            // Fechar pelo X/ESC = pular (mantém o status já alterado de forma otimista)
            confirmFollowup(false);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-primary" /> Follow-up em
              quantos dias?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {followupDialog?.lead.nome_cliente}
          </p>

          <div className="flex gap-2">
            {[1, 2, 3, 7].map((d) => (
              <Button
                key={d}
                type="button"
                variant={followupDays === String(d) ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => setFollowupDays(String(d))}
              >
                {d}d
              </Button>
            ))}
          </div>

          <Field label="Dias" htmlFor="followup_days">
            <Input
              id="followup_days"
              type="number"
              min={1}
              value={followupDays}
              onChange={(e) => setFollowupDays(e.target.value)}
              autoFocus
            />
          </Field>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => confirmFollowup(false)}
              disabled={savingFollowup}
            >
              Pular
            </Button>
            <Button
              onClick={() => confirmFollowup(true)}
              disabled={savingFollowup}
            >
              {savingFollowup && <Loader2 className="h-4 w-4 animate-spin" />}
              Criar follow-up
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
  children,
}: {
  id: string;
  label: string;
  tone: React.ComponentProps<typeof Badge>["tone"];
  count: number;
  muted?: boolean;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl border bg-muted/30 transition-colors",
        isOver && "border-primary bg-primary/5 ring-2 ring-primary/30",
        muted && "bg-muted/10",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{label}</span>
          <Badge tone={tone}>{count}</Badge>
        </div>
      </div>
      <div className="flex min-h-[120px] flex-1 flex-col gap-2 p-2">
        {children}
        {count === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
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
      className={cn(
        "group rounded-lg border bg-card p-3 shadow-sm",
        isDragging && !overlay && "opacity-40",
        overlay && "rotate-2 shadow-lg",
      )}
    >
      <div className="flex items-start gap-1.5">
        <button
          {...attributes}
          {...listeners}
          className="mt-0.5 cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
          aria-label="Arrastar"
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
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

          <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            {lead.valor_estimado ? (
              <span className="font-medium text-foreground">
                {formatCurrency(lead.valor_estimado)}
              </span>
            ) : null}
            {lead.data_evento && (
              <span className="text-muted-foreground">
                {formatDate(lead.data_evento)}
              </span>
            )}
          </div>

          {lead.data_proximo_followup && (
            <p
              className={cn(
                "mt-1 text-xs",
                followupOverdue
                  ? "font-medium text-destructive"
                  : "text-muted-foreground",
              )}
            >
              Follow-up: {formatDate(lead.data_proximo_followup)}
            </p>
          )}

          {/* mostra status exato dentro da coluna agrupada, quando relevante */}
          <p className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground/70">
            {LEAD_STATUS_LABELS[lead.status as LeadStatus]}
          </p>
        </div>
      </div>
    </div>
  );
}
