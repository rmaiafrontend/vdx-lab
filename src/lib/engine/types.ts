export type Unit = "mm" | "cm" | "m";

export type VariableKind =
  | "DIMENSION"
  | "COUNT"
  | "TECHNICAL_PARAM"
  | "BOOLEAN"
  | "OPTION_LIST";

export type VariableNivel = "ORCAMENTO" | "VAO" | "PECA";

export type ComputeScope = "VAO" | "GROUP" | "PIECE" | "ORCAMENTO_PECA";

export type ModoDeProducao = "VAO" | "MEDIDA_DE_PRODUCAO";

export type SelectorKind =
  | "ALL"
  | "FIRST"
  | "LAST"
  | "FIRST_AND_LAST"
  | "EXCEPT_FIRST_LAST"
  | "INDEX"
  | "INDEX_LIST"
  | "RANGE"
  | "ODD"
  | "EVEN"
  | "EXPRESSION";

export type PricingBasis =
  | "PER_M2"
  | "PER_PIECE"
  | "PER_GROUP"
  | "PER_VAO"
  | "PER_ORCAMENTO"
  | "PER_SPECIFICATION"
  | "FIXED";

export type PricingAppliesTo =
  | "TIPOLOGIA"
  | "GROUP_CODE"
  | "ROLE_CODE"
  | "SPECIFICATION_TYPE";

export type PricingComponentKind =
  | "VIDRO"
  | "FERRAGEM"
  | "INSTALACAO"
  | "MAO_OBRA"
  | "BENEFICIAMENTO"
  | "OUTRO";

export type VariableOption = {
  codigo: string;
  label: string;
};

export type VariableSnapshot = {
  codigo: string;
  label: string;
  kind: VariableKind;
  nivel: VariableNivel;
  unit: string | null;
  required: boolean;
  defaultValue: string | null;
  minValue: string | null;
  maxValue: string | null;
  options: VariableOption[] | null;
  ordem: number;
};

export type ComputedValueSnapshot = {
  codigo: string;
  expression: string;
  scope: ComputeScope;
  pieceGroupCodigo: string | null;
  orderInScope: number;
};

export type PieceRoleSnapshot = {
  codigo: string;
  label: string;
  selectorKind: SelectorKind;
  selectorValue: string | null;
  condition: string | null;
  widthExpression: string;
  heightExpression: string;
  ordem: number;
};

export type PieceGroupSnapshot = {
  codigo: string;
  label: string;
  quantityExpression: string;
  ordem: number;
  pieceRoles: PieceRoleSnapshot[];
};

export type SpecificationAttributeType =
  | "integer"
  | "number"
  | "string"
  | "boolean"
  | "option";

export type SpecificationAttributeDef = {
  type: SpecificationAttributeType;
  required?: boolean;
  default?: unknown;
  min?: number;
  max?: number;
  options?: string[];
  source?: string;
};

export type SpecificationTemplateSnapshot = {
  codigo: string;
  label: string;
  schemaAtributos: Record<string, SpecificationAttributeDef>;
  requiredMin: number;
  requiredMax: number | null;
  ordem: number;
};

export type PricingRuleSnapshot = {
  codigo: string;
  label: string | null;
  componentKind: PricingComponentKind;
  basis: PricingBasis;
  appliesTo: PricingAppliesTo;
  appliesToValue: string | null;
  expression: string;
  condition: string | null;
  ordem: number;
  ativo: boolean;
};

export type VidroSnapshot = {
  id: number;
  codigo: string;
  label: string;
  corCodigo: string;
  corLabel: string;
  espessura: number;
  precoM2: number;
  ordem: number;
};

type TipologiaSnapshotBase = {
  id: number;
  nome: string;
  variables: VariableSnapshot[];
  computedValues: ComputedValueSnapshot[];
  pricingRules: PricingRuleSnapshot[];
  vidrosElegiveis: VidroSnapshot[];
  /** Chave do template no vdx-render-embed (`porta-vidro`, `varanda`, …). */
  renderKey: string | null;
};

export type TipologiaVaoSnapshot = TipologiaSnapshotBase & {
  modo: "VAO";
  pieceGroups: PieceGroupSnapshot[];
};

export type TipologiaMedidaSnapshot = TipologiaSnapshotBase & {
  modo: "MEDIDA_DE_PRODUCAO";
  specificationTemplates: SpecificationTemplateSnapshot[];
};

export type TipologiaSnapshot = TipologiaVaoSnapshot | TipologiaMedidaSnapshot;

// ----------------------- Inputs de cálculo -----------------------

export type VariableValue = number | boolean | string;

export type VidroInput = {
  vidroId?: number;
  /** Override do preço/m² do vidro selecionado, sem alterar o catálogo. */
  precoM2?: number;
};

export type Lookups = {
  precoVidro?: (vidroId: number) => number;
  precoTorre?: (modelo: string | number) => number;
};

export type CalcInputVao = {
  tipologia: TipologiaVaoSnapshot;
  variables: Record<string, VariableValue>;
  unit: Unit;
  vidro?: VidroInput;
  lookups?: Lookups;
};

export type PieceSpecificationInput = {
  tipo: string;
  atributos: Record<string, unknown>;
};

export type PecaInputMedida = {
  identificacao?: string;
  variables: Record<string, VariableValue>;
  especificacoes: PieceSpecificationInput[];
};

export type CalcInputMedida = {
  tipologia: TipologiaMedidaSnapshot;
  variaveisOrcamento: Record<string, VariableValue>;
  pecas: PecaInputMedida[];
  unit: Unit;
  vidro?: VidroInput;
  lookups?: Lookups;
};

export type CalcInput = CalcInputVao | CalcInputMedida;

// ----------------------- Outputs -----------------------

export type PieceSpecificationCalculada = {
  tipo: string;
  atributos: Record<string, unknown>;
};

export type PecaCalculada = {
  groupCode: string | null;
  roleCode: string | null;
  index: number;
  identificacao: string | null;
  wReal: number;
  hReal: number;
  wCobranca: number;
  hCobranca: number;
  areaRealM2: number;
  areaCobrancaM2: number;
  especificacoes: PieceSpecificationCalculada[];
  /** Variáveis da peça resolvidas (modo MEDIDA). Vazio em modo VAO. */
  variables: Record<string, VariableValue>;
};

export type AggregadoPorGrupo = { count: number; areaCob: number };
export type AggregadoPorRole = { count: number; areaCob: number };

export type Totais = {
  areaRealM2: number;
  areaCobrancaM2: number;
  quantidadePecas: number;
  porGrupo: Record<string, AggregadoPorGrupo>;
  porRole: Record<string, AggregadoPorRole>;
};

export type BreakdownItem = {
  ruleCode: string;
  kind: PricingComponentKind;
  valor: number;
};

export type CalcOutput = {
  pecas: PecaCalculada[];
  variaveisCalculadas: Record<string, number>;
  totais: Totais;
  preco: { breakdown: BreakdownItem[]; total: number };
};

// ----------------------- Evaluator -----------------------

export type EvalScopeValue =
  | number
  | boolean
  | string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  | ((...args: any[]) => any);
export type EvalScope = Record<string, EvalScopeValue>;

export type EvaluationContext = {
  scope: ComputeScope;
  tipologiaId?: number;
  groupCode?: string;
  roleCode?: string;
  field?: string;
  precoVidro?: (vidroId: number) => number;
  precoTorre?: (modelo: string | number) => number;
};
