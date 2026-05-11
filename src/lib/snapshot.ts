import type { Prisma } from "@prisma/client";
import type {
  ComputeScope,
  ModoDeProducao,
  PieceRoleSnapshot,
  PricingAppliesTo,
  PricingBasis,
  PricingComponentKind,
  SelectorKind,
  SpecificationAttributeDef,
  SpecificationTemplateSnapshot,
  TipologiaMedidaSnapshot,
  TipologiaSnapshot,
  TipologiaVaoSnapshot,
  VariableKind,
  VariableNivel,
  VariableOption,
  VariableSnapshot,
  VidroSnapshot,
} from "@/lib/engine";
import type { TipologiaPayload } from "@/lib/schemas";

export type TipologiaWithRelations = Prisma.TipologiaGetPayload<{
  include: {
    variables: true;
    computedValues: { include: { pieceGroup: true } };
    pieceGroups: { include: { pieceRoles: true } };
    specificationTemplates: true;
    pricingRules: true;
    vidros: { include: { vidro: { include: { cor: true } } } };
  };
}>;

export const TIPOLOGIA_INCLUDE = {
  variables: true,
  computedValues: { include: { pieceGroup: true } },
  pieceGroups: { include: { pieceRoles: true } },
  specificationTemplates: true,
  pricingRules: true,
  vidros: {
    include: { vidro: { include: { cor: true } } },
    orderBy: { ordem: "asc" },
  },
} as const;

export function tipologiaPrismaToSnapshot(
  t: TipologiaWithRelations
): TipologiaSnapshot {
  const modo = t.modoDeProducao as ModoDeProducao;
  const variables: VariableSnapshot[] = t.variables.map((v) => ({
    codigo: v.codigo,
    label: v.label,
    kind: v.kind as VariableKind,
    nivel: v.nivel as VariableNivel,
    unit: v.unit,
    required: v.required,
    defaultValue: v.defaultValue,
    minValue: v.minValue,
    maxValue: v.maxValue,
    options: parseOptions(v.options),
    ordem: v.ordem,
  }));
  const computedValues = t.computedValues.map((c) => ({
    codigo: c.codigo,
    expression: c.expression,
    scope: c.scope as ComputeScope,
    pieceGroupCodigo: c.pieceGroup?.codigo ?? null,
    orderInScope: c.orderInScope,
  }));
  const pricingRules = t.pricingRules.map((p) => ({
    codigo: p.codigo,
    label: p.label,
    componentKind: p.componentKind as PricingComponentKind,
    basis: p.basis as PricingBasis,
    appliesTo: p.appliesTo as PricingAppliesTo,
    appliesToValue: p.appliesToValue,
    expression: p.expression,
    condition: p.condition,
    ordem: p.ordem,
    ativo: p.ativo,
  }));
  const vidrosElegiveis: VidroSnapshot[] = t.vidros.map((tv) => ({
    id: tv.vidro.id,
    codigo: tv.vidro.codigo,
    label: tv.vidro.label,
    corCodigo: tv.vidro.cor.codigo,
    corLabel: tv.vidro.cor.label,
    espessura: tv.vidro.espessura,
    precoM2: tv.vidro.precoM2,
    ordem: tv.ordem,
  }));

  if (modo === "VAO") {
    const snap: TipologiaVaoSnapshot = {
      id: t.id,
      nome: t.nome,
      modo,
      variables,
      computedValues,
      pricingRules,
      vidrosElegiveis,
      renderKey: t.renderKey ?? null,
      pieceGroups: t.pieceGroups.map((g) => ({
        codigo: g.codigo,
        label: g.label,
        quantityExpression: g.quantityExpression,
        ordem: g.ordem,
        pieceRoles: g.pieceRoles.map((r): PieceRoleSnapshot => ({
          codigo: r.codigo,
          label: r.label,
          selectorKind: r.selectorKind as SelectorKind,
          selectorValue: r.selectorValue,
          condition: r.condition,
          widthExpression: r.widthExpression,
          heightExpression: r.heightExpression,
          ordem: r.ordem,
        })),
      })),
    };
    return snap;
  }

  const snap: TipologiaMedidaSnapshot = {
    id: t.id,
    nome: t.nome,
    modo: "MEDIDA_DE_PRODUCAO",
    variables,
    computedValues,
    pricingRules,
    vidrosElegiveis,
    renderKey: t.renderKey ?? null,
    specificationTemplates: t.specificationTemplates.map(
      (s): SpecificationTemplateSnapshot => ({
        codigo: s.codigo,
        label: s.label,
        schemaAtributos: parseSchemaAtributos(s.schemaAtributos),
        requiredMin: s.requiredMin,
        requiredMax: s.requiredMax,
        ordem: s.ordem,
      })
    ),
  };
  return snap;
}

export function payloadToSnapshot(
  payload: TipologiaPayload,
  id = 0
): TipologiaSnapshot {
  const variables: VariableSnapshot[] = payload.variables.map((v) => ({
    codigo: v.codigo,
    label: v.label,
    kind: v.kind,
    nivel: v.nivel,
    unit: v.unit ?? null,
    required: v.required,
    defaultValue: v.default_value ?? null,
    minValue: v.min_value ?? null,
    maxValue: v.max_value ?? null,
    options: v.options ?? null,
    ordem: v.ordem,
  }));
  const computedValues = payload.computed_values.map((c) => ({
    codigo: c.codigo,
    expression: c.expression,
    scope: c.scope,
    pieceGroupCodigo: c.piece_group_codigo ?? null,
    orderInScope: c.order_in_scope,
  }));
  const pricingRules = payload.pricing_rules.map((p) => ({
    codigo: p.codigo,
    label: p.label ?? null,
    componentKind: p.component_kind,
    basis: p.basis,
    appliesTo: p.applies_to,
    appliesToValue: p.applies_to_value ?? null,
    expression: p.expression,
    condition: p.condition ?? null,
    ordem: p.ordem,
    ativo: p.ativo,
  }));

  if (payload.modoDeProducao === "VAO") {
    return {
      id,
      nome: payload.nome,
      modo: "VAO",
      variables,
      computedValues,
      pricingRules,
      // payloadToSnapshot é usado para validação; vidros elegíveis não
      // afetam validação de fórmulas — basta uma lista vazia.
      vidrosElegiveis: [],
      renderKey: payload.render_key ?? null,
      pieceGroups: payload.piece_groups.map((g) => ({
        codigo: g.codigo,
        label: g.label,
        quantityExpression: g.quantity_expression,
        ordem: g.ordem,
        pieceRoles: g.piece_roles.map((r): PieceRoleSnapshot => ({
          codigo: r.codigo,
          label: r.label,
          selectorKind: r.selector_kind,
          selectorValue: r.selector_value ?? null,
          condition: r.condition ?? null,
          widthExpression: r.width_expression,
          heightExpression: r.height_expression,
          ordem: r.ordem,
        })),
      })),
    };
  }

  return {
    id,
    nome: payload.nome,
    modo: "MEDIDA_DE_PRODUCAO",
    variables,
    computedValues,
    pricingRules,
    vidrosElegiveis: [],
    renderKey: payload.render_key ?? null,
    specificationTemplates: payload.specification_templates.map(
      (s): SpecificationTemplateSnapshot => ({
        codigo: s.codigo,
        label: s.label,
        schemaAtributos: s.schema_atributos as Record<
          string,
          SpecificationAttributeDef
        >,
        requiredMin: s.required_min,
        requiredMax: s.required_max ?? null,
        ordem: s.ordem,
      })
    ),
  };
}

function parseOptions(raw: string | null): VariableOption[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as VariableOption[];
    return null;
  } catch {
    return null;
  }
}

function parseSchemaAtributos(raw: string): Record<string, SpecificationAttributeDef> {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, SpecificationAttributeDef>;
    }
    return {};
  } catch {
    return {};
  }
}
