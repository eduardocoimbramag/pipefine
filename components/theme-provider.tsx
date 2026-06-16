"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ComponentProps } from "react";

/**
 * Provider do next-themes. Usa a estratégia por classe (`.dark` no <html>),
 * que é como os tokens estão definidos em globals.css. O tema padrão é
 * "system" (segue a preferência do SO até o usuário escolher manualmente).
 */
export function ThemeProvider({
  children,
  ...props
}: ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
