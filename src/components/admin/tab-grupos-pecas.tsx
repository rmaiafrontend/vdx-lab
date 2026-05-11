"use client";

import { useMemo } from "react";
import {
  ArrowDown,
  ArrowUp,
  Boxes,
  CheckCircle2,
  Layers,
  Plus,
  Puzzle,
  Trash2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  blankPieceGroup,
  blankPieceRole,
  moveItem,
  patchItem,
  removeItem,
  type FormPieceGroup,
  type FormPieceRole,
  type FormState,
} from "./form-state";
import { FormulaInput } from "./formula-input";
import { SelectorPicker } from "./selector-picker";
import { payloadToSnapshot } from "@/lib/snapshot";
import { formToPayload } from "./form-state";
import { validateTipologia } from "@/lib/engine";

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

export function TabGruposPecas({ form, setForm }: Props) {
  const updateGroups = (next: FormPieceGroup[]) =>
    setForm({ ...form, piece_groups: next });
  const patchGroup = (id: string, p: Partial<FormPieceGroup>) =>
    updateGroups(patchItem(form.piece_groups, id, p));

  const variableTokens = form.variables.map((v) => ({
    codigo: v.codigo,
    label: v.label,
  }));
  const computedVaoTokens = form.computed_values
    .filter((c) => c.scope === "VAO")
    .map((c) => ({ codigo: c.codigo, label: "derivado" }));
  const builtinGroupTokens = [
    { codigo: "GROUP_TOTAL", label: "total do grupo" },
    { codigo: "INDEX", label: "índice da peça" },
    { codigo: "TOTAL", label: "total do grupo" },
    { codigo: "IS_FIRST", label: "é a primeira" },
    { codigo: "IS_LAST", label: "é a última" },
    { codigo: "ROLE", label: "tipo da peça" },
  ];

  const issuesByGroup = useMemo(() => {
    try {
      const snap = payloadToSnapshot(formToPayload(form));
      const issues = validateTipologia(snap);
      const map = new Map<string, string[]>();
      for (const i of issues) {
        if (!i.code.startsWith("SELECTOR_")) continue;
        const groupCode =
          (i.context as { group_code?: string })?.group_code ?? null;
        if (!groupCode) continue;
        const arr = map.get(groupCode) ?? [];
        arr.push(`${i.code}: ${i.message}`);
        map.set(groupCode, arr);
      }
      return map;
    } catch {
      return new Map<string, string[]>();
    }
  }, [form]);

  return (
    <div className="space-y-4">
      {/* ── Header da aba ── */}
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground">
            <Boxes className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">
              Grupos &amp; peças
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Como o produto se divide em grupos de peças e quais tipos de
              peças existem dentro de cada grupo.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() =>
            updateGroups([
              ...form.piece_groups,
              { ...blankPieceGroup(), ordem: form.piece_groups.length + 1 },
            ])
          }
        >
          <Plus className="mr-1 size-4" />
          Novo grupo
        </Button>
      </div>

      {/* ── Empty state ── */}
      {form.piece_groups.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/10 p-10 text-center">
          <Boxes className="size-6 text-muted-foreground/60" />
          <p className="text-sm font-medium text-muted-foreground">
            Nenhum grupo ainda
          </p>
          <p className="text-xs text-muted-foreground/70">
            Adicione ao menos um grupo para começar a montar as peças.
          </p>
        </div>
      )}

      {/* ── Cards de grupos ── */}
      {form.piece_groups.map((g, gIdx) => {
        const updateRoles = (next: FormPieceRole[]) =>
          patchGroup(g._id, { piece_roles: next });
        const patchRole = (rid: string, p: Partial<FormPieceRole>) =>
          updateRoles(patchItem(g.piece_roles, rid, p));

        const issues = issuesByGroup.get(g.codigo) ?? [];
        const isClean = g.codigo !== "" && issues.length === 0;
        const hasIssues = issues.length > 0;

        return (
          <div
            key={g._id}
            className="overflow-hidden rounded-xl border border-border/60 bg-card/40 shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Header do grupo */}
            <div className="flex items-center gap-3 border-b border-border/40 bg-muted/20 px-4 py-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/60 font-mono text-[11px] font-medium text-muted-foreground">
                {gIdx + 1}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-400">
                <Layers className="size-3" />
                Grupo
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {g.label || (
                    <span className="text-muted-foreground">(sem nome)</span>
                  )}
                </p>
                <p className="font-mono text-[11px] text-muted-foreground">
                  {g.codigo || "(sem código)"}
                </p>
              </div>

              {isClean && (
                <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400">
                  <CheckCircle2 className="size-3" />
                  tipos de peças ok
                </span>
              )}
              {hasIssues && (
                <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-400">
                  <XCircle className="size-3" />
                  {issues.length} problema{issues.length > 1 ? "s" : ""}
                </span>
              )}

              <div className="flex items-center gap-0.5">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  disabled={gIdx === 0}
                  onClick={() =>
                    updateGroups(moveItem(form.piece_groups, g._id, "up"))
                  }
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  disabled={gIdx === form.piece_groups.length - 1}
                  onClick={() =>
                    updateGroups(moveItem(form.piece_groups, g._id, "down"))
                  }
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-rose-400/70 hover:bg-rose-500/10 hover:text-rose-400"
                  onClick={() =>
                    updateGroups(removeItem(form.piece_groups, g._id))
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Body do grupo */}
            <div className="space-y-4 p-4">
              {/* Identificação */}
              <div className="grid gap-3 md:grid-cols-[160px_1fr_1fr]">
                <div className="space-y-1.5">
                  <FieldLabel>Código</FieldLabel>
                  <Input
                    value={g.codigo}
                    onChange={(e) =>
                      patchGroup(g._id, { codigo: e.target.value })
                    }
                    className="h-9 font-mono"
                    placeholder="FOLHAS"
                    spellCheck={false}
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Nome exibido</FieldLabel>
                  <Input
                    value={g.label}
                    onChange={(e) =>
                      patchGroup(g._id, { label: e.target.value })
                    }
                    className="h-9"
                    placeholder="Folhas da varanda"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Quantidade de peças</FieldLabel>
                  <FormulaInput
                    value={g.quantity_expression}
                    onChange={(s) =>
                      patchGroup(g._id, { quantity_expression: s })
                    }
                    available={[...variableTokens, ...computedVaoTokens]}
                    placeholder="Nfolhas"
                  />
                </div>
              </div>

              {/* Issues panel */}
              {hasIssues && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs">
                  <p className="flex items-center gap-1.5 font-semibold text-rose-400">
                    <XCircle className="size-3.5" />
                    Problemas nos tipos de peças
                  </p>
                  <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-rose-300/90">
                    {issues.slice(0, 5).map((m, i) => (
                      <li key={i} className="font-mono text-[11px]">
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Subseção: Tipos de peças */}
              <div className="rounded-lg border border-border/40 bg-muted/10 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Puzzle className="size-4 text-muted-foreground" />
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Tipos de peças
                    </span>
                    <span className="rounded-md bg-muted/50 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {g.piece_roles.length}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() =>
                      updateRoles([
                        ...g.piece_roles,
                        {
                          ...blankPieceRole(),
                          ordem: g.piece_roles.length + 1,
                        },
                      ])
                    }
                  >
                    <Plus className="mr-1 size-3" />
                    Novo tipo de peça
                  </Button>
                </div>

                {g.piece_roles.length === 0 ? (
                  <p className="rounded-md border border-dashed border-border/40 bg-background/40 px-3 py-4 text-center text-xs text-muted-foreground/70">
                    nenhum tipo de peça neste grupo
                  </p>
                ) : (
                  <div className="space-y-2">
                    {g.piece_roles.map((r, rIdx) => (
                      <div
                        key={r._id}
                        className="overflow-hidden rounded-lg border border-border/50 bg-background/40"
                      >
                        {/* Header do tipo de peça */}
                        <div className="flex items-center gap-2 border-b border-border/40 bg-muted/10 px-3 py-2">
                          <span className="flex size-5 shrink-0 items-center justify-center rounded bg-muted/60 font-mono text-[10px] font-medium text-muted-foreground">
                            {rIdx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-semibold text-foreground">
                              {r.label || (
                                <span className="text-muted-foreground">
                                  (sem nome)
                                </span>
                              )}
                            </p>
                            {r.codigo && (
                              <p className="font-mono text-[10px] text-muted-foreground">
                                {r.codigo}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-6 text-muted-foreground hover:text-foreground"
                              disabled={rIdx === 0}
                              onClick={() =>
                                updateRoles(
                                  moveItem(g.piece_roles, r._id, "up")
                                )
                              }
                            >
                              <ArrowUp className="size-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-6 text-muted-foreground hover:text-foreground"
                              disabled={rIdx === g.piece_roles.length - 1}
                              onClick={() =>
                                updateRoles(
                                  moveItem(g.piece_roles, r._id, "down")
                                )
                              }
                            >
                              <ArrowDown className="size-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="size-6 text-rose-400/70 hover:bg-rose-500/10 hover:text-rose-400"
                              onClick={() =>
                                updateRoles(removeItem(g.piece_roles, r._id))
                              }
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Body do tipo de peça */}
                        <div className="space-y-3 p-3">
                          <div className="grid gap-3 md:grid-cols-[140px_1fr]">
                            <div className="space-y-1.5">
                              <FieldLabel>Código</FieldLabel>
                              <Input
                                value={r.codigo}
                                onChange={(e) =>
                                  patchRole(r._id, { codigo: e.target.value })
                                }
                                className="h-8 font-mono text-xs"
                                placeholder="CANTO_ESQ"
                                spellCheck={false}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <FieldLabel>Nome exibido</FieldLabel>
                              <Input
                                value={r.label}
                                onChange={(e) =>
                                  patchRole(r._id, { label: e.target.value })
                                }
                                className="h-8 text-xs"
                                placeholder="Canto esquerdo"
                              />
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            <FieldLabel>
                              Quando este tipo de peça se aplica? (opcional)
                            </FieldLabel>
                            <FormulaInput
                              value={r.condition ?? ""}
                              onChange={(s) =>
                                patchRole(r._id, {
                                  condition: s === "" ? null : s,
                                })
                              }
                              available={[
                                ...variableTokens,
                                ...computedVaoTokens,
                              ]}
                              allowEmpty
                              placeholder="ex.: TipoInstalacao == 'U'"
                            />
                          </div>

                          <div className="grid gap-3 md:grid-cols-3">
                            <div className="space-y-1.5">
                              <FieldLabel>Quais peças do grupo?</FieldLabel>
                              <SelectorPicker
                                kind={r.selector_kind}
                                value={r.selector_value ?? null}
                                onChange={({ kind, value }) =>
                                  patchRole(r._id, {
                                    selector_kind: kind,
                                    selector_value: value,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <FieldLabel>Fórmula da largura (mm)</FieldLabel>
                              <FormulaInput
                                value={r.width_expression}
                                onChange={(s) =>
                                  patchRole(r._id, { width_expression: s })
                                }
                                available={[
                                  ...variableTokens,
                                  ...computedVaoTokens,
                                  ...builtinGroupTokens,
                                ]}
                                placeholder="Lfolha"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <FieldLabel>Fórmula da altura (mm)</FieldLabel>
                              <FormulaInput
                                value={r.height_expression}
                                onChange={(s) =>
                                  patchRole(r._id, { height_expression: s })
                                }
                                available={[
                                  ...variableTokens,
                                  ...computedVaoTokens,
                                  ...builtinGroupTokens,
                                ]}
                                placeholder="Afolha"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
