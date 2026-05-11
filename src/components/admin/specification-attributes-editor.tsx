"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  SpecificationAttributeDef,
  SpecificationAttributeType,
} from "@/lib/engine";

const TYPES: SpecificationAttributeType[] = [
  "integer",
  "number",
  "string",
  "boolean",
  "option",
];

const TYPE_LABELS: Record<SpecificationAttributeType, string> = {
  integer: "Número inteiro",
  number: "Número",
  string: "Texto",
  boolean: "Sim / Não",
  option: "Escolha entre opções",
};

type AttrMap = Record<string, SpecificationAttributeDef>;

type Props = {
  value: AttrMap;
  onChange: (next: AttrMap) => void;
  /** Variáveis e ComputedValues disponíveis para `source`. */
  sourceCandidates: string[];
};

type Row = { name: string; def: SpecificationAttributeDef };

export function SpecificationAttributesEditor({
  value,
  onChange,
  sourceCandidates,
}: Props) {
  const rows: Row[] = Object.entries(value).map(([name, def]) => ({ name, def }));

  const update = (next: Row[]) => {
    const out: AttrMap = {};
    for (const r of next) {
      if (!r.name.trim()) continue;
      out[r.name] = r.def;
    }
    onChange(out);
  };

  const addRow = () =>
    update([
      ...rows,
      { name: `attr${rows.length + 1}`, def: { type: "number" } },
    ]);

  const patchRow = (i: number, patch: Partial<Row>) => {
    const next = rows.map((r, idx) =>
      idx === i ? { ...r, ...patch, def: { ...r.def, ...(patch.def ?? {}) } } : r
    );
    update(next);
  };

  const removeRow = (i: number) =>
    update(rows.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2 rounded-lg border border-border/50 bg-muted/10 p-3">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Detalhes da especificação
        </Label>
        <Button size="sm" variant="ghost" onClick={addRow} className="h-7 px-2">
          <Plus className="mr-1 size-3" />
          Novo detalhe
        </Button>
      </div>

      {rows.length === 0 && (
        <p className="rounded-md border border-dashed border-border/50 bg-background/30 p-3 text-center text-xs text-muted-foreground/70">
          Sem detalhes. Adicione ao menos um.
        </p>
      )}

      {rows.length > 0 && (
        <div className="grid gap-2 px-2 md:grid-cols-[1fr_120px_1fr_auto]">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            Nome
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            Tipo
          </span>
          <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground/70">
            Origem (vem de uma variável)
          </span>
          <span />
        </div>
      )}

      {rows.map((row, i) => (
        <div
          key={i}
          className="space-y-2 rounded-md border border-border/40 bg-background/30 p-2"
        >
          <div className="grid gap-2 md:grid-cols-[1fr_120px_1fr_auto]">
            <Input
              value={row.name}
              onChange={(e) => patchRow(i, { name: e.target.value })}
              placeholder="qtdTorres"
              className="h-8 font-mono text-xs"
              spellCheck={false}
            />
            <Select
              value={row.def.type}
              onValueChange={(t) =>
                patchRow(i, {
                  def: { type: t as SpecificationAttributeType },
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={row.def.source ?? "__none"}
              onValueChange={(s) =>
                patchRow(i, {
                  def: { ...row.def, source: s === "__none" ? undefined : s },
                })
              }
            >
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="(sem origem)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none" className="text-xs">
                  (sem origem)
                </SelectItem>
                {sourceCandidates.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs font-mono">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => removeRow(i)}
              className="size-8 text-rose-400/70 hover:bg-rose-500/10 hover:text-rose-400"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <label className="flex cursor-pointer items-center gap-1.5">
              <Switch
                checked={row.def.required ?? false}
                onCheckedChange={(b) =>
                  patchRow(i, {
                    def: { ...row.def, required: b },
                  })
                }
                className="scale-75"
              />
              <span className="text-muted-foreground">obrigatório</span>
            </label>
            {(row.def.type === "integer" || row.def.type === "number") && (
              <>
                <Input
                  type="number"
                  value={row.def.min ?? ""}
                  onChange={(e) =>
                    patchRow(i, {
                      def: {
                        ...row.def,
                        min:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      },
                    })
                  }
                  placeholder="mínimo"
                  className="h-7 w-20 text-xs"
                />
                <Input
                  type="number"
                  value={row.def.max ?? ""}
                  onChange={(e) =>
                    patchRow(i, {
                      def: {
                        ...row.def,
                        max:
                          e.target.value === ""
                            ? undefined
                            : Number(e.target.value),
                      },
                    })
                  }
                  placeholder="máximo"
                  className="h-7 w-20 text-xs"
                />
              </>
            )}
            <Input
              value={
                row.def.default !== undefined ? String(row.def.default) : ""
              }
              onChange={(e) =>
                patchRow(i, {
                  def: {
                    ...row.def,
                    default: e.target.value === "" ? undefined : e.target.value,
                  },
                })
              }
              placeholder="padrão"
              className="h-7 flex-1 text-xs"
            />
          </div>
        </div>
      ))}
    </div>
  );
}
