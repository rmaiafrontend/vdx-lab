"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { VariableSnapshot } from "@/lib/engine";

type Props = {
  variable: VariableSnapshot;
  value: number;
  onChange: (value: number) => void;
};

export function ParamInput({ variable, value, onChange }: Props) {
  return (
    <div className="rounded-lg border border-border/60 bg-card/30 p-3">
      <Label
        htmlFor={`param-${variable.codigo}`}
        className="text-xs font-medium text-muted-foreground"
      >
        {variable.label || variable.codigo}
        {variable.unit && (
          <span className="ml-1 text-[10px] text-muted-foreground/70">
            ({variable.unit})
          </span>
        )}
      </Label>
      <Input
        id={`param-${variable.codigo}`}
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => {
          const num = Number(e.target.value.replace(",", "."));
          if (Number.isFinite(num)) onChange(num);
        }}
        className="mt-1 h-9 font-mono text-sm"
      />
    </div>
  );
}
