import Link from "next/link";
import { Sparkles } from "lucide-react";
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
      {/* Lado visual (desktop) */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-6 w-6" />
          Pipefine
        </div>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold leading-tight">
            Central de Gestão
          </h1>
          <p className="max-w-md text-primary-foreground/80">
            Organize leads, orçamentos, follow-ups, eventos e o financeiro das
            suas empresas em um só lugar. Nada de cliente esquecido.
          </p>
        </div>
        <p className="text-sm text-primary-foreground/60">
          Sofistic Buffet · Gran Dose
        </p>
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-white/10" />
        <div className="absolute -bottom-32 -left-10 h-80 w-80 rounded-full bg-white/5" />
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center lg:hidden">
            <div className="flex items-center justify-center gap-2 text-xl font-bold text-primary">
              <Sparkles className="h-6 w-6" />
              Pipefine
            </div>
          </div>
          <div className="space-y-1 text-center lg:text-left">
            <h2 className="text-2xl font-semibold">Bem-vindo(a) de volta</h2>
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
