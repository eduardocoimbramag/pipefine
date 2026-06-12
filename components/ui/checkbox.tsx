import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Checkbox simples baseado no input nativo (sem dependência extra), estilizado
 * com a paleta do sistema. Suporta o estado indeterminado via prop `indeterminate`.
 */
function Checkbox({
  className,
  indeterminate,
  ...props
}: React.ComponentProps<"input"> & { indeterminate?: boolean }) {
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = Boolean(indeterminate);
  }, [indeterminate]);

  return (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        "h-4 w-4 shrink-0 cursor-pointer rounded border-input text-primary accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Checkbox };
