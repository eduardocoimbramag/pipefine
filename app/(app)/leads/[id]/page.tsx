import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  MapPin,
  Users,
  CalendarDays,
  Building2,
  History,
} from "lucide-react";
import { getLeadById, getLeadFollowups } from "@/lib/queries/leads";
import { getProfiles } from "@/lib/queries/shared";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { LeadStatusBadge, FollowupStatusBadge } from "@/components/status-badge";
import { formatDate, isOverdue } from "@/lib/date";
import { LeadActions } from "./lead-actions";
import { FollowupEditDialog } from "./followup-edit-dialog";
import { AddFollowupDialog } from "../../followups/add-followup-dialog";

export const dynamic = "force-dynamic";

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Phone;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="break-words text-sm font-medium">{value || "—"}</p>
      </div>
    </div>
  );
}

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const lead = await getLeadById(id);
  if (!lead) notFound();

  const [followups, profiles] = await Promise.all([
    getLeadFollowups(id),
    getProfiles(),
  ]);

  return (
    <div className="space-y-5">
      <Link
        href="/leads"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar para leads
      </Link>

      <PageHeader title={lead.nome_cliente}>
        <LeadActions id={lead.id} status={lead.status} />
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <LeadStatusBadge status={lead.status} />
        {lead.responsavel?.full_name && (
          <span className="text-sm text-muted-foreground">
            Responsável: {lead.responsavel.full_name}
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Coluna 1: dados */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Dados do lead</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={Building2} label="Empresa" value={lead.company?.name} />
            <InfoRow icon={Phone} label="Telefone" value={lead.telefone} />
            <InfoRow icon={Mail} label="E-mail" value={lead.email} />
            <Separator />
            <InfoRow
              icon={CalendarDays}
              label="Tipo / Data do evento"
              value={
                <>
                  {lead.tipo_evento ?? "—"}
                  {lead.data_evento && ` · ${formatDate(lead.data_evento)}`}
                </>
              }
            />
            <InfoRow icon={MapPin} label="Local" value={lead.local_evento} />
            <InfoRow
              icon={Users}
              label="Quantidade de pessoas"
              value={lead.quantidade_pessoas?.toString()}
            />
            {lead.data_orcamento_enviado && (
              <>
                <Separator />
                <InfoRow
                  icon={CalendarDays}
                  label="Orçamento enviado em"
                  value={formatDate(lead.data_orcamento_enviado)}
                />
              </>
            )}
            {lead.motivo_perda && (
              <InfoRow
                icon={History}
                label="Motivo da perda"
                value={lead.motivo_perda}
              />
            )}
            {lead.observacoes && (
              <>
                <Separator />
                <div>
                  <p className="mb-1 text-xs text-muted-foreground">
                    Observações
                  </p>
                  <p className="whitespace-pre-wrap text-sm">
                    {lead.observacoes}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Coluna 2-3: follow-ups */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Follow-ups</CardTitle>
              <AddFollowupDialog
                leads={[{ id: lead.id, nome_cliente: lead.nome_cliente }]}
                profiles={profiles}
                defaultLeadId={lead.id}
                triggerVariant="outline"
                triggerLabel="Novo / editar"
              />
            </CardHeader>
            <CardContent className="space-y-2">
              {followups.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nenhum follow-up registrado.
                </p>
              ) : (
                followups.map((f) => (
                  <div
                    key={f.id}
                    className="flex items-start justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{f.titulo}</p>
                      {f.descricao && (
                        <p className="text-sm text-muted-foreground">
                          {f.descricao}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-muted-foreground">
                        Vence {formatDate(f.data_vencimento)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <FollowupStatusBadge
                        status={f.status}
                        overdue={isOverdue(f.data_vencimento)}
                      />
                      {/* Edição disponível apenas para pendentes (inclui os autoregistrados) */}
                      {f.status === "pendente" && (
                        <FollowupEditDialog followup={f} />
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
