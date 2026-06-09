"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LayoutList, Columns3 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ViewToggle({ view }: { view: "lista" | "kanban" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function setView(v: "lista" | "kanban") {
    const next = new URLSearchParams(params.toString());
    // Kanban é o padrão (sem parâmetro); lista usa ?view=lista.
    if (v === "kanban") next.delete("view");
    else next.set("view", v);
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  const items = [
    { key: "kanban" as const, label: "Kanban", icon: Columns3 },
    { key: "lista" as const, label: "Lista", icon: LayoutList },
  ];

  return (
    <div className="inline-flex rounded-lg border bg-card p-0.5">
      {items.map((it) => {
        const Icon = it.icon;
        const active = view === it.key;
        return (
          <button
            key={it.key}
            onClick={() => setView(it.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
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
