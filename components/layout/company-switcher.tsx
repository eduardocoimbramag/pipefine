"use client";

import { useTransition } from "react";
import { Building2, ChevronDown, Check, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setActiveCompany } from "@/app/actions/company-context";
import { ALL_COMPANIES } from "@/lib/active-company-shared";
import { cn } from "@/lib/utils";
import type { Company } from "@/types";

export function CompanySwitcher({
  companies,
  activeCompanyId,
}: {
  companies: Company[];
  activeCompanyId: string | null;
}) {
  const [pending, start] = useTransition();

  const active = activeCompanyId
    ? companies.find((c) => c.id === activeCompanyId)
    : null;
  const label = active ? active.name : "Todas as empresas";

  function select(value: string) {
    // Evita re-disparar se já é a seleção atual
    const current = activeCompanyId ?? ALL_COMPANIES;
    if (value === current) return;
    start(() => {
      void setActiveCompany(value);
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-auto gap-2 px-2 py-1.5"
          disabled={pending}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {active ? (
              <Building2 className="h-4 w-4" />
            ) : (
              <Layers className="h-4 w-4" />
            )}
          </span>
          <div className="hidden text-left sm:block">
            <div className="text-[11px] leading-tight text-muted-foreground">
              Empresa
            </div>
            <div className="max-w-[140px] truncate text-sm font-medium leading-tight">
              {label}
            </div>
          </div>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-60">
        <DropdownMenuLabel>Empresa em foco</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={() => select(ALL_COMPANIES)}
          className="justify-between"
        >
          <span className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Todas as empresas
          </span>
          {!activeCompanyId && <Check className="h-4 w-4 text-primary" />}
        </DropdownMenuItem>

        {companies.length > 0 && <DropdownMenuSeparator />}

        {companies.map((c) => {
          const selected = c.id === activeCompanyId;
          return (
            <DropdownMenuItem
              key={c.id}
              onSelect={() => select(c.id)}
              className="justify-between"
            >
              <span
                className={cn(
                  "flex items-center gap-2 truncate",
                  selected && "font-medium",
                )}
              >
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="truncate">{c.name}</span>
              </span>
              {selected && <Check className="h-4 w-4 shrink-0 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
