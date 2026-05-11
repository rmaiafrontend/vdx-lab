import { ValidationError } from "./errors";
import { evaluate } from "./evaluator";
import { avaliarPricing } from "./pricing";
import { ceil50, round4, unitFactor } from "./units";
import type {
  CalcInputMedida,
  CalcOutput,
  EvalScope,
  EvaluationContext,
  PecaCalculada,
  PecaInputMedida,
  PieceSpecificationCalculada,
  PieceSpecificationInput,
  SpecificationAttributeDef,
  SpecificationTemplateSnapshot,
  TipologiaMedidaSnapshot,
  Totais,
  VariableNivel,
  VariableSnapshot,
  VariableValue,
} from "./types";

const LARGURA_KEY = "Largura";
const ALTURA_KEY = "Altura";

export function runPipelineMedida(input: CalcInputMedida): CalcOutput {
  const tipologia = input.tipologia;
  const factor = unitFactor(input.unit);
  const evalCtx: EvaluationContext = {
    scope: "ORCAMENTO_PECA",
    tipologiaId: tipologia.id,
    precoVidro: input.lookups?.precoVidro,
    precoTorre: input.lookups?.precoTorre,
  };

  const orcamentoScope = prepareScope(
    tipologia.variables,
    "ORCAMENTO",
    input.variaveisOrcamento,
    factor,
    {},
    evalCtx
  );

  const pecaVars = tipologia.variables.filter((v) => v.nivel === "PECA");
  const templates = new Map(
    tipologia.specificationTemplates.map((t) => [t.codigo, t])
  );

  const pecas: PecaCalculada[] = [];

  input.pecas.forEach((peca, i) => {
    const pecaScope = prepareScope(
      pecaVars,
      "PECA",
      peca.variables,
      factor,
      orcamentoScope,
      evalCtx
    );

    evaluateOrcamentoPecaComputed(tipologia, pecaScope, evalCtx);

    const especificacoes = materializeSpecifications(
      peca,
      templates,
      pecaScope,
      i + 1
    );

    const wRaw = pecaScope[LARGURA_KEY];
    const hRaw = pecaScope[ALTURA_KEY];
    if (typeof wRaw !== "number" || typeof hRaw !== "number") {
      throw new ValidationError({
        code: "REQUIRED_VARIABLE_MISSING",
        message: `peça ${i + 1} sem Largura/Altura definidas (variáveis nivel=PECA obrigatórias)`,
        field: `pecas[${i}]`,
        context: { index: i },
      });
    }

    const wReal = Math.floor(wRaw);
    const hReal = Math.floor(hRaw);
    const wCobranca = ceil50(wReal);
    const hCobranca = ceil50(hReal);

    pecas.push({
      groupCode: null,
      roleCode: null,
      index: i + 1,
      identificacao: peca.identificacao ?? null,
      wReal,
      hReal,
      wCobranca,
      hCobranca,
      areaRealM2: (wReal * hReal) / 1e6,
      areaCobrancaM2: (wCobranca * hCobranca) / 1e6,
      especificacoes,
      variables: pickPecaVariables(pecaScope, pecaVars),
    });
  });

  const totais = agregar(pecas);
  const breakdown = avaliarPricing({
    rules: tipologia.pricingRules,
    pecas,
    totais,
    baseScope: orcamentoScope,
    vidro: input.vidro,
    lookups: input.lookups,
    tipologiaId: tipologia.id,
  });
  const total = round2(breakdown.reduce((s, b) => s + b.valor, 0));

  return {
    pecas,
    variaveisCalculadas: filterNumeric(orcamentoScope),
    totais,
    preco: { breakdown, total },
  };
}

// ---------------- Variáveis & escopos ----------------

function prepareScope(
  vars: VariableSnapshot[],
  nivel: VariableNivel,
  inputs: Record<string, VariableValue>,
  factor: number,
  parentScope: EvalScope,
  evalCtx: EvaluationContext
): EvalScope {
  const scope: EvalScope = { ...parentScope };
  const filtered = vars
    .filter((v) => v.nivel === nivel)
    .sort((a, b) => a.ordem - b.ordem);

  for (const v of filtered) {
    let value: VariableValue | undefined = inputs[v.codigo];

    if (value === undefined && v.defaultValue) {
      value = resolveDefault(v, scope, evalCtx);
    }

    if (value === undefined || value === null) {
      if (v.required) {
        throw new ValidationError({
          code: "REQUIRED_VARIABLE_MISSING",
          message: `variável obrigatória ${v.codigo} não foi informada`,
          field: `variables.${v.codigo}`,
          context: { codigo: v.codigo, nivel },
        });
      }
      continue;
    }

    typeCheck(v, value);

    if (v.kind === "OPTION_LIST" && v.options && typeof value === "string") {
      const allowed = v.options.map((o) => o.codigo);
      if (!allowed.includes(value)) {
        throw new ValidationError({
          code: "OPTION_LIST_VALUE_INVALID",
          message: `variável ${v.codigo}=${value} não está em [${allowed.join(", ")}]`,
          field: `variables.${v.codigo}`,
          context: { codigo: v.codigo, value, allowed },
        });
      }
    }

    if (v.kind === "DIMENSION" && typeof value === "number") {
      value = value * factor;
    }

    scope[v.codigo] = value;
  }

  for (const v of filtered) {
    const value = scope[v.codigo];
    if (typeof value !== "number") continue;
    rangeCheck(v, value, scope, evalCtx);
  }

  return scope;
}

function resolveDefault(
  v: VariableSnapshot,
  scope: EvalScope,
  evalCtx: EvaluationContext
): VariableValue {
  if (v.kind === "OPTION_LIST") {
    return v.defaultValue!;
  }
  return evaluate(v.defaultValue!, scope, {
    ...evalCtx,
    field: `variables[${v.codigo}].default_value`,
  }) as VariableValue;
}

function typeCheck(v: VariableSnapshot, value: VariableValue): void {
  if (v.kind === "BOOLEAN" && typeof value !== "boolean") {
    throw new ValidationError({
      code: "VARIABLE_TYPE_MISMATCH",
      message: `variável ${v.codigo} é BOOLEAN mas recebeu ${typeof value}`,
      field: `variables.${v.codigo}`,
      context: { codigo: v.codigo, kind: v.kind },
    });
  }
  if (v.kind === "OPTION_LIST" && typeof value !== "string") {
    throw new ValidationError({
      code: "VARIABLE_TYPE_MISMATCH",
      message: `variável ${v.codigo} é OPTION_LIST mas recebeu ${typeof value}`,
      field: `variables.${v.codigo}`,
      context: { codigo: v.codigo, kind: v.kind },
    });
  }
  if (
    (v.kind === "DIMENSION" ||
      v.kind === "COUNT" ||
      v.kind === "TECHNICAL_PARAM") &&
    typeof value !== "number"
  ) {
    throw new ValidationError({
      code: "VARIABLE_TYPE_MISMATCH",
      message: `variável ${v.codigo} é ${v.kind} mas recebeu ${typeof value}`,
      field: `variables.${v.codigo}`,
      context: { codigo: v.codigo, kind: v.kind },
    });
  }
  if (v.kind === "COUNT" && typeof value === "number" && !Number.isInteger(value)) {
    throw new ValidationError({
      code: "VARIABLE_TYPE_MISMATCH",
      message: `variável ${v.codigo} (COUNT) precisa ser inteiro`,
      field: `variables.${v.codigo}`,
      context: { codigo: v.codigo, value },
    });
  }
}

function rangeCheck(
  v: VariableSnapshot,
  value: number,
  scope: EvalScope,
  evalCtx: EvaluationContext
): void {
  if (v.minValue) {
    const min = Number(
      evaluate(v.minValue, scope, {
        ...evalCtx,
        field: `variables[${v.codigo}].min_value`,
      })
    );
    if (value < min) {
      throw new ValidationError({
        code: "VARIABLE_OUT_OF_RANGE",
        message: `${v.codigo}=${value} abaixo do mínimo (${min})`,
        field: `variables.${v.codigo}`,
        context: { codigo: v.codigo, value, min },
      });
    }
  }
  if (v.maxValue) {
    const max = Number(
      evaluate(v.maxValue, scope, {
        ...evalCtx,
        field: `variables[${v.codigo}].max_value`,
      })
    );
    if (value > max) {
      throw new ValidationError({
        code: "VARIABLE_OUT_OF_RANGE",
        message: `${v.codigo}=${value} acima do máximo (${max})`,
        field: `variables.${v.codigo}`,
        context: { codigo: v.codigo, value, max },
      });
    }
  }
}

function evaluateOrcamentoPecaComputed(
  tipologia: TipologiaMedidaSnapshot,
  scope: EvalScope,
  evalCtx: EvaluationContext
): void {
  const cvs = tipologia.computedValues
    .filter((c) => c.scope === "ORCAMENTO_PECA")
    .sort((a, b) => a.orderInScope - b.orderInScope);
  for (const cv of cvs) {
    const v = evaluate(cv.expression, scope, {
      ...evalCtx,
      field: `computed_values[${cv.codigo}]`,
    });
    scope[cv.codigo] = typeof v === "number" ? v : Number(v);
  }
}

// ---------------- Specifications ----------------

function materializeSpecifications(
  peca: PecaInputMedida,
  templates: Map<string, SpecificationTemplateSnapshot>,
  pecaScope: EvalScope,
  pecaIndex: number
): PieceSpecificationCalculada[] {
  const out: PieceSpecificationCalculada[] = [];
  const countByTipo = new Map<string, number>();

  for (const spec of peca.especificacoes) {
    const template = templates.get(spec.tipo);
    if (!template) {
      throw new ValidationError({
        code: "SPECIFICATION_SCHEMA_INVALID",
        message: `peça ${pecaIndex} tem especificação tipo "${spec.tipo}" sem template correspondente`,
        field: `pecas[${pecaIndex - 1}].especificacoes`,
        context: { tipo: spec.tipo },
      });
    }
    countByTipo.set(spec.tipo, (countByTipo.get(spec.tipo) ?? 0) + 1);
    out.push({
      tipo: spec.tipo,
      atributos: resolveAttributes(spec, template, pecaScope, pecaIndex),
    });
  }

  for (const template of templates.values()) {
    const c = countByTipo.get(template.codigo) ?? 0;
    if (c < template.requiredMin) {
      throw new ValidationError({
        code: "SPECIFICATION_COUNT_OUT_OF_RANGE",
        message: `peça ${pecaIndex} precisa de pelo menos ${template.requiredMin} especificação(ões) "${template.codigo}", recebeu ${c}`,
        field: `pecas[${pecaIndex - 1}].especificacoes`,
        context: {
          tipo: template.codigo,
          minimo: template.requiredMin,
          recebido: c,
        },
      });
    }
    if (template.requiredMax !== null && c > template.requiredMax) {
      throw new ValidationError({
        code: "SPECIFICATION_COUNT_OUT_OF_RANGE",
        message: `peça ${pecaIndex} excedeu máximo de ${template.requiredMax} especificação(ões) "${template.codigo}", recebeu ${c}`,
        field: `pecas[${pecaIndex - 1}].especificacoes`,
        context: {
          tipo: template.codigo,
          maximo: template.requiredMax,
          recebido: c,
        },
      });
    }
  }

  return out;
}

function resolveAttributes(
  spec: PieceSpecificationInput,
  template: SpecificationTemplateSnapshot,
  pecaScope: EvalScope,
  pecaIndex: number
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [name, def] of Object.entries(template.schemaAtributos)) {
    out[name] = resolveAttribute(name, def, spec, pecaScope, template.codigo, pecaIndex);
  }
  return out;
}

function resolveAttribute(
  name: string,
  def: SpecificationAttributeDef,
  spec: PieceSpecificationInput,
  pecaScope: EvalScope,
  tipo: string,
  pecaIndex: number
): unknown {
  if (Object.prototype.hasOwnProperty.call(spec.atributos, name)) {
    const v = spec.atributos[name];
    if (v !== null && v !== undefined) return coerceAttribute(name, def, v, tipo, pecaIndex);
  }
  if (def.source) {
    const v = pecaScope[def.source];
    if (v !== undefined) return coerceAttribute(name, def, v, tipo, pecaIndex);
  }
  if (def.default !== undefined) return def.default;
  if (def.required) {
    throw new ValidationError({
      code: "SPECIFICATION_ATTRIBUTE_INVALID",
      message: `atributo "${name}" obrigatório ausente em ${tipo} (peça ${pecaIndex})`,
      field: `pecas[${pecaIndex - 1}].especificacoes`,
      context: { tipo, atributo: name },
    });
  }
  return null;
}

function coerceAttribute(
  name: string,
  def: SpecificationAttributeDef,
  value: unknown,
  tipo: string,
  pecaIndex: number
): unknown {
  switch (def.type) {
    case "integer": {
      const n = Number(value);
      if (!Number.isFinite(n) || !Number.isInteger(n)) {
        throw new ValidationError({
          code: "SPECIFICATION_ATTRIBUTE_INVALID",
          message: `atributo "${name}" em ${tipo} (peça ${pecaIndex}) deve ser inteiro, recebeu ${value}`,
          field: `pecas[${pecaIndex - 1}].especificacoes`,
          context: { tipo, atributo: name, value },
        });
      }
      checkRange(name, n, def, tipo, pecaIndex);
      return n;
    }
    case "number": {
      const n = Number(value);
      if (!Number.isFinite(n)) {
        throw new ValidationError({
          code: "SPECIFICATION_ATTRIBUTE_INVALID",
          message: `atributo "${name}" em ${tipo} (peça ${pecaIndex}) deve ser número, recebeu ${value}`,
          field: `pecas[${pecaIndex - 1}].especificacoes`,
          context: { tipo, atributo: name, value },
        });
      }
      checkRange(name, n, def, tipo, pecaIndex);
      return n;
    }
    case "boolean": {
      if (typeof value !== "boolean") {
        throw new ValidationError({
          code: "SPECIFICATION_ATTRIBUTE_INVALID",
          message: `atributo "${name}" em ${tipo} (peça ${pecaIndex}) deve ser boolean`,
          field: `pecas[${pecaIndex - 1}].especificacoes`,
          context: { tipo, atributo: name, value },
        });
      }
      return value;
    }
    case "string":
      return String(value);
    case "option": {
      const s = String(value);
      if (def.options && !def.options.includes(s)) {
        throw new ValidationError({
          code: "SPECIFICATION_ATTRIBUTE_INVALID",
          message: `atributo "${name}" em ${tipo} (peça ${pecaIndex}) deve estar em [${def.options.join(", ")}], recebeu ${s}`,
          field: `pecas[${pecaIndex - 1}].especificacoes`,
          context: { tipo, atributo: name, value: s, options: def.options },
        });
      }
      return s;
    }
  }
}

function checkRange(
  name: string,
  n: number,
  def: SpecificationAttributeDef,
  tipo: string,
  pecaIndex: number
): void {
  if (def.min !== undefined && n < def.min) {
    throw new ValidationError({
      code: "SPECIFICATION_ATTRIBUTE_INVALID",
      message: `atributo "${name}" em ${tipo} (peça ${pecaIndex}) abaixo do mínimo (${def.min})`,
      field: `pecas[${pecaIndex - 1}].especificacoes`,
      context: { tipo, atributo: name, value: n, min: def.min },
    });
  }
  if (def.max !== undefined && n > def.max) {
    throw new ValidationError({
      code: "SPECIFICATION_ATTRIBUTE_INVALID",
      message: `atributo "${name}" em ${tipo} (peça ${pecaIndex}) acima do máximo (${def.max})`,
      field: `pecas[${pecaIndex - 1}].especificacoes`,
      context: { tipo, atributo: name, value: n, max: def.max },
    });
  }
}

// ---------------- Helpers ----------------

function agregar(pecas: PecaCalculada[]): Totais {
  const totais: Totais = {
    areaRealM2: 0,
    areaCobrancaM2: 0,
    quantidadePecas: pecas.length,
    porGrupo: {},
    porRole: {},
  };
  for (const p of pecas) {
    totais.areaRealM2 += p.areaRealM2;
    totais.areaCobrancaM2 += p.areaCobrancaM2;
  }
  totais.areaRealM2 = round4(totais.areaRealM2);
  totais.areaCobrancaM2 = round4(totais.areaCobrancaM2);
  return totais;
}

function pickPecaVariables(
  scope: EvalScope,
  vars: VariableSnapshot[]
): Record<string, VariableValue> {
  const out: Record<string, VariableValue> = {};
  for (const v of vars) {
    const value = scope[v.codigo];
    if (
      typeof value === "number" ||
      typeof value === "boolean" ||
      typeof value === "string"
    ) {
      out[v.codigo] = value;
    }
  }
  return out;
}

function filterNumeric(scope: EvalScope): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(scope)) {
    if (typeof v === "number") out[k] = v;
  }
  return out;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
