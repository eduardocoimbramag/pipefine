"use client";

import { useState, useTransition } from "react";
import { Menu, LogOut, User as UserIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SidebarBrand, SidebarNav } from "./sidebar";
import { CompanySwitcher } from "./company-switcher";
import { signOut } from "@/app/login/actions";
import {
  USER_ROLE_LABELS,
  type UserProfile,
  type UserRole,
  type Company,
} from "@/types";

function initials(name: string | null | undefined) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "");
}

export function Topbar({
  profile,
  companies,
  activeCompanyId,
}: {
  profile: UserProfile;
  companies: Company[];
  activeCompanyId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b bg-card/80 px-4 backdrop-blur lg:px-6">
      <div className="flex items-center gap-3">
        {/* Botão menu mobile */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SidebarBrand />
            <SidebarNav onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="lg:hidden font-bold text-primary">Pipefine</div>

        {/* Seletor de empresa em foco */}
        <CompanySwitcher
          companies={companies}
          activeCompanyId={activeCompanyId}
        />
      </div>

      {/* Menu do usuário */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-auto gap-2 px-2 py-1.5">
            <Avatar className="h-8 w-8">
              <AvatarFallback>
                {initials(profile.full_name).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="hidden text-left sm:block">
              <div className="text-sm font-medium leading-tight">
                {profile.full_name ?? "Usuário"}
              </div>
              <div className="text-xs text-muted-foreground leading-tight">
                {USER_ROLE_LABELS[profile.role as UserRole] ?? profile.role}
              </div>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="font-medium">{profile.full_name}</div>
            <div className="text-xs font-normal text-muted-foreground">
              {profile.email}
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <UserIcon className="h-4 w-4" />
            {USER_ROLE_LABELS[profile.role as UserRole] ?? profile.role}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              start(() => {
                void signOut();
              });
            }}
            disabled={pending}
            className="text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            {pending ? "Saindo..." : "Sair"}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
