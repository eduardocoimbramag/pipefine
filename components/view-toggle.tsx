"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ViewOption<T extends string> {
  key: T;
  label: string;
  icon: LucideIcon;
}

/**
 * Alternador de visão (segmented control) sincronizado com a URL.
 *
 * A visão padrão não escreve parâmetro nenhum — mantém o link limpo e o
 * botão "voltar" do navegador coerente.
 */
export function ViewToggle<T extends string>({
  value,
  options,
  defaultView,
  param = "view",
  className,
}: {
  value: T;
  options: ViewOption<T>[];
  /** Visão padrão: quando selecionada, o parâmetro é removido da URL. */
  defaultView: T;
  param?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setView(v: T) {
    const next = new URLSearchParams(params.toString());
    if (v === defaultView) next.delete(param);
    else next.set(param, v);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div
      role="tablist"
      aria-label="Alternar visão"
      className={cn("inline-flex rounded-lg border bg-card p-0.5", className)}
    >
      {options.map((it) => {
        const Icon = it.icon;
        const active = value === it.key;
        return (
          <button
            key={it.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setView(it.key)}
            className={cn(
              "inline-flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{it.label}</span>
          </button>
        );
      })}
    </div>
  );
}
