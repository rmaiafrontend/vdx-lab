"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Unit, VariableSnapshot } from "@/lib/engine";
import {
  fmtNumber,
  fromMm,
  isDimensionUnit,
  parseFloatOr,
  toMm,
  UNIT_OPTIONS,
} from "./wizard-units";

type Props = {
  variable: VariableSnapshot;
  /** valor canônico em mm */
  valueMm: number;
  onChangeMm: (valueMm: number) => void;
};

export function DimensionInput({ variable, valueMm, onChangeMm }: Props) {
  const initialUnit: Unit = isDimensionUnit(variable.unit) ? variable.unit : "mm";
  const [unit, setUnit] = useState<Unit>(initialUnit);

  const minMm = variable.minValue ? parseFloatOr(variable.minValue, 0) : null;
  const maxMm = variable.maxValue ? parseFloatOr(variable.maxValue, 0) : null;
  const outOfRange =
    (minMm !== null && valueMm < minMm) ||
    (maxMm !== null && valueMm > maxMm);

  // Valor em display, na unidade escolhida
  const displayValue = fromMm(valueMm, unit);
  // Quantas casas mostrar conforme a unidade (mm sem casas, cm 1, m 3 — visual confortável)
  const displayDecimals = unit === "mm" ? 0 : unit === "cm" ? 1 : 3;

  // Use string para o input para permitir edição livre
  const [text, setText] = useState<string>(
    fmtPlain(displayValue, displayDecimals)
  );
  // re-sync se o pai mudar valueMm fora (ex.: deep link)
  // ou se a unidade mudar
  // Nota: mantemos o text quando o usuário está digitando.
  // Estratégia simples: sincronizar quando muda unit.
  // Re-sync ao trocar unit
  // (não disparar quando text muda)
  // Implementar via useEffect leve
  // ─────────────
  // Trocar unidade: re-sync display do valueMm na nova unidade
  const handleUnitChange = (next: string) => {
    if (!isDimensionUnit(next)) return;
    setUnit(next);
    setText(fmtPlain(fromMm(valueMm, next), next === "mm" ? 0 : next === "cm" ? 1 : 3));
  };

  const handleTextChange = (raw: string) => {
    setText(raw);
    // aceita vírgula como decimal
    const normalized = raw.replace(",", ".");
    const num = Number(normalized);
    if (Number.isFinite(num)) {
      onChangeMm(toMm(num, unit));
    }
  };

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4 shadow-sm">
      <Label
        htmlFor={`dim-${variable.codigo}`}
        className="text-sm font-semibold tracking-tight"
      >
        {variable.label || variable.codigo}
      </Label>
      <div className="mt-3 flex items-stretch gap-2">
        <Input
          id={`dim-${variable.codigo}`}
          type="number"
          inputMode="decimal"
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          className={`h-11 flex-1 text-base font-semibold tabular-nums ${
            outOfRange
              ? "border-destructive ring-1 ring-destructive/40"
              : ""
          }`}
          aria-invalid={outOfRange}
        />
        <Select value={unit} onValueChange={handleUnitChange}>
          <SelectTrigger className="h-11 w-20 shrink-0 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNIT_OPTIONS.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {/* Range em mm para referência */}
      {(minMm !== null || maxMm !== null) && (
        <p
          className={`mt-2 text-[11px] ${
            outOfRange ? "text-destructive" : "text-muted-foreground"
          }`}
          aria-live="polite"
        >
          {outOfRange ? "fora do intervalo · " : ""}
          {minMm !== null && (
            <>
              mínimo <span className="font-mono">{fmtNumber(minMm)}</span> mm
            </>
          )}
          {minMm !== null && maxMm !== null && " · "}
          {maxMm !== null && (
            <>
              máximo <span className="font-mono">{fmtNumber(maxMm)}</span> mm
            </>
          )}
        </p>
      )}
    </div>
  );
}

function fmtPlain(n: number, decimals: number): string {
  if (!Number.isFinite(n)) return "";
  return n.toFixed(decimals);
}
