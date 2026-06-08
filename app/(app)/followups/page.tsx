import Link from "next/link";
import { CalendarCheck, AlarmClock, CalendarClock, ListChecks } from "lucide-react";
import { getFollowups, type FollowupBucket } from "@/lib/queries/followups";
import { getLeads } from "@/lib/queries/leads";
import { getProfiles } from "@/lib/queries/shared";
import { getActiveCompanyContext } from "@/lib/active-company";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { FollowupStatusBadge } from "@/components/status-badge";
import { formatDate, isOverdue } from "@/lib/date";
import { cn } from "@/lib/utils";
import { CompleteFollowupButton } from "./complete-button";
import { FollowupItemActions } from "./followup-item-actions";
import { AddFollowupDialog } from "./add-followup-dialog";

export const metadata = { title: "Follow-ups — Pipefine" };
export const dynamic = "force-dynamic";

const BUCKETS: { key: FollowupBucket; label: string; icon: typeof CalendarCheck }[] =
  [
    { key: "hoje", label: "Hoje", icon: CalendarCheck },
    { key: "atrasados", label: "Atrasados", icon: AlarmClock },
    { key: "proximos", label: "Próximos", icon: CalendarClock },
    { key: "todos", label: "Todos", icon: ListChecks },
  ];

export default async function FollowupsPage({
  searchParams,
}: {
  searchParams: Promise<{ bucket?: string }>;
}) {
  const sp = await searchParams;
  const bucket = (
    ["hoje", "atrasados", "proximos", "todos"].includes(sp.bucket ?? "")
      ? sp.bucket
      : "hoje"
  ) as FollowupBucket;

  const { activeCompanyId, activeCompany } = await getActiveCompanyContext();

  const [followups, leads, profiles] = await Promise.all([
    getFollowups(bucket, activeCompanyId ?? undefined),
    getLeads({ companyId: activeCompanyId ?? undefined }),
    getProfiles(),
  ]);

  const leadOptions = leads.map((l) => ({
    id: l.id,
    nome_cliente: l.nome_cliente,
  }));

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

      {/* Tabs por bucket */}
      <div className="flex flex-wrap gap-2">
        {BUCKETS.map((b) => {
          const Icon = b.icon;
          const active = bucket === b.key;
          return (
            <Link
              key={b.key}
              href={`/followups?bucket=${b.key}`}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "border-primary bg-primary/10 text-primary"
                  : "bg-card hover:bg-muted/50",
              )}
            >
              <Icon className="h-4 w-4" />
              {b.label}
            </Link>
          );
        })}
      </div>

      {followups.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="Nada por aqui"
          description="Nenhum follow-up nesta categoria."
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <CardContent className="divide-y p-0">
            {followups.map((f) => {
              const overdue = isOverdue(f.data_vencimento);
              return (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-3 p-4"
                >
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
                      <span
                        className={overdue ? "font-medium text-destructive" : ""}
                      >
                        {formatDate(f.data_vencimento)}
                      </span>
                      {f.responsavel?.full_name &&
                        ` · ${f.responsavel.full_name}`}
                    </p>
                    {f.descricao && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {f.descricao}
                      </p>
                    )}
                  </div>
                  {f.status === "pendente" && (
                    <div className="flex shrink-0 items-center gap-1">
                      <CompleteFollowupButton id={f.id} />
                      <FollowupItemActions
                        id={f.id}
                        data={f.data_vencimento}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
