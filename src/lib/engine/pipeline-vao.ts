import { ValidationError, SelectorError } from "./errors";
import { evaluate } from "./evaluator";
import { avaliarPricing } from "./pricing";
import { resolveSelector } from "./selector";
import { ceil50, round4, unitFactor } from "./units";
import type {
  CalcInputVao,
  CalcOutput,
  ComputedValueSnapshot,
  EvalScope,
  EvaluationContext,
  PecaCalculada,
  PieceGroupSnapshot,
  PieceRoleSnapshot,
  TipologiaVaoSnapshot,
  Totais,
  VariableSnapshot,
  VariableValue,
} from "./types";

export function runPipelineVao(input: CalcInputVao): CalcOutput {
  const tipologia = input.tipologia;
  const factor = unitFactor(input.unit);
  const evalCtx: EvaluationContext = {
    scope: "VAO",
    tipologiaId: tipologia.id,
    precoVidro: input.lookups?.precoVidro,
    precoTorre: input.lookups?.precoTorre,
  };

  const vaoScope = prepareVaoScope(tipologia, input.variables, factor, evalCtx);
  evaluateVaoComputed(tipologia, vaoScope, evalCtx);

  const pecas: PecaCalculada[] = [];
  const groups = sortByOrdem(tipologia.pieceGroups);

  for (const group of groups) {
    const groupTotalRaw = evaluate(group.quantityExpression, vaoScope, {
      ...evalCtx,
      scope: "GROUP",
      groupCode: group.codigo,
      field: `piece_groups[${group.codigo}].quantity_expression`,
    });
    const groupTotal = Math.floor(Number(groupTotalRaw));
    if (!Number.isFinite(groupTotal) || groupTotal < 0) {
      throw new ValidationError({
        code: "GROUP_QUANTITY_INVALID",
        message: `quantidade inválida para grupo ${group.codigo}: ${groupTotalRaw}`,
        field: `piece_groups[${group.codigo}].quantity_expression`,
        context: { group_code: group.codigo, value: groupTotalRaw },
      });
    }
    if (groupTotal === 0) continue;

    const groupScope: EvalScope = { ...vaoScope, GROUP_TOTAL: groupTotal };
    evaluateGroupComputed(tipologia, group, groupScope, evalCtx);

    const roleByIndex = assignRoles(group, groupTotal, groupScope, evalCtx);

    for (let index = 1; index <= groupTotal; index++) {
      const role = roleByIndex.get(index);
      if (!role) {
        throw new SelectorError({
          code: "SELECTOR_GAP",
          message: `índice ${index} não é coberto por nenhum role do grupo ${group.codigo} (TOTAL=${groupTotal})`,
          context: {
            group_code: group.codigo,
            missing_index: index,
            total: groupTotal,
          },
        });
      }

      const pieceScope: EvalScope = {
        ...groupScope,
        INDEX: index,
        TOTAL: groupTotal,
        IS_FIRST: index === 1,
        IS_LAST: index === groupTotal,
        ROLE: role.codigo,
      };
      evaluatePieceComputed(tipologia, group, role, pieceScope, evalCtx);

      const wReal = Math.floor(
        Number(
          evaluate(role.widthExpression, pieceScope, {
            ...evalCtx,
            scope: "PIECE",
            groupCode: group.codigo,
            roleCode: role.codigo,
            field: `piece_groups[${group.codigo}].roles[${role.codigo}].width_expression`,
          })
        )
      );
      const hReal = Math.floor(
        Number(
          evaluate(role.heightExpression, pieceScope, {
            ...evalCtx,
            scope: "PIECE",
            groupCode: group.codigo,
            roleCode: role.codigo,
            field: `piece_groups[${group.codigo}].roles[${role.codigo}].height_expression`,
          })
        )
      );

      const wCobranca = ceil50(wReal);
      const hCobranca = ceil50(hReal);

      pecas.push({
        groupCode: group.codigo,
        roleCode: role.codigo,
        index,
        identificacao: null,
        wReal,
        hReal,
        wCobranca,
        hCobranca,
        areaRealM2: (wReal * hReal) / 1e6,
        areaCobrancaM2: (wCobranca * hCobranca) / 1e6,
        especificacoes: [],
        variables: {},
      });
    }
  }

  const totais = agregar(pecas);
  const breakdown = avaliarPricing({
    rules: tipologia.pricingRules,
    pecas,
    totais,
    baseScope: vaoScope,
    vidro: input.vidro,
    lookups: input.lookups,
    tipologiaId: tipologia.id,
  });
  const total = round2(breakdown.reduce((s, b) => s + b.valor, 0));

  return {
    pecas,
    variaveisCalculadas: filterNumeric(vaoScope),
    totais,
    preco: { breakdown, total },
  };
}

// ---------------- Variáveis & escopo VAO ----------------

function prepareVaoScope(
  tipologia: TipologiaVaoSnapshot,
  inputs: Record<string, VariableValue>,
  factor: number,
  evalCtx: EvaluationContext
): EvalScope {
  const scope: EvalScope = {};
  const vars = sortByOrdem(tipologia.variables);

  for (const v of vars) {
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
          context: { codigo: v.codigo },
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

  for (const v of vars) {
    const value = scope[v.codigo];
    if (typeof value !== "number") continue;

    if (v.minValue) {
      const min = Number(
        evaluate(v.minValue, scope, {
          ...evalCtx,
          scope: "VAO",
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
          scope: "VAO",
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
    scope: "VAO",
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

function evaluateVaoComputed(
  tipologia: TipologiaVaoSnapshot,
  scope: EvalScope,
  evalCtx: EvaluationContext
): void {
  const cvs = tipologia.computedValues
    .filter((c) => c.scope === "VAO")
    .sort((a, b) => a.orderInScope - b.orderInScope);
  for (const cv of cvs) {
    const v = evaluate(cv.expression, scope, {
      ...evalCtx,
      scope: "VAO",
      field: `computed_values[${cv.codigo}]`,
    });
    scope[cv.codigo] = typeof v === "number" ? v : Number(v);
  }
}

function evaluateGroupComputed(
  tipologia: TipologiaVaoSnapshot,
  group: PieceGroupSnapshot,
  scope: EvalScope,
  evalCtx: EvaluationContext
): void {
  const cvs = tipologia.computedValues
    .filter((c) => c.scope === "GROUP" && c.pieceGroupCodigo === group.codigo)
    .sort((a, b) => a.orderInScope - b.orderInScope);
  for (const cv of cvs) {
    const v = evaluate(cv.expression, scope, {
      ...evalCtx,
      scope: "GROUP",
      groupCode: group.codigo,
      field: `computed_values[${cv.codigo}]`,
    });
    scope[cv.codigo] = typeof v === "number" ? v : Number(v);
  }
}

function evaluatePieceComputed(
  tipologia: TipologiaVaoSnapshot,
  group: PieceGroupSnapshot,
  role: PieceRoleSnapshot,
  scope: EvalScope,
  evalCtx: EvaluationContext
): void {
  const cvs = tipologia.computedValues
    .filter((c) => c.scope === "PIECE" && c.pieceGroupCodigo === group.codigo)
    .sort((a, b) => a.orderInScope - b.orderInScope);
  for (const cv of cvs) {
    const v = evaluate(cv.expression, scope, {
      ...evalCtx,
      scope: "PIECE",
      groupCode: group.codigo,
      roleCode: role.codigo,
      field: `computed_values[${cv.codigo}]`,
    });
    scope[cv.codigo] = typeof v === "number" ? v : Number(v);
  }
}

function assignRoles(
  group: PieceGroupSnapshot,
  groupTotal: number,
  scope: EvalScope,
  evalCtx: EvaluationContext
): Map<number, PieceRoleSnapshot> {
  const result = new Map<number, PieceRoleSnapshot>();
  const roles = sortByOrdem(group.pieceRoles);
  for (const role of roles) {
    if (role.condition) {
      const pass = evaluate(role.condition, scope, {
        ...evalCtx,
        scope: "GROUP",
        groupCode: group.codigo,
        roleCode: role.codigo,
        field: `piece_groups[${group.codigo}].roles[${role.codigo}].condition`,
      });
      if (pass !== true) continue;
    }
    const indices = resolveSelector(
      role.selectorKind,
      role.selectorValue,
      groupTotal,
      scope
    );
    for (const idx of indices) {
      const existing = result.get(idx);
      if (existing) {
        throw new SelectorError({
          code: "SELECTOR_OVERLAP",
          message: `índice ${idx} reivindicado por roles "${existing.codigo}" e "${role.codigo}" no grupo ${group.codigo}`,
          context: {
            group_code: group.codigo,
            index: idx,
            roles: [existing.codigo, role.codigo],
          },
        });
      }
      result.set(idx, role);
    }
  }
  return result;
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
    if (p.groupCode) {
      const g = (totais.porGrupo[p.groupCode] ??= { count: 0, areaCob: 0 });
      g.count += 1;
      g.areaCob += p.areaCobrancaM2;
    }
    if (p.roleCode) {
      const r = (totais.porRole[p.roleCode] ??= { count: 0, areaCob: 0 });
      r.count += 1;
      r.areaCob += p.areaCobrancaM2;
    }
  }
  totais.areaRealM2 = round4(totais.areaRealM2);
  totais.areaCobrancaM2 = round4(totais.areaCobrancaM2);
  for (const k of Object.keys(totais.porGrupo)) {
    totais.porGrupo[k].areaCob = round4(totais.porGrupo[k].areaCob);
  }
  for (const k of Object.keys(totais.porRole)) {
    totais.porRole[k].areaCob = round4(totais.porRole[k].areaCob);
  }
  return totais;
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

function sortByOrdem<T extends { ordem: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => a.ordem - b.ordem);
}
