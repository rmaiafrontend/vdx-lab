"use client";

import type { VariableSnapshot, VariableValue } from "@/lib/engine";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BooleanToggle } from "./boolean-toggle";
import { CountSlider } from "./count-slider";
import { DimensionInput } from "./dimension-input";
import { ParamInput } from "./param-input";

type Props = {
  variable: VariableSnapshot;
  value: VariableValue;
  onChange: (value: VariableValue) => void;
};

export function VariableInput({ variable, value, onChange }: Props) {
  switch (variable.kind) {
    case "COUNT":
      return (
        <CountSlider
          variable={variable}
          value={typeof value === "number" ? value : 0}
          onChange={(n) => onChange(n)}
        />
      );
    case "DIMENSION":
      return (
        <DimensionInput
          variable={variable}
          valueMm={typeof value === "number" ? value : 0}
          onChangeMm={(n) => onChange(n)}
        />
      );
    case "BOOLEAN":
      return (
        <BooleanToggle
          variable={variable}
          value={typeof value === "boolean" ? value : false}
          onChange={(b) => onChange(b)}
        />
      );
    case "TECHNICAL_PARAM":
      return (
        <ParamInput
          variable={variable}
          value={typeof value === "number" ? value : 0}
          onChange={(n) => onChange(n)}
        />
      );
    case "OPTION_LIST":
      return (
        <OptionListSelect
          variable={variable}
          value={typeof value === "string" ? value : ""}
          onChange={(s) => onChange(s)}
        />
      );
    default:
      return null;
  }
}

function OptionListSelect({
  variable,
  value,
  onChange,
}: {
  variable: VariableSnapshot;
  value: string;
  onChange: (s: string) => void;
}) {
  const options = variable.options ?? [];
  const current = value || options[0]?.codigo || "";
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4 shadow-sm">
      <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {variable.label}
      </Label>
      <div className="mt-2">
        <Select value={current} onValueChange={onChange}>
          <SelectTrigger className="h-11 w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o.codigo} value={o.codigo}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
