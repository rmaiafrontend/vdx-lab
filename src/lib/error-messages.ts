import type { ValidationIssue } from "@/lib/engine";

/**
 * Mapeia códigos do engine para mensagens em PT-BR voltadas à vidraceira.
 * Códigos cobertos: ver `ERROR_CODES` em `@/lib/engine/errors`.
 */
type Ctx = Record<string, unknown>;

type Translator = (ctx: Ctx, fieldLabel?: string) => string;

const get = (ctx: Ctx, key: string) =>
  ctx && typeof ctx === "object" && key in ctx
    ? (ctx as Record<string, unknown>)[key]
    : undefined;

const fmt = (v: unknown): string =>
  v === null || v === undefined ? "?" : String(v);

const fieldName = (label: string | undefined, fallback: string) =>
  label && label.trim() ? label : fallback;

export const ERROR_MESSAGES_PT: Record<string, Translator> = {
  REQUIRED_VARIABLE_MISSING: (ctx, label) =>
    `O campo "${fieldName(label, fmt(get(ctx, "field")))}" é obrigatório.`,

  VARIABLE_OUT_OF_RANGE: (ctx, label) => {
    const min = get(ctx, "min");
    const max = get(ctx, "max");
    const unit = get(ctx, "unit");
    const range =
      min !== undefined && max !== undefined
        ? `entre ${fmt(min)} e ${fmt(max)}`
        : min !== undefined
          ? `mínimo ${fmt(min)}`
          : max !== undefined
            ? `máximo ${fmt(max)}`
            : "no intervalo permitido";
    return `${fieldName(label, fmt(get(ctx, "field")))} precisa estar ${range}${
      unit ? " " + fmt(unit) : ""
    }.`;
  },

  VARIABLE_TYPE_MISMATCH: (_, label) =>
    `O valor de "${fieldName(label, "campo")}" não está no formato esperado.`,

  FORMULA_DIVISION_BY_ZERO: () =>
    `Algum valor está zerando uma divisão na fórmula. Tente ajustar as medidas.`,

  FORMULA_PARSE_ERROR: () =>
    `Há uma fórmula inválida nesta tipologia. Avise o administrador.`,

  FORMULA_REFERENCE_ERROR: () =>
    `Uma fórmula está usando um valor que não foi definido. Avise o administrador.`,

  FORMULA_TYPE_ERROR: () =>
    `Uma fórmula recebeu um tipo de valor inesperado. Verifique as medidas.`,

  FORMULA_RUNTIME_ERROR: () =>
    `Não consegui calcular com essa configuração. Verifique as medidas.`,

  SELECTOR_OVERLAP: () =>
    `Os papéis das peças se sobrepõem nesta tipologia. Avise o administrador.`,

  SELECTOR_GAP: () =>
    `Faltam papéis para algumas peças nesta tipologia. Avise o administrador.`,

  SELECTOR_OUT_OF_RANGE: () =>
    `Um seletor de papel está fora da quantidade de peças. Avise o administrador.`,

  COMPUTED_VALUE_CYCLE: () =>
    `Há um cálculo recursivo nesta tipologia. Avise o administrador.`,

  GROUP_QUANTITY_INVALID: () =>
    `Não consegui determinar a quantidade de peças. Verifique as medidas.`,

  MODE_INCOMPATIBILITY: (ctx) =>
    `Configuração incompatível com o modo de produção da tipologia (${fmt(get(ctx, "modo"))}).`,

  LEVEL_INCOMPATIBILITY: (ctx) =>
    `Variável "${fmt(get(ctx, "codigo"))}" tem nível "${fmt(get(ctx, "nivel"))}" incompatível com o modo da tipologia.`,

  SPECIFICATION_SCHEMA_INVALID: (ctx) =>
    `Especificação "${fmt(get(ctx, "codigo"))}" tem definição inválida no atributo "${fmt(get(ctx, "atributo"))}".`,

  SPECIFICATION_COUNT_OUT_OF_RANGE: (ctx) =>
    `Quantidade de especificações "${fmt(get(ctx, "tipo"))}" fora do permitido para a peça.`,

  SPECIFICATION_ATTRIBUTE_INVALID: (ctx) =>
    `Atributo "${fmt(get(ctx, "atributo"))}" da especificação "${fmt(get(ctx, "tipo"))}" está com valor inválido.`,

  OPTION_LIST_VALUE_INVALID: (ctx, label) =>
    `Valor "${fmt(get(ctx, "value"))}" não é uma opção válida para "${fieldName(label, fmt(get(ctx, "codigo")))}".`,

  PRICING_BASIS_INCOMPATIBLE: (ctx) =>
    `Regra de preço "${fmt(get(ctx, "codigo"))}" usa basis "${fmt(get(ctx, "basis"))}" incompatível com modo "${fmt(get(ctx, "modo"))}".`,

  CONDITION_UNREACHABLE: (ctx) =>
    `Condição em papel "${fmt(get(ctx, "role_code"))}" nunca pode ser verdadeira nesta tipologia.`,
};

const DEFAULT_MESSAGE: Translator = () =>
  `Não foi possível calcular. Tente ajustar os valores.`;

/**
 * Traduz um issue do engine para uma mensagem PT-BR humanizada.
 * `fieldLabel` opcional permite usar o `label` da `Variable` em vez do `codigo`.
 */
export function translateIssue(
  issue: ValidationIssue,
  fieldLabel?: string
): string {
  const t = ERROR_MESSAGES_PT[issue.code] ?? DEFAULT_MESSAGE;
  return t(issue.context ?? {}, fieldLabel);
}

/** Pega o primeiro issue (geralmente o mais informativo) e traduz. */
export function firstIssueMessage(
  issues: ValidationIssue[] | null | undefined,
  fieldLabel?: string
): string | null {
  if (!issues || issues.length === 0) return null;
  return translateIssue(issues[0], fieldLabel);
}
