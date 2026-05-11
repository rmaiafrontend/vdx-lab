import {
  create,
  all,
  type FunctionNode,
  type MathNode,
  type SymbolNode,
  type MathJsInstance,
} from "mathjs";
import { FormulaError } from "./errors";
import type { EvalScope, EvaluationContext } from "./types";

const math: MathJsInstance = create(all, { number: "number" });

math.import(
  {
    if: function ifFn(cond: unknown, a: unknown, b: unknown): unknown {
      return cond ? a : b;
    },
    // mathjs por default tenta coerce strings para Number em ==/!=, o que
    // quebra OPTION_LIST. Override que delega ao === JS quando qualquer dos
    // lados é string ou boolean; senão cai em comparação numérica direta.
    equal: function equalFn(a: unknown, b: unknown): boolean {
      if (typeof a === "string" || typeof b === "string") return a === b;
      if (typeof a === "boolean" || typeof b === "boolean") return a === b;
      return Number(a) === Number(b);
    },
    unequal: function unequalFn(a: unknown, b: unknown): boolean {
      if (typeof a === "string" || typeof b === "string") return a !== b;
      if (typeof a === "boolean" || typeof b === "boolean") return a !== b;
      return Number(a) !== Number(b);
    },
  },
  { override: true }
);

const ALLOWED_FUNCTIONS = new Set([
  "min",
  "max",
  "floor",
  "ceil",
  "round",
  "abs",
  "sqrt",
  "if",
  "precoVidro",
  "precoTorre",
  "count",
]);

export function parseExpression(expression: string): MathNode {
  try {
    return math.parse(expression);
  } catch (err) {
    throw new FormulaError({
      code: "FORMULA_PARSE_ERROR",
      message: err instanceof Error ? err.message : String(err),
      expression,
      cause: err,
    });
  }
}

function functionName(node: FunctionNode): string {
  if (node.fn && typeof (node.fn as SymbolNode).name === "string") {
    return (node.fn as SymbolNode).name;
  }
  return (node as unknown as { name?: string }).name ?? "";
}

function assertWhitelisted(node: MathNode, expression: string): void {
  let bad: string | null = null;
  node.traverse((child) => {
    if (bad) return;
    if (child.type === "FunctionNode") {
      const name = functionName(child as FunctionNode);
      if (!ALLOWED_FUNCTIONS.has(name)) bad = name || "<anônima>";
    }
  });
  if (bad) {
    throw new FormulaError({
      code: "FORMULA_RUNTIME_ERROR",
      message: `função "${bad}" não permitida`,
      expression,
    });
  }
}

function defaultPrecoVidro(): number {
  throw new Error(
    "precoVidro não injetado: o motor precisa de lookups.precoVidro para esta tipologia"
  );
}

function defaultPrecoTorre(): number {
  throw new Error(
    "precoTorre não injetado: o motor precisa de lookups.precoTorre para esta tipologia"
  );
}

export function evaluate(
  expression: string,
  vars: EvalScope,
  ctx: EvaluationContext
): number | boolean | string {
  const node = parseExpression(expression);
  assertWhitelisted(node, expression);

  const scope: EvalScope = {
    ...vars,
    precoVidro: ctx.precoVidro ?? defaultPrecoVidro,
    precoTorre: ctx.precoTorre ?? defaultPrecoTorre,
  };

  let result: unknown;
  try {
    result = node.evaluate(scope);
  } catch (err) {
    throw classify(err, expression, ctx);
  }

  if (typeof result === "number") {
    if (!Number.isFinite(result)) {
      throw new FormulaError({
        code: "FORMULA_DIVISION_BY_ZERO",
        message: `expressão devolveu ${result}`,
        expression,
        scope: ctx.scope,
        context: contextSnapshot(ctx),
      });
    }
    return result;
  }
  if (typeof result === "boolean") return result;
  if (typeof result === "string") return result;

  throw new FormulaError({
    code: "FORMULA_TYPE_ERROR",
    message: `expressão devolveu tipo ${typeof result}, esperado number/boolean/string`,
    expression,
    scope: ctx.scope,
    context: contextSnapshot(ctx),
  });
}

function classify(
  err: unknown,
  expression: string,
  ctx: EvaluationContext
): FormulaError {
  const msg = err instanceof Error ? err.message : String(err);
  let code: FormulaError["code"] = "FORMULA_RUNTIME_ERROR";
  if (
    /undefined symbol/i.test(msg) ||
    /not defined/i.test(msg) ||
    /is not a function/i.test(msg)
  ) {
    code = "FORMULA_REFERENCE_ERROR";
  } else if (/division.*zero/i.test(msg)) {
    code = "FORMULA_DIVISION_BY_ZERO";
  } else if (/type/i.test(msg) || /unexpected type/i.test(msg)) {
    code = "FORMULA_TYPE_ERROR";
  }
  return new FormulaError({
    code,
    message: msg,
    expression,
    scope: ctx.scope,
    context: contextSnapshot(ctx),
    cause: err,
  });
}

function contextSnapshot(ctx: EvaluationContext): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  if (ctx.tipologiaId !== undefined) snapshot.tipologia_id = ctx.tipologiaId;
  if (ctx.groupCode !== undefined) snapshot.group_code = ctx.groupCode;
  if (ctx.roleCode !== undefined) snapshot.role_code = ctx.roleCode;
  if (ctx.field !== undefined) snapshot.field = ctx.field;
  return snapshot;
}

export function symbolsReferenced(node: MathNode): Set<string> {
  const symbols = new Set<string>();
  node.traverse((child, _path, parent) => {
    if (child.type === "SymbolNode") {
      const name = (child as SymbolNode).name;
      if (
        parent &&
        parent.type === "FunctionNode" &&
        (parent as FunctionNode).fn === child
      ) {
        return;
      }
      symbols.add(name);
    }
  });
  return symbols;
}
