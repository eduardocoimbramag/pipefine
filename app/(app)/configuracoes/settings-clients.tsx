"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createCompany,
  toggleCompany,
  deleteCompany,
  updateProfile,
} from "@/app/actions/settings";
import {
  USER_ROLES,
  USER_ROLE_LABELS,
  type Company,
  type UserProfile,
  type UserRole,
} from "@/types";

export function AddCompanyForm() {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();

  function onSubmit(formData: FormData) {
    start(async () => {
      const res = await createCompany(formData);
      if (res.ok) {
        toast.success("Empresa criada.");
        ref.current?.reset();
        router.refresh();
      } else toast.error(res.error);
    });
  }

  return (
    <form ref={ref} action={onSubmit} className="flex gap-2">
      <Input name="name" placeholder="Nome da nova empresa" required />
      <Button type="submit" disabled={pending}>
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        Adicionar
      </Button>
    </form>
  );
}

export function CompanyToggle({ company }: { company: Company }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  function toggle() {
    start(async () => {
      const res = await toggleCompany(company.id, !company.active);
      if (res.ok) {
        toast.success(
          company.active ? "Empresa desativada." : "Empresa ativada.",
        );
        router.refresh();
      } else toast.error(res.error);
    });
  }

  function remove() {
    setDeleting(true);
    start(async () => {
      const res = await deleteCompany(company.id);
      setDeleting(false);
      if (res.ok) {
        toast.success("Empresa excluída.");
        setConfirmDelete(false);
        router.refresh();
      } else {
        // Mantém o diálogo aberto e mostra o motivo (ex.: há leads vinculados).
        toast.error(res.error);
      }
    });
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant={company.active ? "outline" : "secondary"}
          size="sm"
          disabled={pending}
          onClick={toggle}
        >
          {pending && !deleting && <Loader2 className="h-4 w-4 animate-spin" />}
          {company.active ? "Desativar" : "Ativar"}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          disabled={pending}
          onClick={() => setConfirmDelete(true)}
          aria-label={`Excluir ${company.name}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" /> Excluir empresa?
            </DialogTitle>
            <DialogDescription>
              Você está prestes a excluir{" "}
              <span className="font-medium text-foreground">
                {company.name}
              </span>{" "}
              permanentemente. Esta ação não pode ser desfeita. Empresas com
              leads ou eventos vinculados não podem ser excluídas — nesse caso,
              desative-a.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmDelete(false)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={remove}
              disabled={deleting}
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Excluir permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ProfileRoleForm({ profile }: { profile: UserProfile }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [role, setRole] = useState<UserRole>(profile.role);

  function save() {
    const fd = new FormData();
    fd.set("full_name", profile.full_name ?? "");
    fd.set("role", role);
    start(async () => {
      const res = await updateProfile(profile.id, fd);
      if (res.ok) {
        toast.success("Perfil atualizado.");
        router.refresh();
      } else toast.error(res.error);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {USER_ROLES.map((r) => (
            <SelectItem key={r} value={r}>
              {USER_ROLE_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="outline"
        onClick={save}
        disabled={pending || role === profile.role}
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        Salvar
      </Button>
    </div>
  );
}
