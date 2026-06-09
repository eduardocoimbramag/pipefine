import Link from "next/link";
import { Logo } from "@/components/logo";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar — Pipefine" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Lado visual (desktop) — fundo grafite, logo/wordmark em creme */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center">
          <Logo className="h-12 w-auto" />
        </div>
        <div className="space-y-4">
          <h1 className="font-serif text-5xl font-semibold leading-[1.05]">
            Central de Gestão
          </h1>
          <p className="max-w-md text-primary-foreground/75">
            Organize leads, orçamentos, follow-ups, eventos e o financeiro das
            suas empresas em um só lugar. Nada de cliente esquecido.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/60">
          Sofistic Buffet · Gran Dose
        </p>
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-card/10" />
        <div className="absolute -bottom-32 -left-10 h-80 w-80 rounded-full bg-card/5" />
      </div>

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
