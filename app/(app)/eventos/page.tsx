import { getEvents, type EventFilters as Filters } from "@/lib/queries/events";
import { getCompanies } from "@/lib/queries/shared";
import { EventFilters } from "./event-filters";
import { EventsManager, type EventsView } from "./events-manager";
import { getActiveCompanyContext } from "@/lib/active-company";
import { parsePeriod, periodRange } from "@/lib/date";

export const metadata = { title: "Eventos — Pipefine" };
export const dynamic = "force-dynamic";

/** "Você tem 3 eventos agendados" — concorda em número e trata o zero. */
function describeEvents(total: number): string {
  if (total === 0) return "Nenhum evento agendado";
  if (total === 1) return "Você tem 1 evento agendado";
  return `Você tem ${total} eventos agendados`;
}

export default async function EventosPage({
  searchParams,
}: {
  searchParams: Promise<{
    company?: string;
    periodo?: string;
    view?: string;
  }>;
}) {
  const sp = await searchParams;
  const view: EventsView = sp.view === "calendario" ? "calendario" : "lista";
  const { activeCompanyId } = await getActiveCompanyContext();
  const effectiveCompanyId = activeCompanyId ?? sp.company;

  // No calendário o período não se aplica: ele navega mês a mês e precisa da
  // agenda inteira para marcar os dias de qualquer mês visitado.
  const periodo = parsePeriod(sp.periodo);
  const range = view === "calendario" ? null : periodRange(periodo);

  const filters: Filters = {
    companyId: effectiveCompanyId,
    start: range?.start,
    end: range?.end,
  };

  const [events, companies] = await Promise.all([
    getEvents(filters),
    getCompanies(),
  ]);

  return (
    <div className="space-y-5">
      <EventsManager
        events={events}
        view={view}
        description={describeEvents(events.length)}
        filters={
          <EventFilters
            companies={companies}
            lockCompany={activeCompanyId !== null}
            showPeriod={view === "lista"}
          />
        }
      />
    </div>
  );
}
