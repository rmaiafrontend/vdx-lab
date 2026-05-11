"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type Option = { codigo: string; label: string };

type Props = {
  value: Option[] | null | undefined;
  onChange: (next: Option[]) => void;
};

export function OptionListEditor({ value, onChange }: Props) {
  const options = value ?? [];

  const addOption = () =>
    onChange([...options, { codigo: "", label: "" }]);
  const patchOption = (i: number, p: Partial<Option>) =>
    onChange(options.map((o, idx) => (idx === i ? { ...o, ...p } : o)));
  const removeOption = (i: number) =>
    onChange(options.filter((_, idx) => idx !== i));

  const codigos = options.map((o) => o.codigo);
  const duplicates = new Set(
    codigos.filter((c, i) => c && codigos.indexOf(c) !== i)
  );

  return (
    <div className="space-y-2 rounded-lg border border-border/50 bg-muted/10 p-3">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Opções (código + nome para o vendedor)
        </Label>
        <Button size="sm" variant="ghost" onClick={addOption} className="h-7 px-2">
          <Plus className="mr-1 size-3" />
          Nova opção
        </Button>
      </div>
      {options.length === 0 && (
        <p className="rounded-md border border-dashed border-border/50 bg-background/30 p-3 text-center text-xs text-muted-foreground/70">
          Nenhuma opção. Adicione ao menos uma.
        </p>
      )}
      {options.map((o, i) => {
        const dup = duplicates.has(o.codigo);
        return (
          <div key={i} className="grid gap-2 md:grid-cols-[1fr_1.5fr_auto]">
            <Input
              value={o.codigo}
              onChange={(e) => patchOption(i, { codigo: e.target.value })}
              placeholder="INCOLOR"
              className={`h-8 font-mono text-xs ${
                dup ? "border-rose-500/60 focus-visible:ring-rose-500/30" : ""
              }`}
              spellCheck={false}
            />
            <Input
              value={o.label}
              onChange={(e) => patchOption(i, { label: e.target.value })}
              placeholder="Incolor"
              className="h-8 text-xs"
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => removeOption(i)}
              className="size-8 text-rose-400/70 hover:bg-rose-500/10 hover:text-rose-400"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        );
      })}
      {duplicates.size > 0 && (
        <p className="text-[11px] text-rose-400">
          Códigos duplicados detectados.
        </p>
      )}
    </div>
  );
}
