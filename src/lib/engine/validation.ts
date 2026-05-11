import type { MathNode } from "mathjs";
import { FormulaError, type ValidationIssue } from "./errors";
import { parseExpression, symbolsReferenced } from "./evaluator";
import { resolveSelector } from "./selector";
import type {
  ComputedValueSnapshot,
  PieceGroupSnapshot,
  PieceRoleSnapshot,
  PricingRuleSnapshot,
  SpecificationAttributeDef,
  SpecificationTemplateSnapshot,
  TipologiaMedidaSnapshot,
  TipologiaSnapshot,
  TipologiaVaoSnapshot,
  VariableSnapshot,
} from "./types";

const PIECE_BUILTINS = ["INDEX", "TOTAL", "IS_FIRST", "IS_LAST", "ROLE"];
const GROUP_BUILTINS = ["GROUP_TOTAL"];
const PRICING_BASE_EXTRAS = [
  "VidroId",
  "areaCobrancaTotal",
  "areaRealTotal",
  "quantidadePecas",
  "pecas",
];
const PRICING_PIECE_EXTRAS = [
  "INDEX",
  "ROLE",
  "wReal",
  "hReal",
  "wCobranca",
  "hCobranca",
  "areaRealM2",
  "areaCobrancaM2",
];

const ATTRIBUTE_TYPES = new Set([
  "integer",
  "number",
  "string",
  "boolean",
  "option",
]);

const VALID_BASIS_VAO = new Set([
  "PER_M2",
  "PER_PIECE",
  "PER_GROUP",
  "PER_VAO",
  "FIXED",
]);
const VALID_BASIS_MEDIDA = new Set([
  "PER_M2",
  "PER_PIECE",
  "PER_ORCAMENTO",
  "PER_SPECIFICATION",
  "FIXED",
]);

type ParsedKey = string;
type ParsedMap = Map<ParsedKey, MathNode>;

export function validateTipologia(
  snap: TipologiaSnapshot
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const parsed: ParsedMap = new Map();

  checkModeCompat(snap, issues);
  parseAll(snap, parsed, issues);
  checkReferences(snap, parsed, issues);
  checkDAG(snap, parsed, issues);

  if (snap.modo === "VAO") {
    checkSelectorCoverage(snap, parsed, issues);
  } else {
    checkSpecificationTemplates(snap, issues);
  }

  checkPricingMode(snap, issues);

  return issues;
}

// ---------------- Mode compatibility ----------------

function checkModeCompat(
  snap: TipologiaSnapshot,
  issues: ValidationIssue[]
): void {
  if (snap.modo === "VAO") {
    for (const v of snap.variables) {
      if (v.nivel === "PECA") {
        issues.push({
          code: "LEVEL_INCOMPATIBILITY",
          field: `variables[${v.codigo}].nivel`,
          message: `variável ${v.codigo} tem nivel=PECA mas tipologia é modo VAO`,
          context: { codigo: v.codigo, nivel: v.nivel, modo: snap.modo },
        });
      }
    }
    for (const cv of snap.computedValues) {
      if (cv.scope === "ORCAMENTO_PECA") {
        issues.push({
          code: "MODE_INCOMPATIBILITY",
          field: `computed_values[${cv.codigo}].scope`,
          message: `ComputedValue ${cv.codigo} tem scope=ORCAMENTO_PECA mas tipologia é modo VAO`,
          context: { codigo: cv.codigo, scope: cv.scope, modo: snap.modo },
        });
      }
    }
  } else {
    // MEDIDA_DE_PRODUCAO
    for (const v of snap.variables) {
      if (v.nivel === "VAO") {
        issues.push({
          code: "LEVEL_INCOMPATIBILITY",
          field: `variables[${v.codigo}].nivel`,
          message: `variável ${v.codigo} tem nivel=VAO mas tipologia é modo MEDIDA_DE_PRODUCAO`,
          context: { codigo: v.codigo, nivel: v.nivel, modo: snap.modo },
        });
      }
    }
    for (const cv of snap.computedValues) {
      if (cv.scope === "VAO" || cv.scope === "GROUP" || cv.scope === "PIECE") {
        issues.push({
          code: "MODE_INCOMPATIBILITY",
          field: `computed_values[${cv.codigo}].scope`,
          message: `ComputedValue ${cv.codigo} tem scope=${cv.scope} mas tipologia é modo MEDIDA_DE_PRODUCAO`,
          context: { codigo: cv.codigo, scope: cv.scope, modo: snap.modo },
        });
      }
    }
  }
}

// ---------------- Parse ----------------

function parseAll(
  snap: TipologiaSnapshot,
  parsed: ParsedMap,
  issues: ValidationIssue[]
): void {
  const tryParse = (expr: string | null, key: string, field: string): void => {
    if (!expr) return;
    try {
      parsed.set(key, parseExpression(expr));
    } catch (err) {
      if (err instanceof FormulaError) {
        issues.push({
          code: "FORMULA_PARSE_ERROR",
          field,
          message: err.message,
          context: { expression: expr },
        });
      } else {
        throw err;
      }
    }
  };

  for (const v of snap.variables) {
    if (v.kind === "OPTION_LIST") {
      // OPTION_LIST: default_value é literal, min/max ignorados
      continue;
    }
    tryParse(
      v.defaultValue,
      keyVarDefault(v),
      `variables[${v.codigo}].default_value`
    );
    tryParse(v.minValue, keyVarMin(v), `variables[${v.codigo}].min_value`);
    tryParse(v.maxValue, keyVarMax(v), `variables[${v.codigo}].max_value`);
  }
  for (const cv of snap.computedValues) {
    tryParse(
      cv.expression,
      keyCV(cv),
      `computed_values[${cv.codigo}@${cv.scope}].expression`
    );
  }
  if (snap.modo === "VAO") {
    for (const g of snap.pieceGroups) {
      tryParse(
        g.quantityExpression,
        keyGroupQty(g),
        `piece_groups[${g.codigo}].quantity_expression`
      );
      for (const r of g.pieceRoles) {
        tryParse(
          r.widthExpression,
          keyRoleW(g, r),
          `piece_groups[${g.codigo}].roles[${r.codigo}].width_expression`
        );
        tryParse(
          r.heightExpression,
          keyRoleH(g, r),
          `piece_groups[${g.codigo}].roles[${r.codigo}].height_expression`
        );
        tryParse(
          r.condition,
          keyRoleCondition(g, r),
          `piece_groups[${g.codigo}].roles[${r.codigo}].condition`
        );
        if (r.selectorKind === "EXPRESSION") {
          tryParse(
            r.selectorValue,
            keyRoleSelector(g, r),
            `piece_groups[${g.codigo}].roles[${r.codigo}].selector_value`
          );
        } else if (r.selectorKind === "RANGE" && r.selectorValue?.includes("..")) {
          const dot = r.selectorValue.indexOf("..");
          tryParse(
            r.selectorValue.slice(0, dot).trim(),
            keyRoleSelectorRangeStart(g, r),
            `piece_groups[${g.codigo}].roles[${r.codigo}].selector_value(start)`
          );
          tryParse(
            r.selectorValue.slice(dot + 2).trim(),
            keyRoleSelectorRangeEnd(g, r),
            `piece_groups[${g.codigo}].roles[${r.codigo}].selector_value(end)`
          );
        }
      }
    }
  }
  for (const p of snap.pricingRules) {
    tryParse(
      p.expression,
      keyPricingExpr(p),
      `pricing_rules[${p.codigo}].expression`
    );
    tryParse(
      p.condition,
      keyPricingCond(p),
      `pricing_rules[${p.codigo}].condition`
    );
  }
}

// ---------------- References ----------------

function checkReferences(
  snap: TipologiaSnapshot,
  parsed: ParsedMap,
  issues: ValidationIssue[]
): void {
  const orcamentoVars = snap.variables.filter((v) => v.nivel === "ORCAMENTO");
  const vaoVars =
    snap.modo === "VAO"
      ? snap.variables.filter((v) => v.nivel === "VAO")
      : [];
  const pecaVars =
    snap.modo === "MEDIDA_DE_PRODUCAO"
      ? snap.variables.filter((v) => v.nivel === "PECA")
      : [];

  const baseSyms = new Set<string>(orcamentoVars.map((v) => v.codigo));
  const vaoSyms = new Set<string>([
    ...baseSyms,
    ...vaoVars.map((v) => v.codigo),
    ...snap.computedValues
      .filter((c) => c.scope === "VAO")
      .map((c) => c.codigo),
  ]);
  const orcamentoPecaSyms = new Set<string>([
    ...baseSyms,
    ...pecaVars.map((v) => v.codigo),
    ...snap.computedValues
      .filter((c) => c.scope === "ORCAMENTO_PECA")
      .map((c) => c.codigo),
  ]);

  const groupSyms = new Map<string, Set<string>>();
  const pieceSyms = new Map<string, Set<string>>();
  for (const cv of snap.computedValues) {
    if (cv.scope === "GROUP" && cv.pieceGroupCodigo) {
      const set = groupSyms.get(cv.pieceGroupCodigo) ?? new Set<string>();
      set.add(cv.codigo);
      groupSyms.set(cv.pieceGroupCodigo, set);
    }
    if (cv.scope === "PIECE" && cv.pieceGroupCodigo) {
      const set = pieceSyms.get(cv.pieceGroupCodigo) ?? new Set<string>();
      set.add(cv.codigo);
      pieceSyms.set(cv.pieceGroupCodigo, set);
    }
  }

  const verify = (key: string, allowed: Set<string>, field: string): void => {
    const node = parsed.get(key);
    if (!node) return;
    for (const sym of symbolsReferenced(node)) {
      if (allowed.has(sym)) continue;
      if (sym === "true" || sym === "false") continue;
      issues.push({
        code: "FORMULA_REFERENCE_ERROR",
        field,
        message: `símbolo "${sym}" não existe no escopo`,
        context: { symbol: sym },
      });
    }
  };

  // Variables defaults/min/max
  for (const v of snap.variables) {
    if (v.kind === "OPTION_LIST") continue;
    const baseAllowed =
      v.nivel === "PECA" ? new Set(orcamentoPecaSyms) : new Set(vaoSyms);
    const allowed = new Set(baseAllowed);
    allowed.delete(v.codigo);
    verify(
      keyVarDefault(v),
      allowed,
      `variables[${v.codigo}].default_value`
    );
    verify(keyVarMin(v), baseAllowed, `variables[${v.codigo}].min_value`);
    verify(keyVarMax(v), baseAllowed, `variables[${v.codigo}].max_value`);
  }

  // ComputedValues
  for (const cv of snap.computedValues) {
    const allowed = scopeForComputed(
      cv,
      vaoSyms,
      orcamentoPecaSyms,
      groupSyms,
      pieceSyms
    );
    allowed.delete(cv.codigo);
    verify(
      keyCV(cv),
      allowed,
      `computed_values[${cv.codigo}@${cv.scope}].expression`
    );
  }

  // PieceGroups (modo VAO)
  if (snap.modo === "VAO") {
    for (const g of snap.pieceGroups) {
      verify(
        keyGroupQty(g),
        vaoSyms,
        `piece_groups[${g.codigo}].quantity_expression`
      );
      const groupAllowed = new Set([
        ...vaoSyms,
        ...GROUP_BUILTINS,
        ...(groupSyms.get(g.codigo) ?? []),
      ]);
      const pieceAllowed = new Set([
        ...groupAllowed,
        ...PIECE_BUILTINS,
        ...(pieceSyms.get(g.codigo) ?? []),
      ]);
      for (const r of g.pieceRoles) {
        verify(
          keyRoleW(g, r),
          pieceAllowed,
          `piece_groups[${g.codigo}].roles[${r.codigo}].width_expression`
        );
        verify(
          keyRoleH(g, r),
          pieceAllowed,
          `piece_groups[${g.codigo}].roles[${r.codigo}].height_expression`
        );
        verify(
          keyRoleCondition(g, r),
          groupAllowed,
          `piece_groups[${g.codigo}].roles[${r.codigo}].condition`
        );
        if (r.selectorKind === "EXPRESSION") {
          verify(
            keyRoleSelector(g, r),
            pieceAllowed,
            `piece_groups[${g.codigo}].roles[${r.codigo}].selector_value`
          );
        } else if (r.selectorKind === "RANGE") {
          const rangeAllowed = new Set([...vaoSyms, "N", "TOTAL"]);
          verify(
            keyRoleSelectorRangeStart(g, r),
            rangeAllowed,
            `piece_groups[${g.codigo}].roles[${r.codigo}].selector_value(start)`
          );
          verify(
            keyRoleSelectorRangeEnd(g, r),
            rangeAllowed,
            `piece_groups[${g.codigo}].roles[${r.codigo}].selector_value(end)`
          );
        }
      }
    }
  }

  // Pricing rules
  for (const p of snap.pricingRules) {
    const baseExpr = new Set(
      snap.modo === "VAO"
        ? [...vaoSyms, ...PRICING_BASE_EXTRAS]
        : [...orcamentoPecaSyms, ...PRICING_BASE_EXTRAS]
    );
    let allowed: Set<string>;
    if (p.basis === "PER_PIECE" || p.basis === "PER_SPECIFICATION") {
      allowed = new Set([...baseExpr, ...PRICING_PIECE_EXTRAS]);
      // PER_SPECIFICATION também aceita atributos do template — adicionamos
      // os nomes de todos os atributos de SpecificationTemplate.
      if (snap.modo === "MEDIDA_DE_PRODUCAO") {
        for (const tpl of snap.specificationTemplates) {
          for (const attrName of Object.keys(tpl.schemaAtributos)) {
            allowed.add(attrName);
          }
        }
      }
    } else {
      allowed = baseExpr;
    }
    verify(keyPricingExpr(p), allowed, `pricing_rules[${p.codigo}].expression`);
    verify(keyPricingCond(p), baseExpr, `pricing_rules[${p.codigo}].condition`);
  }
}

function scopeForComputed(
  cv: ComputedValueSnapshot,
  vaoSyms: Set<string>,
  orcamentoPecaSyms: Set<string>,
  groupSyms: Map<string, Set<string>>,
  pieceSyms: Map<string, Set<string>>
): Set<string> {
  if (cv.scope === "VAO") return new Set(vaoSyms);
  if (cv.scope === "ORCAMENTO_PECA") return new Set(orcamentoPecaSyms);
  if (cv.scope === "GROUP" && cv.pieceGroupCodigo) {
    return new Set([
      ...vaoSyms,
      ...GROUP_BUILTINS,
      ...(groupSyms.get(cv.pieceGroupCodigo) ?? []),
    ]);
  }
  if (cv.scope === "PIECE" && cv.pieceGroupCodigo) {
    return new Set([
      ...vaoSyms,
      ...GROUP_BUILTINS,
      ...(groupSyms.get(cv.pieceGroupCodigo) ?? []),
      ...PIECE_BUILTINS,
      ...(pieceSyms.get(cv.pieceGroupCodigo) ?? []),
    ]);
  }
  return new Set(vaoSyms);
}

// ---------------- DAG ----------------

function checkDAG(
  snap: TipologiaSnapshot,
  parsed: ParsedMap,
  issues: ValidationIssue[]
): void {
  detectCycle(
    snap.computedValues.filter((c) => c.scope === "VAO"),
    parsed,
    "computed_values(VAO)",
    issues
  );
  detectCycle(
    snap.computedValues.filter((c) => c.scope === "ORCAMENTO_PECA"),
    parsed,
    "computed_values(ORCAMENTO_PECA)",
    issues
  );

  const groupCodes = new Set(
    snap.computedValues
      .filter((c) => c.scope === "GROUP" || c.scope === "PIECE")
      .map((c) => c.pieceGroupCodigo)
      .filter((c): c is string => Boolean(c))
  );
  for (const gc of groupCodes) {
    detectCycle(
      snap.computedValues.filter(
        (c) => c.scope === "GROUP" && c.pieceGroupCodigo === gc
      ),
      parsed,
      `computed_values(GROUP@${gc})`,
      issues
    );
    detectCycle(
      snap.computedValues.filter(
        (c) => c.scope === "PIECE" && c.pieceGroupCodigo === gc
      ),
      parsed,
      `computed_values(PIECE@${gc})`,
      issues
    );
  }
}

function detectCycle(
  cvs: ComputedValueSnapshot[],
  parsed: ParsedMap,
  field: string,
  issues: ValidationIssue[]
): void {
  if (cvs.length === 0) return;
  const codigos = new Set(cvs.map((c) => c.codigo));
  const graph = new Map<string, Set<string>>();
  for (const cv of cvs) {
    const node = parsed.get(keyCV(cv));
    const deps = new Set<string>();
    if (node) {
      for (const sym of symbolsReferenced(node)) {
        if (codigos.has(sym) && sym !== cv.codigo) deps.add(sym);
      }
    }
    graph.set(cv.codigo, deps);
  }

  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;
  const color = new Map<string, number>();
  for (const c of codigos) color.set(c, WHITE);

  const dfs = (node: string, path: string[]): boolean => {
    color.set(node, GRAY);
    path.push(node);
    for (const dep of graph.get(node) ?? []) {
      if (color.get(dep) === GRAY) {
        const start = path.indexOf(dep);
        const cycle = path.slice(start).concat(dep);
        issues.push({
          code: "COMPUTED_VALUE_CYCLE",
          field,
          message: `Ciclo: ${cycle.join(" → ")}`,
          context: { cycle },
        });
        return true;
      }
      if (color.get(dep) === WHITE) {
        if (dfs(dep, path)) return true;
      }
    }
    path.pop();
    color.set(node, BLACK);
    return false;
  };

  for (const c of codigos) {
    if (color.get(c) === WHITE) {
      if (dfs(c, [])) return;
    }
  }
}

// ---------------- Selector coverage (com condition) ----------------

function checkSelectorCoverage(
  snap: TipologiaVaoSnapshot,
  parsed: ParsedMap,
  issues: ValidationIssue[]
): void {
  for (const group of snap.pieceGroups) {
    const totalSamples = collectSamples(snap, group, parsed);
    const conditionVars = collectConditionVariables(snap, group, parsed);
    const combos = enumerateCombinations(conditionVars);

    for (const total of totalSamples) {
      for (const combo of combos) {
        verifyGroupCoverage(group, total, combo, parsed, issues);
      }
    }
  }
}

type ComboValue = string | boolean;
type Combo = Record<string, ComboValue>;

function collectConditionVariables(
  snap: TipologiaVaoSnapshot,
  group: PieceGroupSnapshot,
  parsed: ParsedMap
): VariableSnapshot[] {
  const referenced = new Set<string>();
  for (const role of group.pieceRoles) {
    const node = parsed.get(keyRoleCondition(group, role));
    if (!node) continue;
    for (const sym of symbolsReferenced(node)) referenced.add(sym);
  }
  return snap.variables.filter(
    (v) =>
      referenced.has(v.codigo) &&
      (v.kind === "BOOLEAN" || v.kind === "OPTION_LIST")
  );
}

function enumerateCombinations(vars: VariableSnapshot[]): Combo[] {
  if (vars.length === 0) return [{}];
  let combos: Combo[] = [{}];
  for (const v of vars) {
    const next: Combo[] = [];
    const values: ComboValue[] =
      v.kind === "BOOLEAN"
        ? [true, false]
        : (v.options ?? []).map((o) => o.codigo);
    if (values.length === 0) continue;
    for (const combo of combos) {
      for (const val of values) {
        next.push({ ...combo, [v.codigo]: val });
      }
    }
    combos = next;
    if (combos.length > 32) break;
  }
  return combos;
}

function collectSamples(
  snap: TipologiaVaoSnapshot,
  group: PieceGroupSnapshot,
  parsed: ParsedMap
): number[] {
  const samples = new Set<number>();
  const node = parsed.get(keyGroupQty(group));
  if (!node) return [];

  const symbols = symbolsReferenced(node);
  const referenced = snap.variables.filter(
    (v) =>
      symbols.has(v.codigo) && (v.kind === "COUNT" || v.kind === "DIMENSION")
  );

  if (referenced.length === 0) {
    try {
      const v = node.evaluate({});
      const n = Math.floor(Number(v));
      if (Number.isFinite(n) && n >= 0) samples.add(n);
    } catch {
      // ignora
    }
  } else {
    for (const v of referenced) {
      for (const r of extractRange(v)) samples.add(r);
    }
  }

  if (samples.size === 0) {
    samples.add(3);
    samples.add(5);
  }

  return Array.from(samples).filter((n) => n > 0);
}

function extractRange(v: VariableSnapshot): number[] {
  const out: number[] = [];
  const tryInt = (s: string | null): number | null => {
    if (!s) return null;
    const n = Number(s.trim());
    return Number.isFinite(n) && Number.isInteger(n) ? n : null;
  };
  const min = tryInt(v.minValue) ?? 1;
  const max = tryInt(v.maxValue) ?? min + 5;
  const def = tryInt(v.defaultValue);
  out.push(min);
  if (def !== null && def !== min && def !== max) out.push(def);
  if (max !== min) out.push(max);
  if (max - min >= 4) out.push(Math.floor((min + max) / 2));
  return out;
}

function verifyGroupCoverage(
  group: PieceGroupSnapshot,
  total: number,
  combo: Combo,
  parsed: ParsedMap,
  issues: ValidationIssue[]
): void {
  if (total <= 0) return;

  const claimed = new Map<number, string>();
  for (const role of group.pieceRoles) {
    if (role.condition) {
      const node = parsed.get(keyRoleCondition(group, role));
      if (!node) continue;
      let pass: unknown;
      try {
        pass = node.evaluate({ ...combo });
      } catch {
        // expressão falha em runtime — ignora aqui (parse já reportou ou faltam vars)
        continue;
      }
      if (pass !== true) continue;
    }

    let indices: Set<number>;
    try {
      indices = resolveSelector(role.selectorKind, role.selectorValue, total);
    } catch {
      continue;
    }
    for (const idx of indices) {
      if (idx < 1 || idx > total) {
        issues.push({
          code: "SELECTOR_OUT_OF_RANGE",
          field: `piece_groups[${group.codigo}].roles[${role.codigo}]`,
          message: `Role "${role.codigo}" reivindica índice ${idx} fora de [1, ${total}]`,
          context: {
            group_code: group.codigo,
            role_code: role.codigo,
            index: idx,
            total,
            combo,
          },
        });
        continue;
      }
      const existing = claimed.get(idx);
      if (existing) {
        issues.push({
          code: "SELECTOR_OVERLAP",
          field: `piece_groups[${group.codigo}].roles`,
          message: `Índice ${idx} reivindicado por "${existing}" e "${role.codigo}" (TOTAL=${total})`,
          context: {
            group_code: group.codigo,
            index: idx,
            roles: [existing, role.codigo],
            total,
            combo,
          },
        });
      } else {
        claimed.set(idx, role.codigo);
      }
    }
  }

  for (let i = 1; i <= total; i++) {
    if (!claimed.has(i)) {
      issues.push({
        code: "SELECTOR_GAP",
        field: `piece_groups[${group.codigo}].roles`,
        message: `Índice ${i} não é coberto quando TOTAL=${total}${formatCombo(combo)}`,
        context: {
          group_code: group.codigo,
          missing_index: i,
          total,
          combo,
        },
      });
    }
  }
}

function formatCombo(combo: Combo): string {
  const entries = Object.entries(combo);
  if (entries.length === 0) return "";
  const txt = entries.map(([k, v]) => `${k}=${v}`).join(", ");
  return ` e ${txt}`;
}

// ---------------- Specification templates ----------------

function checkSpecificationTemplates(
  snap: TipologiaMedidaSnapshot,
  issues: ValidationIssue[]
): void {
  const variableNames = new Set(snap.variables.map((v) => v.codigo));
  const computedNames = new Set(
    snap.computedValues
      .filter((c) => c.scope === "ORCAMENTO_PECA")
      .map((c) => c.codigo)
  );

  for (const tpl of snap.specificationTemplates) {
    if (
      tpl.requiredMax !== null &&
      tpl.requiredMin > tpl.requiredMax
    ) {
      issues.push({
        code: "SPECIFICATION_SCHEMA_INVALID",
        field: `specification_templates[${tpl.codigo}]`,
        message: `requiredMin (${tpl.requiredMin}) > requiredMax (${tpl.requiredMax})`,
        context: { codigo: tpl.codigo },
      });
    }
    for (const [name, def] of Object.entries(tpl.schemaAtributos)) {
      validateAttributeDef(tpl, name, def, variableNames, computedNames, issues);
    }
  }
}

function validateAttributeDef(
  tpl: SpecificationTemplateSnapshot,
  name: string,
  def: SpecificationAttributeDef,
  variableNames: Set<string>,
  computedNames: Set<string>,
  issues: ValidationIssue[]
): void {
  if (!ATTRIBUTE_TYPES.has(def.type)) {
    issues.push({
      code: "SPECIFICATION_SCHEMA_INVALID",
      field: `specification_templates[${tpl.codigo}].schemaAtributos.${name}`,
      message: `tipo "${def.type}" não é reconhecido`,
      context: { codigo: tpl.codigo, atributo: name, type: def.type },
    });
  }
  if (def.type === "option" && (!def.options || def.options.length === 0)) {
    issues.push({
      code: "SPECIFICATION_SCHEMA_INVALID",
      field: `specification_templates[${tpl.codigo}].schemaAtributos.${name}`,
      message: `tipo "option" requer "options"`,
      context: { codigo: tpl.codigo, atributo: name },
    });
  }
  if (def.required && def.default !== undefined) {
    issues.push({
      code: "SPECIFICATION_SCHEMA_INVALID",
      field: `specification_templates[${tpl.codigo}].schemaAtributos.${name}`,
      message: `atributo "${name}" não pode ser required e ter default ao mesmo tempo`,
      context: { codigo: tpl.codigo, atributo: name },
    });
  }
  if (def.source && !variableNames.has(def.source) && !computedNames.has(def.source)) {
    issues.push({
      code: "SPECIFICATION_SCHEMA_INVALID",
      field: `specification_templates[${tpl.codigo}].schemaAtributos.${name}.source`,
      message: `source "${def.source}" não é uma variável nem ComputedValue da tipologia`,
      context: { codigo: tpl.codigo, atributo: name, source: def.source },
    });
  }
}

// ---------------- Pricing × modo ----------------

function checkPricingMode(
  snap: TipologiaSnapshot,
  issues: ValidationIssue[]
): void {
  const allowed =
    snap.modo === "VAO" ? VALID_BASIS_VAO : VALID_BASIS_MEDIDA;
  for (const rule of snap.pricingRules) {
    if (!allowed.has(rule.basis)) {
      issues.push({
        code: "PRICING_BASIS_INCOMPATIBLE",
        field: `pricing_rules[${rule.codigo}].basis`,
        message: `basis "${rule.basis}" não é compatível com modo ${snap.modo}`,
        context: {
          codigo: rule.codigo,
          basis: rule.basis,
          modo: snap.modo,
        },
      });
    }
    if (
      rule.appliesTo === "SPECIFICATION_TYPE" &&
      snap.modo === "MEDIDA_DE_PRODUCAO"
    ) {
      const tipos = new Set(
        snap.specificationTemplates.map((t) => t.codigo)
      );
      if (rule.appliesToValue && !tipos.has(rule.appliesToValue)) {
        issues.push({
          code: "PRICING_BASIS_INCOMPATIBLE",
          field: `pricing_rules[${rule.codigo}].applies_to_value`,
          message: `applies_to_value "${rule.appliesToValue}" não é um SpecificationTemplate desta tipologia`,
          context: {
            codigo: rule.codigo,
            applies_to_value: rule.appliesToValue,
          },
        });
      }
    }
    if (
      rule.appliesTo === "SPECIFICATION_TYPE" &&
      snap.modo === "VAO"
    ) {
      issues.push({
        code: "PRICING_BASIS_INCOMPATIBLE",
        field: `pricing_rules[${rule.codigo}].applies_to`,
        message: `applies_to=SPECIFICATION_TYPE não cabe em modo VAO`,
        context: { codigo: rule.codigo, modo: snap.modo },
      });
    }
  }
}

// ---------------- Keys ----------------

function keyVarDefault(v: VariableSnapshot): ParsedKey {
  return `var:${v.codigo}:default`;
}
function keyVarMin(v: VariableSnapshot): ParsedKey {
  return `var:${v.codigo}:min`;
}
function keyVarMax(v: VariableSnapshot): ParsedKey {
  return `var:${v.codigo}:max`;
}
function keyCV(cv: ComputedValueSnapshot): ParsedKey {
  return `cv:${cv.codigo}:${cv.scope}:${cv.pieceGroupCodigo ?? ""}`;
}
function keyGroupQty(g: PieceGroupSnapshot): ParsedKey {
  return `group:${g.codigo}:qty`;
}
function keyRoleW(g: PieceGroupSnapshot, r: PieceRoleSnapshot): ParsedKey {
  return `role:${g.codigo}:${r.codigo}:w`;
}
function keyRoleH(g: PieceGroupSnapshot, r: PieceRoleSnapshot): ParsedKey {
  return `role:${g.codigo}:${r.codigo}:h`;
}
function keyRoleCondition(
  g: PieceGroupSnapshot,
  r: PieceRoleSnapshot
): ParsedKey {
  return `role:${g.codigo}:${r.codigo}:cond`;
}
function keyRoleSelector(
  g: PieceGroupSnapshot,
  r: PieceRoleSnapshot
): ParsedKey {
  return `role:${g.codigo}:${r.codigo}:sel`;
}
function keyRoleSelectorRangeStart(
  g: PieceGroupSnapshot,
  r: PieceRoleSnapshot
): ParsedKey {
  return `role:${g.codigo}:${r.codigo}:range:start`;
}
function keyRoleSelectorRangeEnd(
  g: PieceGroupSnapshot,
  r: PieceRoleSnapshot
): ParsedKey {
  return `role:${g.codigo}:${r.codigo}:range:end`;
}
function keyPricingExpr(p: PricingRuleSnapshot): ParsedKey {
  return `pricing:${p.codigo}:expr`;
}
function keyPricingCond(p: PricingRuleSnapshot): ParsedKey {
  return `pricing:${p.codigo}:cond`;
}
