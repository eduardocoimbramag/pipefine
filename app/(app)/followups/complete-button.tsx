"use client";

import { useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { completeFollowup } from "@/app/actions/followups";

export function CompleteFollowupButton({ id }: { id: string }) {
  const [pending, start] = useTransition();

  return (
    <Button
      size="sm"
      variant="success"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await completeFollowup(id);
          if (res.ok) toast.success(res.message ?? "Concluído");
          else toast.error(res.error);
        })
      }
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Check className="h-4 w-4" />
      )}
      <span className="hidden sm:inline">Concluir</span>
    </Button>
  );
}
