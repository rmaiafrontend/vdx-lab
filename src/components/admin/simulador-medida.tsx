"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
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
  FormulaError,
  SelectorError,
  ValidationError,
  runPipeline,
  type CalcOutput,
  type PecaInputMedida,
  type TipologiaMedidaSnapshot,
  type Unit,
  type VariableValue,
} from "@/lib/engine";
import { payloadToSnapshot } from "@/lib/snapshot";
import { formToPayload, type FormState } from "./form-state";
import { BreakdownPanel, TracePanel, clientLookups } from "./simulador-shared";

type Props = { form: FormState };

type PecaState = {
  identificacao: string;
  variables: Record<string, VariableValue>;
};

export function SimuladorMedida({ form }: Props) {
  const [orcamentoVars, setOrcamentoVars] = useState<Record<string, VariableValue>>(
    () => initialOrcamento(form)
  );
  const [pecas, setPecas] = useState<PecaState[]>(() => [initialPeca(form, 1)]);
  const [unit] = useState<Unit>("mm");
  const [vidroId, setVidroId] = useState<number | null>(
    form.vidros_elegiveis[0]?.id ?? null
  );
  const [output, setOutput] = useState<CalcOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const snapshot = useMemo<TipologiaMedidaSnapshot | null>(() => {
    try {
      const snap = payloadToSnapshot(formToPayload(form));
      if (snap.modo !== "MEDIDA_DE_PRODUCAO") return null;
      return { ...snap, vidrosElegiveis: form.vidros_elegiveis };
    } catch {
      return null;
    }
  }, [form]);

  // sincronizar quando o form muda
  useEffect(() => {
    setOrcamentoVars((prev) => mergeOrcamento(prev, form));
    setPecas((prev) => prev.map((p) => mergePeca(p, form)));
    setVidroId((prev) => {
      if (prev !== null && form.vidros_elegiveis.some((v) => v.id === prev)) {
        return prev;
      }
      return form.vidros_elegiveis[0]?.id ?? null;
    });
  }, [form]);

  // recalcula
  useEffect(() => {
    if (!snapshot) {
      setOutput(null);
      setError("Tipologia inválida ou não é modo MEDIDA.");
      return;
    }
    if (pecas.length === 0) {
      setOutput(null);
      setError("Adicione ao menos uma peça.");
      return;
    }
    try {
      const especPorTemplate: PecaInputMedida["especificacoes"] =
        snapshot.specificationTemplates.map((t) => ({
          tipo: t.codigo,
          atributos: {},
        }));
      const result = runPipeline({
        tipologia: snapshot,
        variaveisOrcamento: orcamentoVars,
        pecas: pecas.map((p) => ({
          identificacao: p.identificacao,
          variables: p.variables,
          especificacoes: especPorTemplate,
        })),
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
  }, [snapshot, orcamentoVars, pecas, unit, vidroId, form.vidros_elegiveis]);

  const orcamentoVarDefs = form.variables.filter((v) => v.nivel === "ORCAMENTO");
  const pecaVarDefs = form.variables.filter((v) => v.nivel === "PECA");

  const addPeca = () =>
    setPecas((prev) => [...prev, initialPeca(form, prev.length + 1)]);
  const dupPeca = (i: number) =>
    setPecas((prev) => {
      const copy = { ...prev[i] };
      copy.identificacao = `${copy.identificacao} (cópia)`;
      copy.variables = { ...copy.variables };
      return [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)];
    });
  const removePeca = (i: number) =>
    setPecas((prev) => prev.filter((_, idx) => idx !== i));
  const patchPeca = (i: number, patch: Partial<PecaState>) =>
    setPecas((prev) =>
      prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p))
    );

  return (
    <div className="sticky top-4 space-y-3">
      <div className="rounded-xl border border-border/60 bg-card shadow-sm">
        <div className="border-b border-border/60 px-4 py-3">
          <h3 className="text-sm font-semibold">Simulador (modo MEDIDA)</h3>
          <p className="text-[11px] text-muted-foreground/80">
            Variáveis de orçamento + lista de peças.
          </p>
        </div>
        <div className="space-y-4 px-4 py-4">
          {/* Vidro do orçamento */}
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

          {/* Variáveis de orçamento */}
          {orcamentoVarDefs.length > 0 && (
            <div className="space-y-2">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
                Variáveis do orçamento
              </Label>
              <div className="grid gap-2 md:grid-cols-2">
                {orcamentoVarDefs.map((v) => (
                  <VarInput
                    key={v.codigo}
                    variable={v}
                    value={orcamentoVars[v.codigo]}
                    onChange={(val) =>
                      setOrcamentoVars((p) => ({ ...p, [v.codigo]: val }))
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tabela de peças */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground/80">
                Peças ({pecas.length})
              </Label>
              <Button size="sm" variant="ghost" onClick={addPeca} className="h-7 px-2">
                <Plus className="mr-1 size-3" />
                Adicionar peça
              </Button>
            </div>
            {pecas.map((p, i) => (
              <div
                key={i}
                className="space-y-2 rounded-md border border-border/40 bg-background/40 p-3"
              >
                <div className="flex items-center gap-2">
                  <Input
                    value={p.identificacao}
                    onChange={(e) =>
                      patchPeca(i, { identificacao: e.target.value })
                    }
                    placeholder={`Peça ${i + 1}`}
                    className="h-8 flex-1 text-xs"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => dupPeca(i)}
                    className="size-7"
                  >
                    <Copy className="size-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => removePeca(i)}
                    className="size-7 text-rose-400/70 hover:bg-rose-500/10 hover:text-rose-400"
                    disabled={pecas.length <= 1}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  {pecaVarDefs.map((v) => (
                    <VarInput
                      key={v.codigo}
                      variable={v}
                      value={p.variables[v.codigo]}
                      onChange={(val) =>
                        patchPeca(i, {
                          variables: { ...p.variables, [v.codigo]: val },
                        })
                      }
                      compact
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <TracePanel snapshot={snapshot} inputs={orcamentoVars} output={output} />

      <BreakdownPanel output={output} error={error} />
    </div>
  );
}

function VarInput({
  variable: v,
  value,
  onChange,
  compact,
}: {
  variable: FormState["variables"][number];
  value: VariableValue | undefined;
  onChange: (v: VariableValue) => void;
  compact?: boolean;
}) {
  const labelClass =
    "text-[10px] uppercase tracking-wide text-muted-foreground/80";
  const inputClass = compact ? "h-7 text-xs" : "h-9 text-sm";

  if (v.kind === "OPTION_LIST") {
    const validOptions = (v.options ?? []).filter((o) => o.codigo);
    const val =
      typeof value === "string" ? value : validOptions[0]?.codigo ?? "";
    return (
      <div className="flex flex-col gap-1">
        <Label className={labelClass}>{v.label || v.codigo}</Label>
        <Select value={val} onValueChange={(s) => onChange(s)}>
          <SelectTrigger className={inputClass}>
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
  }

  if (v.kind === "BOOLEAN") {
    return (
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        <Label className="text-xs">{v.label || v.codigo}</Label>
      </div>
    );
  }

  const num = typeof value === "number" ? value : 0;
  return (
    <div className="flex flex-col gap-1">
      <Label className={labelClass}>
        {v.label || v.codigo}
        {v.unit && (
          <span className="ml-1 text-muted-foreground/60">({v.unit})</span>
        )}
      </Label>
      <Input
        type="number"
        value={num}
        onChange={(e) => onChange(Number(e.target.value))}
        className={inputClass}
      />
    </div>
  );
}

function initialOrcamento(form: FormState): Record<string, VariableValue> {
  const out: Record<string, VariableValue> = {};
  for (const v of form.variables.filter((x) => x.nivel === "ORCAMENTO")) {
    out[v.codigo] = defaultValueFor(v);
  }
  return out;
}

function mergeOrcamento(
  prev: Record<string, VariableValue>,
  form: FormState
): Record<string, VariableValue> {
  const out: Record<string, VariableValue> = {};
  for (const v of form.variables.filter((x) => x.nivel === "ORCAMENTO")) {
    out[v.codigo] = prev[v.codigo] ?? defaultValueFor(v);
  }
  return out;
}

function initialPeca(form: FormState, index: number): PecaState {
  const variables: Record<string, VariableValue> = {};
  for (const v of form.variables.filter((x) => x.nivel === "PECA")) {
    variables[v.codigo] = defaultValueFor(v);
  }
  return { identificacao: `Peça ${index}`, variables };
}

function mergePeca(prev: PecaState, form: FormState): PecaState {
  const variables: Record<string, VariableValue> = {};
  for (const v of form.variables.filter((x) => x.nivel === "PECA")) {
    variables[v.codigo] = prev.variables[v.codigo] ?? defaultValueFor(v);
  }
  return { ...prev, variables };
}

function defaultValueFor(v: FormState["variables"][number]): VariableValue {
  if (v.kind === "BOOLEAN") {
    return v.default_value === "true" || v.default_value === "1";
  }
  if (v.kind === "OPTION_LIST") {
    return v.default_value ?? v.options?.[0]?.codigo ?? "";
  }
  if (v.kind === "COUNT") {
    const def = Number(v.default_value);
    if (Number.isFinite(def)) return def;
    const min = Number(v.min_value);
    return Number.isFinite(min) ? min : 1;
  }
  // DIMENSION / TECHNICAL_PARAM
  const def = Number(v.default_value);
  if (Number.isFinite(def)) return def;
  const min = Number(v.min_value);
  return Number.isFinite(min) ? min : 1000;
}
