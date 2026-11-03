"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { NAV_ITEMS } from "./nav-config";

/** Contadores exibidos ao lado dos itens do menu, por href (ex.: "/orcamentos"). */
export type NavCounts = Partial<Record<string, number>>;

export function SidebarNav({
  onNavigate,
  counts,
}: {
  onNavigate?: () => void;
  counts?: NavCounts;
}) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(item.href + "/");
        const Icon = item.icon;
        const count = counts?.[item.href] ?? 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-primary/10 text-sidebar-primary"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            {item.label}
            {count > 0 && (
              <span className="ml-auto min-w-5 rounded-full bg-destructive px-1.5 text-center text-[11px] font-semibold leading-5 text-destructive-foreground tabular-nums">
                {count > 99 ? "99+" : count}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarBrand() {
  return (
    <Link
      href="/dashboard"
      className="flex h-16 items-center justify-center border-b px-5 text-foreground"
    >
      <Logo className="h-11 w-auto" />
    </Link>
  );
}

/** Sidebar fixa (apenas desktop). */
export function DesktopSidebar({ counts }: { counts?: NavCounts }) {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-sidebar lg:flex">
      <SidebarBrand />
      <SidebarNav counts={counts} />
      <div className="border-t px-5 py-3 text-xs text-muted-foreground">
        Central de Gestão
      </div>
    </aside>
  );
}
