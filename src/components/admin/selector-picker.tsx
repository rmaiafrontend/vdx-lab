"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { selectorRequiresValue, type SelectorKind } from "@/lib/engine";

const SELECTOR_OPTIONS: { value: SelectorKind; label: string; hint: string }[] =
  [
    { value: "ALL", label: "Todas", hint: "todos os índices" },
    { value: "FIRST", label: "Primeira", hint: "índice 1" },
    { value: "LAST", label: "Última", hint: "índice TOTAL" },
    { value: "FIRST_AND_LAST", label: "Primeira e última", hint: "1 e TOTAL" },
    {
      value: "EXCEPT_FIRST_LAST",
      label: "Exceto primeira/última",
      hint: "2..TOTAL-1",
    },
    { value: "INDEX", label: "Posição específica", hint: "ex.: 3" },
    { value: "INDEX_LIST", label: "Lista de posições", hint: "ex.: 1,3,5" },
    {
      value: "RANGE",
      label: "Intervalo",
      hint: "ex.: 2..N-1 (segunda até a penúltima)",
    },
    { value: "ODD", label: "Ímpares", hint: "posições ímpares" },
    { value: "EVEN", label: "Pares", hint: "posições pares" },
    {
      value: "EXPRESSION",
      label: "Fórmula",
      hint: "ex.: INDEX % 2 == 0",
    },
  ];

const PLACEHOLDER: Partial<Record<SelectorKind, string>> = {
  INDEX: "ex.: 3",
  INDEX_LIST: "ex.: 1,3,5",
  RANGE: "ex.: 2..N-1",
  EXPRESSION: "ex.: INDEX % 2 == 0",
};

type Props = {
  kind: SelectorKind;
  value: string | null;
  onChange: (next: { kind: SelectorKind; value: string | null }) => void;
};

export function SelectorPicker({ kind, value, onChange }: Props) {
  const requires = selectorRequiresValue(kind);
  const opt = SELECTOR_OPTIONS.find((o) => o.value === kind);

  return (
    <div className="space-y-2">
      <Select
        value={kind}
        onValueChange={(v) => {
          const nextKind = v as SelectorKind;
          const nextValue = selectorRequiresValue(nextKind) ? value ?? "" : null;
          onChange({ kind: nextKind, value: nextValue });
        }}
      >
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SELECTOR_OPTIONS.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              <span className="font-mono">{o.label}</span>
              <span className="ml-2 text-xs text-muted-foreground">
                {o.hint}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {requires ? (
        <Input
          value={value ?? ""}
          onChange={(e) =>
            onChange({ kind, value: e.target.value === "" ? null : e.target.value })
          }
          placeholder={PLACEHOLDER[kind] ?? ""}
          className="font-mono text-sm"
          spellCheck={false}
          autoComplete="off"
        />
      ) : (
        <p className="text-[11px] text-muted-foreground">
          {opt?.hint ?? ""}
        </p>
      )}
    </div>
  );
}
