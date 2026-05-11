"use client";

import {
  ArrowDown,
  ArrowUp,
  ClipboardList,
  Plus,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  blankSpecificationTemplate,
  moveItem,
  patchItem,
  removeItem,
  type FormSpecificationTemplate,
  type FormState,
} from "./form-state";
import { SpecificationAttributesEditor } from "./specification-attributes-editor";

type Props = {
  form: FormState;
  setForm: (next: FormState) => void;
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </Label>
  );
}

export function TabEspecificacoes({ form, setForm }: Props) {
  const updateTemplates = (next: FormSpecificationTemplate[]) =>
    setForm({ ...form, specification_templates: next });
  const patch = (id: string, p: Partial<FormSpecificationTemplate>) =>
    updateTemplates(patchItem(form.specification_templates, id, p));

  const sourceCandidates = [
    ...form.variables.map((v) => v.codigo).filter(Boolean),
    ...form.computed_values
      .filter((c) => c.scope === "ORCAMENTO_PECA")
      .map((c) => c.codigo)
      .filter(Boolean),
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground">
            <ClipboardList className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">
              Especificações técnicas
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Modelos de furação, recortes e polimentos que cada peça pode
              receber. Aparecem na ficha de produção e podem entrar em regras
              de preço.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() =>
            updateTemplates([
              ...form.specification_templates,
              {
                ...blankSpecificationTemplate(),
                ordem: form.specification_templates.length + 1,
              },
            ])
          }
        >
          <Plus className="mr-1 size-4" />
          Nova especificação
        </Button>
      </div>

      {form.specification_templates.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/10 p-10 text-center">
          <ClipboardList className="size-6 text-muted-foreground/60" />
          <p className="text-sm font-medium text-muted-foreground">
            Nenhuma especificação ainda
          </p>
          <p className="text-xs text-muted-foreground/70">
            Crie uma especificação para descrever furações, recortes ou
            polimentos.
          </p>
        </div>
      )}

      {form.specification_templates.map((s, idx) => (
        <div
          key={s._id}
          className="overflow-hidden rounded-xl border border-border/60 bg-card/40 shadow-sm"
        >
          <div className="flex items-center gap-3 border-b border-border/40 bg-muted/20 px-4 py-2.5">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/60 font-mono text-[11px] font-medium text-muted-foreground">
              {idx + 1}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-400">
              <ClipboardList className="size-3" />
              Especificação
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground">
                {s.label || (
                  <span className="text-muted-foreground">(sem nome)</span>
                )}
              </p>
              {s.codigo && (
                <p className="font-mono text-[11px] text-muted-foreground">
                  {s.codigo}
                </p>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-muted-foreground hover:text-foreground"
                disabled={idx === 0}
                onClick={() =>
                  updateTemplates(
                    moveItem(form.specification_templates, s._id, "up")
                  )
                }
              >
                <ArrowUp className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-muted-foreground hover:text-foreground"
                disabled={idx === form.specification_templates.length - 1}
                onClick={() =>
                  updateTemplates(
                    moveItem(form.specification_templates, s._id, "down")
                  )
                }
              >
                <ArrowDown className="size-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-rose-400/70 hover:bg-rose-500/10 hover:text-rose-400"
                onClick={() =>
                  updateTemplates(
                    removeItem(form.specification_templates, s._id)
                  )
                }
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          </div>

          <div className="space-y-4 p-4">
            <div className="grid gap-3 md:grid-cols-[160px_1fr_120px_120px]">
              <div className="space-y-1.5">
                <FieldLabel>Código</FieldLabel>
                <Input
                  value={s.codigo}
                  onChange={(e) => patch(s._id, { codigo: e.target.value })}
                  className="h-9 font-mono"
                  placeholder="FURACAO"
                  spellCheck={false}
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Nome exibido</FieldLabel>
                <Input
                  value={s.label}
                  onChange={(e) => patch(s._id, { label: e.target.value })}
                  className="h-9"
                  placeholder="Furação por torre"
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Quantidade mínima por peça</FieldLabel>
                <Input
                  type="number"
                  value={s.required_min}
                  onChange={(e) =>
                    patch(s._id, { required_min: Number(e.target.value) })
                  }
                  className="h-9"
                />
              </div>
              <div className="space-y-1.5">
                <FieldLabel>Quantidade máxima por peça</FieldLabel>
                <Input
                  type="number"
                  value={s.required_max ?? ""}
                  onChange={(e) =>
                    patch(s._id, {
                      required_max:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  placeholder="(sem limite)"
                  className="h-9"
                />
              </div>
            </div>

            <SpecificationAttributesEditor
              value={s.schema_atributos as Record<string, never>}
              onChange={(v) => patch(s._id, { schema_atributos: v })}
              sourceCandidates={sourceCandidates}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
