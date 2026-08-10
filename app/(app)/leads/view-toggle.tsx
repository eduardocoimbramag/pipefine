"use client";

import { LayoutList, Columns3 } from "lucide-react";
import { ViewToggle as BaseViewToggle } from "@/components/view-toggle";

type LeadsView = "lista" | "kanban";

/** Kanban é a visão padrão (sem parâmetro); lista usa ?view=lista. */
export function ViewToggle({ view }: { view: LeadsView }) {
  return (
    <BaseViewToggle<LeadsView>
      value={view}
      defaultView="kanban"
      options={[
        { key: "kanban", label: "Kanban", icon: Columns3 },
        { key: "lista", label: "Lista", icon: LayoutList },
      ]}
    />
  );
}
