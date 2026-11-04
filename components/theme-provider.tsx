"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Provider do next-themes. Usa a estratégia por classe (`.dark` no <html>),
 * que é como os tokens estão definidos em globals.css. O tema padrão é
 * "light"; o escuro só entra se o usuário escolher em Configurações (a escolha
 * fica salva no navegador e é mantida nas próximas visitas).
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
