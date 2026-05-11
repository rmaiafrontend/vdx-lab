"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import type { VariableSnapshot } from "@/lib/engine";

type Props = {
  variable: VariableSnapshot;
  value: boolean;
  onChange: (value: boolean) => void;
};

export function BooleanToggle({ variable, value, onChange }: Props) {
  return (
    <label
      htmlFor={`bool-${variable.codigo}`}
      className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border/60 bg-card/30 px-3 py-2.5 transition-colors hover:bg-muted/40"
    >
      <div className="min-w-0">
        <Label
          htmlFor={`bool-${variable.codigo}`}
          className="cursor-pointer text-sm font-medium"
        >
          {variable.label || variable.codigo}
        </Label>
        {variable.label && variable.codigo !== variable.label && (
          <p className="font-mono text-[10px] text-muted-foreground">
            {variable.codigo}
          </p>
        )}
      </div>
      <Switch
        id={`bool-${variable.codigo}`}
        checked={value}
        onCheckedChange={onChange}
      />
    </label>
  );
}
