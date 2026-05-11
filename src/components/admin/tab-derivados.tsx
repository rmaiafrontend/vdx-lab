"use client";

import {
  ArrowDown,
  ArrowUp,
  Box,
  Layers,
  Maximize2,
  Package,
  Plus,
  Sigma,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  blankComputedValue,
  moveItem,
  patchItem,
  removeItem,
  type FormComputedValue,
  type FormState,
} from "./form-state";
import { FormulaInput } from "./formula-input";

type Props = {
  form: FormState;
  setForm: (next: FormState) => void;
};

type Scope = FormComputedValue["scope"];

const SCOPES_VAO: Scope[] = ["VAO", "GROUP", "PIECE"];
const SCOPES_MEDIDA: Scope[] = ["ORCAMENTO_PECA"];

const SCOPE_LABELS: Record<Scope, string> = {
  VAO: "Vão",
  GROUP: "Grupo de peças",
  PIECE: "Peça",
  ORCAMENTO_PECA: "Em cada peça",
};

const SCOPE_STYLES: Record<
  Scope,
  {
    icon: React.ComponentType<{ className?: string }>;
    bg: string;
    text: string;
    border: string;
    description: string;
  }
> = {
  VAO: {
    icon: Maximize2,
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
    description: "Calculados uma vez por vão. Podem ser usados em qualquer fórmula.",
  },
  GROUP: {
    icon: Layers,
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    description:
      "Calculados uma vez por grupo de peças. Sabem o total de peças do grupo.",
  },
  PIECE: {
    icon: Box,
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    description:
      "Calculados para cada peça. Sabem a posição da peça no grupo (1ª, 2ª, última).",
  },
  ORCAMENTO_PECA: {
    icon: Package,
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
    description:
      "Calculados para cada peça do orçamento. Apenas no modo peça a peça.",
  },
};

function ScopeBadge({ scope }: { scope: Scope }) {
  const s = SCOPE_STYLES[scope];
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.bg} ${s.text} ${s.border}`}
    >
      <Icon className="size-3" />
      {SCOPE_LABELS[scope]}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </Label>
  );
}

export function TabDerivados({ form, setForm }: Props) {
  const update = (next: FormComputedValue[]) =>
    setForm({ ...form, computed_values: next });
  const patch = (id: string, p: Partial<FormComputedValue>) =>
    update(patchItem(form.computed_values, id, p));

  const groupCodes = form.piece_groups.map((g) => g.codigo).filter(Boolean);
  const SCOPES =
    form.modoDeProducao === "VAO" ? SCOPES_VAO : SCOPES_MEDIDA;

  const availableForScope = (cv: FormComputedValue) => {
    const variables = form.variables.map((v) => ({
      codigo: v.codigo,
      label: v.label,
    }));
    const cvsBefore = form.computed_values
      .filter((c) => c._id !== cv._id)
      .map((c) => ({ codigo: c.codigo, label: "derivado" }));
    const base = [...variables, ...cvsBefore];
    if (cv.scope === "VAO" || cv.scope === "ORCAMENTO_PECA") return base;
    if (cv.scope === "GROUP")
      return [...base, { codigo: "GROUP_TOTAL", label: "total do grupo" }];
    return [
      ...base,
      { codigo: "GROUP_TOTAL", label: "total do grupo" },
      { codigo: "INDEX", label: "índice da peça" },
      { codigo: "TOTAL", label: "total do grupo" },
      { codigo: "IS_FIRST", label: "é a primeira" },
      { codigo: "IS_LAST", label: "é a última" },
      { codigo: "ROLE", label: "tipo da peça" },
    ];
  };

  const grouped: Record<Scope, FormComputedValue[]> = {
    VAO: form.computed_values.filter((c) => c.scope === "VAO"),
    GROUP: form.computed_values.filter((c) => c.scope === "GROUP"),
    PIECE: form.computed_values.filter((c) => c.scope === "PIECE"),
    ORCAMENTO_PECA: form.computed_values.filter(
      (c) => c.scope === "ORCAMENTO_PECA"
    ),
  };

  const renderItem = (cv: FormComputedValue) => {
    const idx = form.computed_values.findIndex((c) => c._id === cv._id);
    const sameScope = grouped[cv.scope];
    const localIdx = sameScope.findIndex((c) => c._id === cv._id);
    const isFirstInScope = localIdx === 0;
    const isLastInScope = localIdx === sameScope.length - 1;

    return (
      <div
        key={cv._id}
        className="overflow-hidden rounded-xl border border-border/60 bg-card/40 shadow-sm transition-shadow hover:shadow-md"
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border/40 bg-muted/20 px-4 py-2.5">
          <ScopeBadge scope={cv.scope} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-mono text-sm font-semibold text-foreground">
              {cv.codigo || (
                <span className="font-sans text-muted-foreground">
                  (sem código)
                </span>
              )}
            </p>
            {(cv.scope === "GROUP" || cv.scope === "PIECE") &&
              cv.piece_group_codigo && (
                <p className="text-[11px] text-muted-foreground">
                  grupo:{" "}
                  <span className="font-mono">{cv.piece_group_codigo}</span>
                </p>
              )}
          </div>
          <div className="flex items-center gap-0.5">
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-muted-foreground hover:text-foreground"
              disabled={idx <= 0 || isFirstInScope}
              onClick={() =>
                update(moveItem(form.computed_values, cv._id, "up"))
              }
            >
              <ArrowUp className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-muted-foreground hover:text-foreground"
              disabled={
                idx >= form.computed_values.length - 1 || isLastInScope
              }
              onClick={() =>
                update(moveItem(form.computed_values, cv._id, "down"))
              }
            >
              <ArrowDown className="size-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="size-7 text-rose-400/70 hover:bg-rose-500/10 hover:text-rose-400"
              onClick={() => update(removeItem(form.computed_values, cv._id))}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-4 p-4">
          <div className="grid gap-3 md:grid-cols-[1fr_160px_200px]">
            <div className="space-y-1.5">
              <FieldLabel>Código</FieldLabel>
              <Input
                value={cv.codigo}
                onChange={(e) => patch(cv._id, { codigo: e.target.value })}
                className="h-9 font-mono"
                placeholder="Lutil"
                spellCheck={false}
              />
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Quando calcular?</FieldLabel>
              <Select
                value={cv.scope}
                onValueChange={(s) => {
                  const scope = s as Scope;
                  const requiresGroup = scope === "GROUP" || scope === "PIECE";
                  patch(cv._id, {
                    scope,
                    piece_group_codigo: requiresGroup
                      ? cv.piece_group_codigo ?? groupCodes[0] ?? null
                      : null,
                  });
                }}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPES.map((s) => {
                    const SIcon = SCOPE_STYLES[s].icon;
                    return (
                      <SelectItem key={s} value={s}>
                        <span className="inline-flex items-center gap-2">
                          <SIcon
                            className={`size-3.5 ${SCOPE_STYLES[s].text}`}
                          />
                          {SCOPE_LABELS[s]}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <FieldLabel>Grupo</FieldLabel>
              {cv.scope === "VAO" || cv.scope === "ORCAMENTO_PECA" ? (
                <Input
                  value="—"
                  disabled
                  className="h-9 text-center text-muted-foreground"
                />
              ) : (
                <Select
                  value={cv.piece_group_codigo ?? ""}
                  onValueChange={(g) => patch(cv._id, { piece_group_codigo: g })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="(escolha)" />
                  </SelectTrigger>
                  <SelectContent>
                    {groupCodes.length === 0 ? (
                      <SelectItem disabled value="__none">
                        nenhum grupo
                      </SelectItem>
                    ) : (
                      groupCodes.map((g) => (
                        <SelectItem key={g} value={g}>
                          {g}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <FieldLabel>Fórmula</FieldLabel>
            <FormulaInput
              value={cv.expression}
              onChange={(s) => patch(cv._id, { expression: s })}
              available={availableForScope(cv)}
              placeholder="ex.: Lvao - 2*Pcanto"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* ── Header da aba ── */}
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground">
            <Sigma className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">
              Cálculos auxiliares
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Fórmulas intermediárias reaproveitadas em outras fórmulas. Útil
              para evitar repetir contas.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() =>
            update([
              ...form.computed_values,
              {
                ...blankComputedValue(form.modoDeProducao),
                order_in_scope: form.computed_values.length + 1,
              },
            ])
          }
        >
          <Plus className="mr-1 size-4" />
          Novo cálculo
        </Button>
      </div>

      {/* ── Empty state global ── */}
      {form.computed_values.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/10 p-10 text-center">
          <Sigma className="size-6 text-muted-foreground/60" />
          <p className="text-sm font-medium text-muted-foreground">
            Nenhum cálculo auxiliar ainda
          </p>
          <p className="text-xs text-muted-foreground/70">
            Crie um cálculo auxiliar para reaproveitar fórmulas longas.
          </p>
        </div>
      )}

      {/* ── Seções por escopo ── */}
      {SCOPES.map((scope) => {
        const items = grouped[scope];
        if (items.length === 0 && form.computed_values.length === 0)
          return null;

        const s = SCOPE_STYLES[scope];
        const Icon = s.icon;

        return (
          <section key={scope} className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg border ${s.bg} ${s.border} ${s.text}`}
              >
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold tracking-tight">
                    {SCOPE_LABELS[scope]}
                  </h4>
                  <span className="rounded-md bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {items.length}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  {s.description}
                </p>
              </div>
            </div>

            {items.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border/40 bg-muted/5 px-3 py-3 text-center text-xs text-muted-foreground/70">
                nenhum cálculo neste escopo
              </p>
            ) : (
              <div className="space-y-3">{items.map(renderItem)}</div>
            )}
          </section>
        );
      })}
    </div>
  );
}
