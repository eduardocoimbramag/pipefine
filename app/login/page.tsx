import Link from "next/link";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";
import { LoginHero } from "./login-hero";

export const metadata = { title: "Entrar — Pipefine" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Lado visual animado (desktop) — só a logo, sobre painel interativo */}
      <LoginHero />

      {/* Formulário */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex items-center justify-center text-foreground lg:hidden">
            <Logo className="h-12 w-auto" />
          </div>
          <div className="space-y-1 text-center lg:text-left">
            <h2 className="font-serif text-3xl font-semibold tracking-tight">
              Bem-vindo(a) de volta
            </h2>
            <p className="text-sm text-muted-foreground">
              Entre com sua conta para acessar o painel.
            </p>
          </div>
          <LoginForm redirectTo={redirectTo ?? "/dashboard"} />
          <p className="text-center text-xs text-muted-foreground">
            <Link href="/" className="hover:underline">
              Pipefine — sistema interno
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
