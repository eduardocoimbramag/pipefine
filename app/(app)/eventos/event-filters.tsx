"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { PERIODS, PERIOD_LABELS, parsePeriod } from "@/lib/date";
import type { Company } from "@/types";

const ALL = "__all__";

export function EventFilters({
  companies,
  lockCompany = false,
  /** Na visão de calendário o período é dispensável — o próprio calendário navega por mês. */
  showPeriod = true,
}: {
  companies: Company[];
  lockCompany?: boolean;
  showPeriod?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === ALL) next.delete(key);
      else next.set(key, value);
      const qs = next.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [params, pathname, router],
  );

  const periodo = parsePeriod(params.get("periodo"));
  const hasFilters = params.get("company") || periodo !== "todos";

  function limpar() {
    // Preserva a visão atual (lista/calendário) ao limpar os filtros.
    const next = new URLSearchParams();
    const view = params.get("view");
    if (view) next.set("view", view);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {showPeriod && (
        <Select
          value={periodo}
          onValueChange={(v) => setParam("periodo", v === "todos" ? null : v)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODS.map((p) => (
              <SelectItem key={p} value={p}>
                {PERIOD_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {!lockCompany && (
        <Select
          value={params.get("company") ?? ALL}
          onValueChange={(v) => setParam("company", v)}
        >
          <SelectTrigger className="w-full sm:w-[170px]">
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todas as empresas</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={limpar}>
          <X className="h-4 w-4" /> Limpar
        </Button>
      )}
    </div>
  );
}
