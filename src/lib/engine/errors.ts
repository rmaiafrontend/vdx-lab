import type { ComputeScope } from "./types";

export const ERROR_CODES = {
  FORMULA_PARSE_ERROR: "FORMULA_PARSE_ERROR",
  FORMULA_REFERENCE_ERROR: "FORMULA_REFERENCE_ERROR",
  FORMULA_DIVISION_BY_ZERO: "FORMULA_DIVISION_BY_ZERO",
  FORMULA_TYPE_ERROR: "FORMULA_TYPE_ERROR",
  FORMULA_RUNTIME_ERROR: "FORMULA_RUNTIME_ERROR",
  SELECTOR_OVERLAP: "SELECTOR_OVERLAP",
  SELECTOR_GAP: "SELECTOR_GAP",
  SELECTOR_OUT_OF_RANGE: "SELECTOR_OUT_OF_RANGE",
  CONDITION_UNREACHABLE: "CONDITION_UNREACHABLE",
  COMPUTED_VALUE_CYCLE: "COMPUTED_VALUE_CYCLE",
  REQUIRED_VARIABLE_MISSING: "REQUIRED_VARIABLE_MISSING",
  VARIABLE_OUT_OF_RANGE: "VARIABLE_OUT_OF_RANGE",
  VARIABLE_TYPE_MISMATCH: "VARIABLE_TYPE_MISMATCH",
  GROUP_QUANTITY_INVALID: "GROUP_QUANTITY_INVALID",
  MODE_INCOMPATIBILITY: "MODE_INCOMPATIBILITY",
  LEVEL_INCOMPATIBILITY: "LEVEL_INCOMPATIBILITY",
  SPECIFICATION_SCHEMA_INVALID: "SPECIFICATION_SCHEMA_INVALID",
  SPECIFICATION_COUNT_OUT_OF_RANGE: "SPECIFICATION_COUNT_OUT_OF_RANGE",
  SPECIFICATION_ATTRIBUTE_INVALID: "SPECIFICATION_ATTRIBUTE_INVALID",
  OPTION_LIST_VALUE_INVALID: "OPTION_LIST_VALUE_INVALID",
  PRICING_BASIS_INCOMPATIBLE: "PRICING_BASIS_INCOMPATIBLE",
} as const;

export type ErrorCode = keyof typeof ERROR_CODES;

export type ErrorContext = Record<string, unknown>;

type FormulaErrorInit = {
  code:
    | "FORMULA_PARSE_ERROR"
    | "FORMULA_REFERENCE_ERROR"
    | "FORMULA_DIVISION_BY_ZERO"
    | "FORMULA_TYPE_ERROR"
    | "FORMULA_RUNTIME_ERROR";
  message: string;
  expression: string;
  scope?: ComputeScope;
  position?: number;
  context?: ErrorContext;
  cause?: unknown;
};

export class FormulaError extends Error {
  readonly code: FormulaErrorInit["code"];
  readonly expression: string;
  readonly scope?: ComputeScope;
  readonly position?: number;
  readonly context?: ErrorContext;
  readonly cause?: unknown;

  constructor(init: FormulaErrorInit) {
    super(init.message);
    this.name = "FormulaError";
    this.code = init.code;
    this.expression = init.expression;
    this.scope = init.scope;
    this.position = init.position;
    this.context = init.context;
    this.cause = init.cause;
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      scope: this.scope,
      expression: this.expression,
      position: this.position,
      context: this.context,
    };
  }
}

type SelectorErrorInit = {
  code: "SELECTOR_OVERLAP" | "SELECTOR_GAP" | "SELECTOR_OUT_OF_RANGE";
  message: string;
  context?: ErrorContext;
  cause?: unknown;
};

export class SelectorError extends Error {
  readonly code: SelectorErrorInit["code"];
  readonly context?: ErrorContext;
  readonly cause?: unknown;

  constructor(init: SelectorErrorInit) {
    super(init.message);
    this.name = "SelectorError";
    this.code = init.code;
    this.context = init.context;
    this.cause = init.cause;
  }

  toJSON() {
    return { code: this.code, message: this.message, context: this.context };
  }
}

type ValidationErrorInit = {
  code: ErrorCode;
  message: string;
  field?: string;
  context?: ErrorContext;
  cause?: unknown;
};

export class ValidationError extends Error {
  readonly code: ErrorCode;
  readonly field?: string;
  readonly context?: ErrorContext;
  readonly cause?: unknown;

  constructor(init: ValidationErrorInit) {
    super(init.message);
    this.name = "ValidationError";
    this.code = init.code;
    this.field = init.field;
    this.context = init.context;
    this.cause = init.cause;
  }

  toJSON() {
    return {
      code: this.code,
      field: this.field,
      message: this.message,
      context: this.context,
    };
  }
}

export type ValidationIssue = {
  code: ErrorCode;
  field: string;
  message: string;
  context?: ErrorContext;
  severity?: "error" | "warning";
};
