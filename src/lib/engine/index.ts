export type {
  AggregadoPorGrupo,
  AggregadoPorRole,
  BreakdownItem,
  CalcInput,
  CalcInputMedida,
  CalcInputVao,
  CalcOutput,
  ComputedValueSnapshot,
  ComputeScope,
  EvalScope,
  EvalScopeValue,
  EvaluationContext,
  Lookups,
  ModoDeProducao,
  PecaCalculada,
  PecaInputMedida,
  PieceGroupSnapshot,
  PieceRoleSnapshot,
  PieceSpecificationCalculada,
  PieceSpecificationInput,
  PricingAppliesTo,
  PricingBasis,
  PricingComponentKind,
  PricingRuleSnapshot,
  SelectorKind,
  SpecificationAttributeDef,
  SpecificationAttributeType,
  SpecificationTemplateSnapshot,
  TipologiaMedidaSnapshot,
  TipologiaSnapshot,
  TipologiaVaoSnapshot,
  Totais,
  Unit,
  VariableKind,
  VariableNivel,
  VariableOption,
  VariableSnapshot,
  VariableValue,
  VidroInput,
  VidroSnapshot,
} from "./types";

export {
  ERROR_CODES,
  FormulaError,
  SelectorError,
  ValidationError,
} from "./errors";
export type { ErrorCode, ValidationIssue } from "./errors";

export { evaluate, parseExpression, symbolsReferenced } from "./evaluator";
export { resolveSelector, selectorRequiresValue } from "./selector";
export { runPipeline, runPipelineVao, runPipelineMedida } from "./pipeline";
export { avaliarPricing } from "./pricing";
export { validateTipologia } from "./validation";
export { unitFactor, ceil50, round2, round4 } from "./units";
