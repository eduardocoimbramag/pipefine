import { Building2, Users, Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCompanies } from "@/lib/queries/shared";
import { getCurrentProfile } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AddCompanyForm,
  CompanyToggle,
  ProfileRoleForm,
} from "./settings-clients";
import { USER_ROLE_LABELS, type UserProfile, type UserRole } from "@/types";

export const metadata = { title: "Configurações — Pipefine" };
export const dynamic = "force-dynamic";

export default async function ConfiguracoesPage() {
  const supabase = await createClient();
  const [companies, me, profilesRes] = await Promise.all([
    getCompanies(),
    getCurrentProfile(),
    supabase.from("users_profile").select("*").order("full_name"),
  ]);
  const profiles = (profilesRes.data ?? []) as UserProfile[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Gerencie empresas, usuários e perfis de acesso."
      />

      {/* Empresas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" /> Empresas
          </CardTitle>
          <CardDescription>
            Empresas disponíveis no sistema. Todos os usuários veem todas as
            empresas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddCompanyForm />
          <Separator />
          <div className="space-y-2">
            {companies.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-3 rounded-lg border p-3"
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  {!c.active && <Badge tone="neutral">Inativa</Badge>}
                </div>
                <CompanyToggle company={c} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Usuários */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> Usuários e perfis
          </CardTitle>
          <CardDescription>
            Cada pessoa tem login próprio. Crie novos usuários pela tela de
            cadastro (login) ou no painel do Supabase.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {profiles.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhum usuário ainda.
            </p>
          ) : (
            profiles.map((p) => (
              <div
                key={p.id}
                className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {p.full_name ?? "Sem nome"}
                    {p.id === me?.id && (
                      <span className="ml-2 text-xs text-primary">(você)</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {p.email} ·{" "}
                    {USER_ROLE_LABELS[p.role as UserRole] ?? p.role}
                  </p>
                </div>
                <ProfileRoleForm profile={p} />
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Info do sistema */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" /> Sobre o sistema
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Pipefine</span> —
            Central de Gestão (CRM + Eventos + Financeiro).
          </p>
          <p>
            Lembretes e follow-ups funcionam inteiramente dentro do painel. Não
            há envio de e-mail, SMS ou WhatsApp.
          </p>
          <p>
            Perfis disponíveis: Admin, Comercial, Operacional e Financeiro. No
            momento, todos os usuários autenticados têm acesso completo aos
            dados.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
