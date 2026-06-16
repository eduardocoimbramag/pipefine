import { getEvents, type EventFilters as Filters } from "@/lib/queries/events";
import { getCompanies } from "@/lib/queries/shared";
import { EventFilters } from "./event-filters";
import { EventsManager } from "./events-manager";
import { getActiveCompanyContext } from "@/lib/active-company";
import { formatCurrency } from "@/lib/utils";
import type { EventStatus, PaymentStatus } from "@/types";

export const metadata = { title: "Eventos — Pipefine" };
export const dynamic = "force-dynamic";

export default async function EventosPage({
  searchParams,
}: {
  searchParams: Promise<{
    company?: string;
    statusEvento?: string;
    statusPagamento?: string;
    month?: string;
  }>;
}) {
  const sp = await searchParams;
  const { activeCompanyId } = await getActiveCompanyContext();
  const effectiveCompanyId = activeCompanyId ?? sp.company;

  const filters: Filters = {
    companyId: effectiveCompanyId,
    statusEvento: sp.statusEvento as EventStatus | undefined,
    statusPagamento: sp.statusPagamento as PaymentStatus | undefined,
    month: sp.month,
  };

  const [events, companies] = await Promise.all([
    getEvents(filters),
    getCompanies(),
  ]);

  const totalPeriodo = events
    .filter((e) => e.status_evento !== "cancelado")
    .reduce((s, e) => s + (Number(e.valor_total) || 0), 0);

  return (
    <div className="space-y-5">
      <EventsManager
        events={events}
        description={`${events.length} evento(s) · ${formatCurrency(totalPeriodo)} em contratos`}
        filters={
          <EventFilters
            companies={companies}
            lockCompany={activeCompanyId !== null}
          />
        }
      />
    </div>
  );
}
