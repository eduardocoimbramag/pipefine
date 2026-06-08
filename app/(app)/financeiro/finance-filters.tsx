"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { Company } from "@/types";

const ALL = "__all__";

export function FinanceFilters({
  companies,
  currentYear,
  years,
  lockCompany = false,
}: {
  companies: Company[];
  currentYear: number;
  years: number[];
  lockCompany?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (!value || value === ALL) next.delete(key);
      else next.set(key, value);
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <Select
        value={String(params.get("year") ?? currentYear)}
        onValueChange={(v) => setParam("year", v)}
      >
        <SelectTrigger className="w-full sm:w-[120px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!lockCompany && (
        <Select
          value={params.get("company") ?? ALL}
          onValueChange={(v) => setParam("company", v)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
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

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Mês ref.:</span>
        <Input
          type="month"
          value={params.get("month") ?? ""}
          onChange={(e) => setParam("month", e.target.value || null)}
          className="w-[150px]"
        />
      </div>
    </div>
  );
}
