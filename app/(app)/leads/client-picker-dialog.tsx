"use client";

import { useMemo, useState } from "react";
import { Search, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/** Opção mínima exibida no seletor de clientes antigos. */
export interface ClientOption {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
}

/**
 * Pop-up de busca de clientes já cadastrados ("Cliente antigo?").
 * A busca é feita no cliente (lista já carregada), sem ida ao servidor —
 * filtra por nome, telefone e e-mail conforme o usuário digita.
 */
export function ClientPickerDialog({
  open,
  onOpenChange,
  clients,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: ClientOption[];
  onSelect: (client: ClientOption) => void;
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) =>
      [c.name, c.phone, c.email]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(q)),
    );
  }, [search, clients]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Selecionar cliente antigo</DialogTitle>
          <DialogDescription>
            Busque um cliente já cadastrado para abrir um novo evento para ele.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            autoFocus
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, telefone ou e-mail..."
            className="pl-9"
          />
        </div>

        <div className="-mx-1 max-h-72 overflow-y-auto px-1">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {clients.length === 0
                ? "Nenhum cliente cadastrado ainda."
                : "Nenhum cliente encontrado."}
            </p>
          ) : (
            <ul className="space-y-1">
              {filtered.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c)}
                    className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-border hover:bg-muted"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <User className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {c.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {c.phone ?? c.email ?? "Sem contato"}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
