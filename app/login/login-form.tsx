"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { signIn } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/form/password-input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/types";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </Button>
  );
}

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, action] = useActionState<ActionResult | null, FormData>(
    signIn,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="voce@empresa.com"
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <PasswordInput
          id="password"
          name="password"
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>
      {state && !state.ok && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <SubmitButton label="Entrar" />
    </form>
  );
}
