"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/form/field";
import {
  CLIENT_SEGMENTS,
  CLIENT_SEGMENT_LABELS,
  type ClientSegment,
} from "@/types";

/**
 * Campos "Tipo de cliente" (Social / Corporativo) + "Nome da empresa" (só
 * quando corporativo). Envia `segmento` e `nome_empresa` no FormData.
 * Use dentro de um grid de 2 colunas: cada campo ocupa uma célula.
 */
export function ClientSegmentFields({
  defaultSegmento,
  defaultNomeEmpresa,
  idPrefix = "",
}: {
  defaultSegmento?: ClientSegment | null;
  defaultNomeEmpresa?: string | null;
  /** Prefixo dos ids (evita colisão se houver mais de um formulário na tela). */
  idPrefix?: string;
}) {
  const [segmento, setSegmento] = useState<ClientSegment>(
    defaultSegmento ?? "social",
  );

  return (
    <>
      <Field label="Tipo de cliente" required>
        {/* Radix Select não envia value via name nativo → input oculto. */}
        <input type="hidden" name="segmento" value={segmento} />
        <Select
          value={segmento}
          onValueChange={(v) => setSegmento(v as ClientSegment)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CLIENT_SEGMENTS.map((s) => (
              <SelectItem key={s} value={s}>
                {CLIENT_SEGMENT_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {segmento === "corporativo" && (
        <Field
          label="Nome da empresa"
          htmlFor={`${idPrefix}nome_empresa`}
          required
        >
          <Input
            id={`${idPrefix}nome_empresa`}
            name="nome_empresa"
            defaultValue={defaultNomeEmpresa ?? ""}
            required
          />
        </Field>
      )}
    </>
  );
}
