"use client";

import { useEffect, useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";
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
  FormulaError,
  SelectorError,
  ValidationError,
  runPipeline,
  type CalcOutput,
  type Unit,
  type VariableValue,
  type TipologiaVaoSnapshot,
} from "@/lib/engine";
import { payloadToSnapshot } from "@/lib/snapshot";
import { buildEmbedVars, getRenderConfig } from "@/lib/render-mapping";
import { formToPayload, type FormState } from "./form-state";
import { Diagrama } from "@/components/wizard/diagrama";
import { TipologiaRender } from "@/components/wizard/tipologia-render";
import { BreakdownPanel, TracePanel, clientLookups } from "./simulador-shared";

type Props = { form: FormState };
type Inputs = Record<string, VariableValue>;

export function SimuladorVao({ form }: Props) {
  const [inputs, setInputs] = useState<Inputs>(() => initialInputs(form));
  const [unit] = useState<Unit>("mm");
  const [debounced, setDebounced] = useState<Inputs>(inputs);
  const [vidroId, setVidroId] = useState<number | null>(
    form.vidros_elegiveis[0]?.id ?? null
  );
  const [output, setOutput] = useState<CalcOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const snapshot = useMemo<TipologiaVaoSnapshot | null>(() => {
    try {
      const snap = payloadToSnapshot(formToPayload(form));
      if (snap.modo !== "VAO") return null;
      // payloadToSnapshot esvazia vidrosElegiveis (só serve para validação);
      // injetamos os vidros do form para o simulador conseguir precificar.
      return { ...snap, vidrosElegiveis: form.vidros_elegiveis };
    } catch {
      return null;
    }
  }, [form]);

  useEffect(() => {
    setInputs((prev) => mergeInputs(prev, form));
    setVidroId((prev) => {
      if (prev !== null && form.vidros_elegiveis.some((v) => v.id === prev)) {
        return prev;
      }
      return form.vidros_elegiveis[0]?.id ?? null;
    });
  }, [form]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(inputs), 300);
    return () => clearTimeout(t);
  }, [inputs]);

  useEffect(() => {
    if (!snapshot) {
      setOutput(null);
      setError("Tipologia inválida ou não é modo VAO.");
      return;
    }
    try {
      const result = runPipeline({
        tipologia: snapshot,
        variables: debounced,
        unit,
        vidro: vidroId !== null ? { vidroId } : undefined,
        lookups: clientLookups(form.vidros_elegiveis),
      });
      setOutput(result);
      setError(null);
    } catch (err) {
      setOutput(null);
      if (
        err instanceof FormulaError ||
        err instanceof SelectorError ||
        err instanceof ValidationError
      ) {
        setError(`${err.code}: ${err.message}`);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(String(err));
      }
    }
  }, [debounced, snapshot, unit, vidroId, form.vidros_elegiveis]);

  const variables = useMemo(() => sortVariablesForWizard(form), [form]);
  const dimVars = variables.filter((v) => v.kind === "DIMENSION");
  const countVars = variables.filter((v) => v.kind === "COUNT");
  const optionVars = variables.filter((v) => v.kind === "OPTION_LIST");
  const otherVars = variables.filter(
    (v) =>
      v.kind !== "DIMENSION" &&
      v.kind !== "COUNT" &&
      v.kind !== "OPTION_LIST"
  );

  return (
    <div className="sticky top-4 space-y-3">
      <div className="rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">
            Simulador (modo VAO)
          </h3>
        </div>

        <div className="space-y-4 px-4 py-4">
          {variables.length === 0 ? (
            <p className="text-sm text-muted-foreground/80">
              adicione variáveis na aba <strong>Variáveis</strong> para começar.
            </p>
          ) : (
            <>
              {dimVars.length > 0 && (
                <div className={`grid gap-3 ${dimVars.length >= 2 ? "grid-cols-2" : "grid-cols-1"}`}>
                  {dimVars.map((v) => {
                    const num =
                      typeof inputs[v.codigo] === "number"
                        ? (inputs[v.codigo] as number)
                        : 0;
                    return (
                      <div key={v.codigo} className="flex flex-col gap-1">
                        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
                          {v.label || v.codigo} ({v.unit || "mm"})
                        </Label>
                        <Input
                          type="number"
                          value={num}
                          onChange={(e) =>
                            setInputs((p) => ({
                              ...p,
                              [v.codigo]: Number(e.target.value),
                            }))
                          }
                          className="h-10 border-border bg-input text-center text-lg font-semibold"
                        />
                      </div>
                    );
                  })}
                </div>
              )}

              {countVars.map((v) => {
                const min = parseIntOr(v.min_value, 1);
                const num =
                  typeof inputs[v.codigo] === "number"
                    ? (inputs[v.codigo] as number)
                    : min;
                const max = parseIntOr(v.max_value, Math.max(min + 9, num + 5));
                return (
                  <div key={v.codigo}>
                    <div className="mb-1 flex items-baseline justify-between">
                      <Label className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
                        {v.label || v.codigo}
                      </Label>
                      <span className="font-mono text-sm font-semibold">
                        {num}
                      </span>
                    </div>
                    <Slider
                      value={[num]}
                      min={min}
                      max={max}
                      step={1}
                      onValueChange={(vals) =>
                        setInputs((p) => ({ ...p, [v.codigo]: vals[0] }))
                      }
                    />
                  </div>
                );
              })}

              {form.vidros_elegiveis.length > 0 && (
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
                    Vidro
                  </Label>
                  <Select
                    value={vidroId !== null ? String(vidroId) : ""}
                    onValueChange={(s) => setVidroId(Number(s))}
                  >
                    <SelectTrigger className="h-9 bg-input">
                      <SelectValue placeholder="Selecione…" />
                    </SelectTrigger>
                    <SelectContent>
                      {form.vidros_elegiveis.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.label} · R$ {v.precoM2.toFixed(2)}/m²
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {optionVars.map((v) => {
                const validOptions = (v.options ?? []).filter((o) => o.codigo);
                const value =
                  typeof inputs[v.codigo] === "string"
                    ? (inputs[v.codigo] as string)
                    : validOptions[0]?.codigo ?? "";
                return (
                  <div key={v.codigo} className="flex flex-col gap-1">
                    <Label className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
                      {v.label || v.codigo}
                    </Label>
                    <Select
                      value={value}
                      onValueChange={(s) =>
                        setInputs((p) => ({ ...p, [v.codigo]: s }))
                      }
                    >
                      <SelectTrigger className="h-9 bg-input">
                        <SelectValue placeholder="Selecione…" />
                      </SelectTrigger>
                      <SelectContent>
                        {validOptions.map((o) => (
                          <SelectItem key={o.codigo} value={o.codigo}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}

              {otherVars.length > 0 && (
                <div className="space-y-2 border-t border-border/60 pt-3">
                  {otherVars.map((v) => {
                    const value = inputs[v.codigo];
                    if (v.kind === "BOOLEAN") {
                      return (
                        <div key={v.codigo} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`bool-${v.codigo}`}
                            checked={value === true}
                            onChange={(e) =>
                              setInputs((p) => ({
                                ...p,
                                [v.codigo]: e.target.checked,
                              }))
                            }
                          />
                          <label
                            htmlFor={`bool-${v.codigo}`}
                            className="font-mono text-xs"
                          >
                            {v.codigo}
                            {v.label && (
                              <span className="ml-1 text-muted-foreground/80">
                                — {v.label}
                              </span>
                            )}
                          </label>
                        </div>
                      );
                    }
                    const num = typeof value === "number" ? value : 0;
                    return (
                      <div key={v.codigo} className="flex flex-col gap-1">
                        <Label className="font-mono text-[10px] text-muted-foreground/80">
                          {v.codigo}
                          {v.label && (
                            <span className="ml-1 text-muted-foreground/60">
                              — {v.label}
                            </span>
                          )}
                        </Label>
                        <Input
                          type="number"
                          value={num}
                          onChange={(e) =>
                            setInputs((p) => ({
                              ...p,
                              [v.codigo]: Number(e.target.value),
                            }))
                          }
                          className="h-8 font-mono text-xs"
                        />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {snapshot && output && !error && output.pecas.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card shadow-sm">
          <div className="border-b border-border/60 px-4 py-3">
            <h3 className="text-sm font-semibold">Pré-visualização</h3>
          </div>
          <div className="p-3">
            {(() => {
              const renderConfig = getRenderConfig(snapshot);
              if (renderConfig) {
                return (
                  <TipologiaRender
                    renderKey={renderConfig.renderKey}
                    vars={buildEmbedVars(renderConfig, debounced)}
                  />
                );
              }
              return (
                <Diagrama
                  pecas={output.pecas}
                  pieceGroups={snapshot.pieceGroups}
                />
              );
            })()}
          </div>
        </div>
      )}

      <TracePanel snapshot={snapshot} inputs={debounced} output={output} />

      <BreakdownPanel output={output} error={error} />
    </div>
  );
}

function initialInputs(form: FormState): Inputs {
  const out: Inputs = {};
  for (const v of form.variables) {
    if (v.kind === "BOOLEAN") {
      out[v.codigo] = parseBool(v.default_value) ?? false;
    } else if (v.kind === "OPTION_LIST") {
      out[v.codigo] = v.default_value ?? v.options?.[0]?.codigo ?? "";
    } else if (v.kind === "COUNT") {
      out[v.codigo] = parseIntOr(v.default_value, parseIntOr(v.min_value, 1));
    } else {
      const minVal = parseFloatOr(v.min_value, 0);
      const fallback = minVal > 0 ? minVal : 1000;
      out[v.codigo] = parseFloatOr(v.default_value, fallback);
    }
  }
  return out;
}

function mergeInputs(prev: Inputs, form: FormState): Inputs {
  const out: Inputs = {};
  for (const v of form.variables) {
    if (v.codigo in prev) {
      out[v.codigo] = prev[v.codigo];
    } else if (v.kind === "BOOLEAN") {
      out[v.codigo] = parseBool(v.default_value) ?? false;
    } else if (v.kind === "OPTION_LIST") {
      out[v.codigo] = v.default_value ?? v.options?.[0]?.codigo ?? "";
    } else if (v.kind === "COUNT") {
      out[v.codigo] = parseIntOr(v.default_value, parseIntOr(v.min_value, 1));
    } else {
      out[v.codigo] = parseFloatOr(v.default_value, 1000);
    }
  }
  return out;
}

function sortVariablesForWizard(form: FormState) {
  const order: Record<string, number> = {
    DIMENSION: 0,
    COUNT: 1,
    OPTION_LIST: 2,
    BOOLEAN: 3,
    TECHNICAL_PARAM: 4,
  };
  return [...form.variables].sort(
    (a, b) =>
      (order[a.kind] ?? 99) - (order[b.kind] ?? 99) ||
      (a.ordem ?? 0) - (b.ordem ?? 0)
  );
}

function parseIntOr(s: string | null | undefined, fallback: number): number {
  if (s === null || s === undefined || s === "") return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function parseFloatOr(s: string | null | undefined, fallback: number): number {
  if (s === null || s === undefined || s === "") return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

function parseBool(s: string | null | undefined): boolean | null {
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  return null;
}
