import Link from "next/link";
import { CalendarCheck, AlarmClock, CalendarClock } from "lucide-react";
import {
  getGroupedFollowups,
  type GroupedFollowups,
} from "@/lib/queries/followups";
import { getLeads } from "@/lib/queries/leads";
import { getProfiles } from "@/lib/queries/shared";
import { getActiveCompanyContext } from "@/lib/active-company";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { FollowupStatusBadge } from "@/components/status-badge";
import { formatDate, isOverdue } from "@/lib/date";
import type { FollowupWithLead } from "@/types";
import { CompleteFollowupButton } from "./complete-button";
import { FollowupItemActions } from "./followup-item-actions";
import { AddFollowupDialog } from "./add-followup-dialog";

export const metadata = { title: "Follow-ups — Pipefine" };
export const dynamic = "force-dynamic";

const SECTIONS: {
  key: keyof GroupedFollowups;
  label: string;
  icon: typeof CalendarCheck;
}[] = [
  { key: "atrasados", label: "Atrasados", icon: AlarmClock },
  { key: "hoje", label: "Hoje", icon: CalendarCheck },
  { key: "proximos", label: "Próximos", icon: CalendarClock },
];

function FollowupRow({ f }: { f: FollowupWithLead }) {
  const overdue = isOverdue(f.data_vencimento);
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {f.lead ? (
            <Link
              href={`/leads/${f.lead.id}`}
              className="font-medium hover:underline"
            >
              {f.titulo}
            </Link>
          ) : (
            <span className="font-medium">{f.titulo}</span>
          )}
          <FollowupStatusBadge status={f.status} overdue={overdue} />
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {f.lead?.nome_cliente ?? "—"} · Vence{" "}
          <span className={overdue ? "font-medium text-destructive" : ""}>
            {formatDate(f.data_vencimento)}
          </span>
          {f.responsavel?.full_name && ` · ${f.responsavel.full_name}`}
        </p>
        {f.descricao && (
          <p className="mt-1 text-sm text-muted-foreground">{f.descricao}</p>
        )}
      </div>
      {f.status === "pendente" && (
        <div className="flex shrink-0 items-center gap-1">
          <CompleteFollowupButton id={f.id} />
          <FollowupItemActions id={f.id} data={f.data_vencimento} />
        </div>
      )}
    </div>
  );
}

export default async function FollowupsPage() {
  const { activeCompanyId, activeCompany } = await getActiveCompanyContext();

  const [grouped, leads, profiles] = await Promise.all([
    getGroupedFollowups(activeCompanyId ?? undefined),
    getLeads({ companyId: activeCompanyId ?? undefined }),
    getProfiles(),
  ]);

  const leadOptions = leads.map((l) => ({
    id: l.id,
    nome_cliente: l.nome_cliente,
  }));

  const isEmpty = SECTIONS.every((s) => grouped[s.key].length === 0);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Follow-ups"
        description={
          activeCompany
            ? `${activeCompany.name} · acompanhamentos pendentes`
            : "Acompanhamentos pendentes — tudo dentro do painel."
        }
      >
        <AddFollowupDialog leads={leadOptions} profiles={profiles} />
      </PageHeader>

      {isEmpty ? (
        <EmptyState
          icon={CalendarCheck}
          title="Nada por aqui"
          description="Nenhum follow-up pendente."
        />
      ) : (
        SECTIONS.map((section) => {
          const items = grouped[section.key];
          if (items.length === 0) return null;
          const Icon = section.icon;
          return (
            <section key={section.key} className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Icon className="h-4 w-4" />
                {section.label}
                <span className="text-xs">({items.length})</span>
              </div>
              <Card className="overflow-hidden p-0">
                <CardContent className="divide-y p-0">
                  {items.map((f) => (
                    <FollowupRow key={f.id} f={f} />
                  ))}
                </CardContent>
              </Card>
            </section>
          );
        })
      )}
    </div>
  );
}
