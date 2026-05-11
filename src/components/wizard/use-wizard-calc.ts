"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  PecaCalculada,
  PieceSpecificationCalculada,
  TipologiaMedidaSnapshot,
  TipologiaVaoSnapshot,
  ValidationIssue,
  VariableValue,
} from "@/lib/engine";
import { parseBool, parseFloatOr, parseIntOr } from "./wizard-units";

/** Resposta pública da rota `/api/calcular` (sem header `x-admin`). */
export type PublicCalcResult = {
  tipologia_id: number;
  tipologia_nome: string;
  modo_de_producao: "VAO" | "MEDIDA_DE_PRODUCAO";
  pecas: PecaCalculada[];
  totais: {
    areaCobrancaM2: number;
    quantidadePecas: number;
  };
  preco: { total: number };
};

export type CalcStatus =
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "network-error";

export type CalcInputs = Record<string, VariableValue>;

export type WizardPeca = {
  identificacao: string;
  variables: CalcInputs;
};

type CalcStateBase = {
  result: PublicCalcResult | null;
  /** Último resultado válido — útil para manter o diagrama na tela durante erros. */
  lastValid: PublicCalcResult | null;
  status: CalcStatus;
  errors: ValidationIssue[] | null;
  /** True se 3 cálculos consecutivos falharem com o mesmo `code`. */
  invalidTipologia: boolean;
  /** Vidro selecionado entre os elegíveis da tipologia. */
  vidroId: number | null;
  setVidroId: (id: number | null) => void;
};

export type WizardCalcStateVao = CalcStateBase & {
  inputs: CalcInputs;
  setInput: (codigo: string, value: VariableValue) => void;
  setMultipleInputs: (patch: CalcInputs) => void;
};

export type WizardCalcStateMedida = CalcStateBase & {
  variaveisOrcamento: CalcInputs;
  pecas: WizardPeca[];
  setOrcamentoVar: (codigo: string, value: VariableValue) => void;
  addPeca: () => void;
  removePeca: (i: number) => void;
  duplicarPeca: (i: number) => void;
  patchPeca: (i: number, patch: Partial<WizardPeca>) => void;
};

// ---------------- Hook compartilhado ----------------

function useCalcState() {
  const [result, setResult] = useState<PublicCalcResult | null>(null);
  const [lastValid, setLastValid] = useState<PublicCalcResult | null>(null);
  const [status, setStatus] = useState<CalcStatus>("idle");
  const [errors, setErrors] = useState<ValidationIssue[] | null>(null);
  const [invalidTipologia, setInvalidTipologia] = useState(false);
  return {
    result,
    setResult,
    lastValid,
    setLastValid,
    status,
    setStatus,
    errors,
    setErrors,
    invalidTipologia,
    setInvalidTipologia,
  };
}

function useFetchCalc(
  setResult: (r: PublicCalcResult | null) => void,
  setLastValid: (r: PublicCalcResult | null) => void,
  setStatus: (s: CalcStatus) => void,
  setErrors: (e: ValidationIssue[] | null) => void,
  setInvalidTipologia: (b: boolean) => void
) {
  const abortRef = useRef<AbortController | null>(null);
  const networkRetryRef = useRef<number | null>(null);
  const errorTrackerRef = useRef<{ code: string | null; count: number }>({
    code: null,
    count: 0,
  });

  const runCalc = useCallback(
    async (body: Record<string, unknown>) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      if (networkRetryRef.current !== null) {
        window.clearTimeout(networkRetryRef.current);
        networkRetryRef.current = null;
      }

      setStatus("loading");
      try {
        const res = await fetch("/api/calcular", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ac.signal,
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errBody = (await res.json().catch(() => ({}))) as {
            errors?: ValidationIssue[];
          };
          const issues = errBody.errors ?? [
            {
              code: "FORMULA_RUNTIME_ERROR" as const,
              field: "(root)",
              message: `HTTP ${res.status}`,
            },
          ];
          setErrors(issues);
          setStatus("error");

          const firstCode = issues[0]?.code ?? null;
          if (firstCode && errorTrackerRef.current.code === firstCode) {
            errorTrackerRef.current.count += 1;
            if (errorTrackerRef.current.count >= 3) {
              setInvalidTipologia(true);
            }
          } else {
            errorTrackerRef.current = { code: firstCode, count: 1 };
          }
          return;
        }

        const data = (await res.json()) as PublicCalcResult;
        setResult(data);
        setLastValid(data);
        setErrors(null);
        setStatus("success");
        errorTrackerRef.current = { code: null, count: 0 };
        setInvalidTipologia(false);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (
          err instanceof Error &&
          (err.name === "AbortError" || err.message.includes("aborted"))
        ) {
          return;
        }
        setStatus("network-error");
        networkRetryRef.current = window.setTimeout(() => {
          runCalc(body);
        }, 5000);
      }
    },
    [setErrors, setInvalidTipologia, setLastValid, setResult, setStatus]
  );

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (networkRetryRef.current !== null) {
        window.clearTimeout(networkRetryRef.current);
      }
    };
  }, []);

  return runCalc;
}

// ---------------- VAO ----------------

export function useWizardCalcVao(
  snapshot: TipologiaVaoSnapshot
): WizardCalcStateVao {
  const tipologiaId = snapshot.id;
  const [inputs, setInputs] = useState<CalcInputs>(() => initialInputs(snapshot));
  const [vidroId, setVidroId] = useState<number | null>(
    snapshot.vidrosElegiveis[0]?.id ?? null
  );
  const state = useCalcState();
  const runCalc = useFetchCalc(
    state.setResult,
    state.setLastValid,
    state.setStatus,
    state.setErrors,
    state.setInvalidTipologia
  );

  const setInput = useCallback((codigo: string, value: VariableValue) => {
    setInputs((prev) => ({ ...prev, [codigo]: value }));
  }, []);

  const setMultipleInputs = useCallback((patch: CalcInputs) => {
    setInputs((prev) => ({ ...prev, ...patch }));
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => {
      runCalc({
        tipologia_id: tipologiaId,
        variables: inputs,
        unit: "mm",
        ...(vidroId !== null ? { vidro: { vidro_id: vidroId } } : {}),
      });
    }, 300);
    return () => window.clearTimeout(t);
  }, [inputs, runCalc, tipologiaId, vidroId]);

  return useMemo(
    () => ({
      inputs,
      setInput,
      setMultipleInputs,
      vidroId,
      setVidroId,
      result: state.result,
      lastValid: state.lastValid,
      status: state.status,
      errors: state.errors,
      invalidTipologia: state.invalidTipologia,
    }),
    [
      inputs,
      setInput,
      setMultipleInputs,
      vidroId,
      state.result,
      state.lastValid,
      state.status,
      state.errors,
      state.invalidTipologia,
    ]
  );
}

// ---------------- MEDIDA ----------------

export function useWizardCalcMedida(
  snapshot: TipologiaMedidaSnapshot
): WizardCalcStateMedida {
  const tipologiaId = snapshot.id;
  const [variaveisOrcamento, setVariaveisOrcamento] = useState<CalcInputs>(
    () => initialOrcamento(snapshot)
  );
  const [pecas, setPecas] = useState<WizardPeca[]>(() => [
    initialPeca(snapshot, 1),
  ]);
  const [vidroId, setVidroId] = useState<number | null>(
    snapshot.vidrosElegiveis[0]?.id ?? null
  );
  const state = useCalcState();
  const runCalc = useFetchCalc(
    state.setResult,
    state.setLastValid,
    state.setStatus,
    state.setErrors,
    state.setInvalidTipologia
  );

  const setOrcamentoVar = useCallback(
    (codigo: string, value: VariableValue) =>
      setVariaveisOrcamento((prev) => ({ ...prev, [codigo]: value })),
    []
  );

  const addPeca = useCallback(
    () =>
      setPecas((prev) => [...prev, initialPeca(snapshot, prev.length + 1)]),
    [snapshot]
  );

  const removePeca = useCallback(
    (i: number) =>
      setPecas((prev) =>
        prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)
      ),
    []
  );

  const duplicarPeca = useCallback(
    (i: number) =>
      setPecas((prev) => {
        const copy: WizardPeca = {
          identificacao: `${prev[i].identificacao} (cópia)`,
          variables: { ...prev[i].variables },
        };
        return [...prev.slice(0, i + 1), copy, ...prev.slice(i + 1)];
      }),
    []
  );

  const patchPeca = useCallback(
    (i: number, patch: Partial<WizardPeca>) =>
      setPecas((prev) =>
        prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p))
      ),
    []
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      const especPorTemplate: {
        tipo: string;
        atributos: Record<string, unknown>;
      }[] = snapshot.specificationTemplates.map((t) => ({
        tipo: t.codigo,
        atributos: {},
      }));
      runCalc({
        tipologia_id: tipologiaId,
        variaveis_orcamento: variaveisOrcamento,
        pecas: pecas.map((p) => ({
          identificacao: p.identificacao,
          variables: p.variables,
          especificacoes: especPorTemplate,
        })),
        unit: "mm",
        ...(vidroId !== null ? { vidro: { vidro_id: vidroId } } : {}),
      });
    }, 300);
    return () => window.clearTimeout(t);
  }, [
    pecas,
    variaveisOrcamento,
    snapshot.specificationTemplates,
    runCalc,
    tipologiaId,
    vidroId,
  ]);

  return useMemo(
    () => ({
      variaveisOrcamento,
      pecas,
      setOrcamentoVar,
      addPeca,
      removePeca,
      duplicarPeca,
      patchPeca,
      vidroId,
      setVidroId,
      result: state.result,
      lastValid: state.lastValid,
      status: state.status,
      errors: state.errors,
      invalidTipologia: state.invalidTipologia,
    }),
    [
      variaveisOrcamento,
      pecas,
      setOrcamentoVar,
      addPeca,
      removePeca,
      duplicarPeca,
      patchPeca,
      vidroId,
      state.result,
      state.lastValid,
      state.status,
      state.errors,
      state.invalidTipologia,
    ]
  );
}

// Mantém export legado para o caso de algum import lateral
export type { PieceSpecificationCalculada };

// ---------------- Helpers ----------------

function initialInputs(snapshot: TipologiaVaoSnapshot): CalcInputs {
  const out: CalcInputs = {};
  for (const v of snapshot.variables) {
    out[v.codigo] = defaultValueFor(v);
  }
  return out;
}

function initialOrcamento(snapshot: TipologiaMedidaSnapshot): CalcInputs {
  const out: CalcInputs = {};
  for (const v of snapshot.variables.filter((x) => x.nivel === "ORCAMENTO")) {
    out[v.codigo] = defaultValueFor(v);
  }
  return out;
}

function initialPeca(
  snapshot: TipologiaMedidaSnapshot,
  index: number
): WizardPeca {
  const variables: CalcInputs = {};
  for (const v of snapshot.variables.filter((x) => x.nivel === "PECA")) {
    variables[v.codigo] = defaultValueFor(v);
  }
  return { identificacao: `Peça ${index}`, variables };
}

function defaultValueFor(v: {
  kind: string;
  defaultValue: string | null;
  minValue: string | null;
  options: { codigo: string }[] | null;
}): VariableValue {
  if (v.kind === "BOOLEAN") return parseBool(v.defaultValue) ?? false;
  if (v.kind === "OPTION_LIST") {
    return v.defaultValue ?? v.options?.[0]?.codigo ?? "";
  }
  if (v.kind === "COUNT") {
    return parseIntOr(v.defaultValue, parseIntOr(v.minValue, 1));
  }
  // DIMENSION / TECHNICAL_PARAM
  const minVal = parseFloatOr(v.minValue, 0);
  const fallback = minVal > 0 ? minVal : v.kind === "DIMENSION" ? 1000 : 0;
  return parseFloatOr(v.defaultValue, fallback);
}
