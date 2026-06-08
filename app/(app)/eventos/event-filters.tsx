"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  EVENT_STATUSES,
  EVENT_STATUS_LABELS,
  PAYMENT_STATUSES,
  PAYMENT_STATUS_LABELS,
  type Company,
} from "@/types";

const ALL = "__all__";

export function EventFilters({
  companies,
  lockCompany = false,
}: {
  companies: Company[];
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

  const hasFilters =
    params.get("company") ||
    params.get("statusEvento") ||
    params.get("statusPagamento") ||
    params.get("month");

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <Input
        type="month"
        value={params.get("month") ?? ""}
        onChange={(e) => setParam("month", e.target.value || null)}
        className="w-full sm:w-[160px]"
      />

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

      <Select
        value={params.get("statusEvento") ?? ALL}
        onValueChange={(v) => setParam("statusEvento", v)}
      >
        <SelectTrigger className="w-full sm:w-[170px]">
          <SelectValue placeholder="Status evento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos os status</SelectItem>
          {EVENT_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {EVENT_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={params.get("statusPagamento") ?? ALL}
        onValueChange={(v) => setParam("statusPagamento", v)}
      >
        <SelectTrigger className="w-full sm:w-[190px]">
          <SelectValue placeholder="Pagamento" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>Todos pagamentos</SelectItem>
          {PAYMENT_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {PAYMENT_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          <X className="h-4 w-4" /> Limpar
        </Button>
      )}
    </div>
  );
}
