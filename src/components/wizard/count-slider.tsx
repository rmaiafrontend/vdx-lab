"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import type { VariableSnapshot } from "@/lib/engine";
import { parseIntOr } from "./wizard-units";

type Props = {
  variable: VariableSnapshot;
  value: number;
  onChange: (value: number) => void;
};

export function CountSlider({ variable, value, onChange }: Props) {
  const min = parseIntOr(variable.minValue, 1);
  const max = parseIntOr(variable.maxValue, Math.max(min + 9, value + 5));

  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4 shadow-sm">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <Label
          htmlFor={`count-${variable.codigo}`}
          className="text-sm font-semibold tracking-tight"
        >
          {variable.label || variable.codigo}
        </Label>
        <span className="font-mono text-2xl font-semibold tabular-nums text-foreground">
          {value}
        </span>
      </div>
      <Slider
        id={`count-${variable.codigo}`}
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={(vals) => onChange(vals[0])}
        className="my-2"
      />
      <div className="mt-1 flex items-baseline justify-between text-[11px] text-muted-foreground">
        <span>
          mínimo <span className="font-mono">{min}</span>
        </span>
        <span>
          máximo <span className="font-mono">{max}</span>
        </span>
      </div>
    </div>
  );
}
