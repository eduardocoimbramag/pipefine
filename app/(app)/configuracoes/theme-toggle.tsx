"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Subscribe-noop: o valor nunca muda após montar, então não há atualizações. */
const emptySubscribe = () => () => {};

/**
 * `true` somente após a montagem no cliente. Usa useSyncExternalStore (sem
 * useEffect/setState) para ser seguro na hidratação e satisfazer o lint
 * react-hooks/set-state-in-effect: servidor e primeiro render do cliente
 * recebem `false`; depois da hidratação, `true`.
 */
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/**
 * Botão que alterna entre tema claro e escuro com animação fluida de
 * sol ↔ lua (cross-fade + rotação). Antes de montar no cliente o tema resolvido
 * é desconhecido, então mostramos um placeholder do mesmo tamanho para evitar
 * pintar o ícone errado por um instante (e qualquer mismatch de hidratação).
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useMounted();
  const isDark = resolvedTheme === "dark";

  if (!mounted) {
    return (
      <Button
        variant="outline"
        size="icon"
        className="relative overflow-hidden"
        aria-hidden
        tabIndex={-1}
        disabled
      >
        <span className="sr-only">Alternar tema</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      title={
        isDark
          ? "Tema escuro (clique para claro)"
          : "Tema claro (clique para escuro)"
      }
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative overflow-hidden"
    >
      <Sun
        className={`h-5 w-5 transition-all duration-500 ${
          isDark
            ? "rotate-90 scale-0 opacity-0"
            : "rotate-0 scale-100 opacity-100"
        }`}
      />
      <Moon
        className={`absolute h-5 w-5 transition-all duration-500 ${
          isDark
            ? "rotate-0 scale-100 opacity-100"
            : "-rotate-90 scale-0 opacity-0"
        }`}
      />
      <span className="sr-only">Alternar tema</span>
    </Button>
  );
}
