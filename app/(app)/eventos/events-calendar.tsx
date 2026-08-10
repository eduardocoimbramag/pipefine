"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  addDays,
  addMonths,
  subMonths,
  startOfMonth,
  startOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft,
  ChevronRight,
  CalendarOff,
  Clock,
  MapPin,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EventStatusBadge } from "@/components/status-badge";
import { formatCurrency, cn } from "@/lib/utils";
import { todayISO } from "@/lib/date";
import { EVENT_STATUSES, EVENT_STATUS_LABELS, type EventStatus } from "@/types";
import type { EventWithRelations } from "@/types";

/** Cor do ponto no dia, por status do evento (mesma leitura dos badges). */
const STATUS_DOT: Record<EventStatus, string> = {
  confirmado: "bg-info",
  em_producao: "bg-chart-5",
  finalizado: "bg-success",
  cancelado: "bg-destructive",
};

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/** Máximo de pontos exibidos na célula — a contagem exata fica no painel. */
const MAX_DOTS = 3;

export function EventsCalendar({ events }: { events: EventWithRelations[] }) {
  // Índice data (yyyy-MM-dd) → eventos daquele dia, já ordenados por horário.
  const porDia = useMemo(() => {
    const mapa = new Map<string, EventWithRelations[]>();
    for (const ev of events) {
      if (!ev.data_evento) continue;
      const lista = mapa.get(ev.data_evento);
      if (lista) lista.push(ev);
      else mapa.set(ev.data_evento, [ev]);
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) =>
        (a.horario_inicio ?? "99").localeCompare(b.horario_inicio ?? "99"),
      );
    }
    return mapa;
  }, [events]);

  const hoje = todayISO();
  const [mesRef, setMesRef] = useState<Date>(() => startOfMonth(new Date()));
  const [selecionado, setSelecionado] = useState<string>(hoje);

  // Grade fixa de 6 semanas a partir do domingo da 1ª semana: cobre qualquer
  // mês e mantém a altura estável ao navegar (sem "pulo" de layout).
  const dias = useMemo(() => {
    const inicio = startOfWeek(startOfMonth(mesRef), { locale: ptBR });
    return Array.from({ length: 42 }, (_, i) => addDays(inicio, i));
  }, [mesRef]);

  const eventosDoMes = useMemo(
    () =>
      events.filter(
        (ev) => ev.data_evento && isSameMonth(parseISO(ev.data_evento), mesRef),
      ).length,
    [events, mesRef],
  );

  /**
   * Ao trocar de mês, leva a seleção junto: hoje (se o mês for o atual),
   * senão o primeiro dia com evento, senão o dia 1.
   */
  function irPara(mes: Date) {
    const inicio = startOfMonth(mes);
    setMesRef(inicio);

    if (isSameMonth(new Date(), inicio)) {
      setSelecionado(hoje);
      return;
    }
    const primeiroComEvento = events
      .filter((ev) => ev.data_evento && isSameMonth(parseISO(ev.data_evento), inicio))
      .map((ev) => ev.data_evento)
      .sort()[0];
    setSelecionado(primeiroComEvento ?? format(inicio, "yyyy-MM-dd"));
  }

  const eventosDoDia = porDia.get(selecionado) ?? [];

  return (
    <Card className="overflow-hidden p-0">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem]">
        {/* ----------------------------- Calendário ----------------------------- */}
        <div className="p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate font-serif text-xl font-semibold tracking-tight first-letter:uppercase">
                {format(mesRef, "MMMM 'de' yyyy", { locale: ptBR })}
              </h2>
              <p className="text-xs text-muted-foreground">
                {eventosDoMes === 0
                  ? "Nenhum evento neste mês"
                  : `${eventosDoMes} evento${eventosDoMes > 1 ? "s" : ""} neste mês`}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => irPara(new Date())}
              >
                Hoje
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => irPara(subMonths(mesRef, 1))}
                aria-label="Mês anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => irPara(addMonths(mesRef, 1))}
                aria-label="Próximo mês"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 pb-1.5">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
              >
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {dias.map((dia) => {
              const iso = format(dia, "yyyy-MM-dd");
              const doMes = isSameMonth(dia, mesRef);
              const eventosDia = porDia.get(iso) ?? [];
              const temEventos = eventosDia.length > 0;
              const ehHoje = isToday(dia);
              const ativo = iso === selecionado;

              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => setSelecionado(iso)}
                  aria-pressed={ativo}
                  aria-label={`${format(dia, "d 'de' MMMM 'de' yyyy", { locale: ptBR })}${
                    temEventos
                      ? ` — ${eventosDia.length} evento${eventosDia.length > 1 ? "s" : ""}`
                      : " — sem eventos"
                  }`}
                  className={cn(
                    "relative flex h-12 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-transparent transition-colors sm:h-14 lg:h-16",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    doMes
                      ? "hover:border-border hover:bg-muted/60"
                      : "text-muted-foreground/40 hover:bg-muted/30",
                    ehHoje &&
                      !ativo &&
                      "border-primary/35 bg-primary/5 font-semibold",
                    ativo &&
                      "border-primary bg-primary text-primary-foreground shadow-sm hover:bg-primary hover:border-primary",
                  )}
                >
                  <span className="text-sm leading-none tabular-nums">
                    {format(dia, "d")}
                  </span>

                  {/* Altura reservada mesmo sem eventos: a grade não "pula". */}
                  <span className="flex h-1.5 items-center justify-center gap-[3px]">
                    {eventosDia.slice(0, MAX_DOTS).map((ev) => (
                      <span
                        key={ev.id}
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          ativo
                            ? "bg-primary-foreground"
                            : STATUS_DOT[ev.status_evento],
                        )}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Legenda de status */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-3">
            {EVENT_STATUSES.map((s) => (
              <span
                key={s}
                className="flex items-center gap-1.5 text-xs text-muted-foreground"
              >
                <span
                  className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[s])}
                />
                {EVENT_STATUS_LABELS[s]}
              </span>
            ))}
          </div>
        </div>

        {/* --------------------------- Agenda do dia --------------------------- */}
        <aside className="border-t bg-muted/20 p-4 sm:p-5 lg:border-l lg:border-t-0">
          <div className="mb-3">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {selecionado === hoje ? "Hoje" : "Agenda do dia"}
            </p>
            <p className="font-serif text-lg font-semibold tracking-tight first-letter:uppercase">
              {format(parseISO(selecionado), "EEEE, d 'de' MMMM", {
                locale: ptBR,
              })}
            </p>
          </div>

          {eventosDoDia.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-8 text-center">
              <CalendarOff className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Nenhum evento neste dia.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {eventosDoDia.map((ev) => (
                <Link
                  key={ev.id}
                  href={`/eventos/${ev.id}`}
                  className="block rounded-lg border bg-card p-3 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate font-medium">
                      {ev.nome_cliente}
                    </p>
                    <EventStatusBadge status={ev.status_evento} />
                  </div>

                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {ev.tipo_evento ?? "Evento"}
                    {ev.company?.name ? ` · ${ev.company.name}` : ""}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {ev.horario_inicio && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {ev.horario_inicio.slice(0, 5)}
                        {ev.horario_fim ? ` – ${ev.horario_fim.slice(0, 5)}` : ""}
                      </span>
                    )}
                    {ev.local_evento && (
                      <span className="flex min-w-0 items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{ev.local_evento}</span>
                      </span>
                    )}
                  </div>

                  <p className="mt-2 text-sm font-medium">
                    {formatCurrency(Number(ev.valor_total) || 0)}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </aside>
      </div>
    </Card>
  );
}
