"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { signIn, signUp } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/form/password-input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  const [signInState, signInAction] = useActionState<
    ActionResult | null,
    FormData
  >(signIn, null);
  const [signUpState, signUpAction] = useActionState<
    ActionResult | null,
    FormData
  >(signUp, null);
  const [tab, setTab] = useState("entrar");

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="entrar">Entrar</TabsTrigger>
        <TabsTrigger value="criar">Criar conta</TabsTrigger>
      </TabsList>

      {/* LOGIN */}
      <TabsContent value="entrar">
        <form action={signInAction} className="space-y-4">
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
          {signInState && !signInState.ok && (
            <p className="text-sm text-destructive">{signInState.error}</p>
          )}
          <SubmitButton label="Entrar" />
        </form>
      </TabsContent>

      {/* CADASTRO */}
      <TabsContent value="criar">
        <form action={signUpAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Nome completo</Label>
            <Input
              id="full_name"
              name="full_name"
              placeholder="Seu nome"
              autoComplete="name"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email_signup">E-mail</Label>
            <Input
              id="email_signup"
              name="email"
              type="email"
              placeholder="voce@empresa.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password_signup">Senha</Label>
            <PasswordInput
              id="password_signup"
              name="password"
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              required
            />
          </div>
          {signUpState && !signUpState.ok && (
            <p className="text-sm text-destructive">{signUpState.error}</p>
          )}
          {signUpState?.ok && (
            <p className="text-sm text-success">{signUpState.message}</p>
          )}
          <SubmitButton label="Criar conta" />
        </form>
      </TabsContent>
    </Tabs>
  );
}
