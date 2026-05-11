import { readFileSync } from "node:fs";
import { join } from "node:path";
import type {
  ComputedValueSnapshot,
  Lookups,
  PieceGroupSnapshot,
  PieceRoleSnapshot,
  PricingRuleSnapshot,
  SpecificationAttributeDef,
  SpecificationTemplateSnapshot,
  TipologiaMedidaSnapshot,
  TipologiaSnapshot,
  TipologiaVaoSnapshot,
  VariableOption,
  VariableSnapshot,
} from "@/lib/engine";

type SeedJson = {
  nome: string;
  modoDeProducao: "VAO" | "MEDIDA_DE_PRODUCAO";
  variables: Array<{
    codigo: string;
    label: string;
    descricao?: string | null;
    kind: string;
    nivel: string;
    unit?: string | null;
    required?: boolean;
    default_value?: string | null;
    min_value?: string | null;
    max_value?: string | null;
    options?: VariableOption[] | null;
    ordem?: number;
  }>;
  computed_values: Array<{
    codigo: string;
    expression: string;
    scope: "VAO" | "GROUP" | "PIECE" | "ORCAMENTO_PECA";
    piece_group_codigo?: string | null;
    order_in_scope?: number;
  }>;
  piece_groups?: Array<{
    codigo: string;
    label: string;
    quantity_expression: string;
    ordem?: number;
    piece_roles: Array<{
      codigo: string;
      label: string;
      selector_kind: string;
      selector_value?: string | null;
      condition?: string | null;
      width_expression: string;
      height_expression: string;
      ordem?: number;
    }>;
  }>;
  specification_templates?: Array<{
    codigo: string;
    label: string;
    schema_atributos: Record<string, SpecificationAttributeDef>;
    required_min?: number;
    required_max?: number | null;
    ordem?: number;
  }>;
  pricing_rules: Array<{
    codigo: string;
    label?: string | null;
    component_kind: string;
    basis: string;
    applies_to: string;
    applies_to_value?: string | null;
    expression: string;
    condition?: string | null;
    ordem?: number;
    ativo?: boolean;
  }>;
};

export function loadSeed(name: string, id = 1): TipologiaSnapshot {
  const path = join(process.cwd(), "seed", `${name}.json`);
  const j = JSON.parse(readFileSync(path, "utf-8")) as SeedJson;

  const variables: VariableSnapshot[] = j.variables.map((v) => ({
    codigo: v.codigo,
    label: v.label,
    kind: v.kind as VariableSnapshot["kind"],
    nivel: v.nivel as VariableSnapshot["nivel"],
    unit: v.unit ?? null,
    required: v.required ?? true,
    defaultValue: v.default_value ?? null,
    minValue: v.min_value ?? null,
    maxValue: v.max_value ?? null,
    options: v.options ?? null,
    ordem: v.ordem ?? 0,
  }));
  const computedValues: ComputedValueSnapshot[] = j.computed_values.map((c) => ({
    codigo: c.codigo,
    expression: c.expression,
    scope: c.scope,
    pieceGroupCodigo: c.piece_group_codigo ?? null,
    orderInScope: c.order_in_scope ?? 0,
  }));
  const pricingRules: PricingRuleSnapshot[] = j.pricing_rules.map((p) => ({
    codigo: p.codigo,
    label: p.label ?? null,
    componentKind: p.component_kind as PricingRuleSnapshot["componentKind"],
    basis: p.basis as PricingRuleSnapshot["basis"],
    appliesTo: p.applies_to as PricingRuleSnapshot["appliesTo"],
    appliesToValue: p.applies_to_value ?? null,
    expression: p.expression,
    condition: p.condition ?? null,
    ordem: p.ordem ?? 0,
    ativo: p.ativo ?? true,
  }));

  if (j.modoDeProducao === "VAO") {
    const pieceGroups: PieceGroupSnapshot[] = (j.piece_groups ?? []).map((g) => ({
      codigo: g.codigo,
      label: g.label,
      quantityExpression: g.quantity_expression,
      ordem: g.ordem ?? 0,
      pieceRoles: g.piece_roles.map(
        (r): PieceRoleSnapshot => ({
          codigo: r.codigo,
          label: r.label,
          selectorKind: r.selector_kind as PieceRoleSnapshot["selectorKind"],
          selectorValue: r.selector_value ?? null,
          condition: r.condition ?? null,
          widthExpression: r.width_expression,
          heightExpression: r.height_expression,
          ordem: r.ordem ?? 0,
        })
      ),
    }));
    const snap: TipologiaVaoSnapshot = {
      id,
      nome: j.nome,
      modo: "VAO",
      variables,
      computedValues,
      pricingRules,
      vidrosElegiveis: [],
      renderKey: null,
      pieceGroups,
    };
    return snap;
  }

  const specificationTemplates: SpecificationTemplateSnapshot[] = (
    j.specification_templates ?? []
  ).map((s) => ({
    codigo: s.codigo,
    label: s.label,
    schemaAtributos: s.schema_atributos,
    requiredMin: s.required_min ?? 0,
    requiredMax: s.required_max ?? null,
    ordem: s.ordem ?? 0,
  }));
  const snap: TipologiaMedidaSnapshot = {
    id,
    nome: j.nome,
    modo: "MEDIDA_DE_PRODUCAO",
    variables,
    computedValues,
    pricingRules,
    vidrosElegiveis: [],
    renderKey: null,
    specificationTemplates,
  };
  return snap;
}

export function loadSeedVao(name: string, id = 1): TipologiaVaoSnapshot {
  const snap = loadSeed(name, id);
  if (snap.modo !== "VAO") {
    throw new Error(`Seed "${name}" não é modo VAO`);
  }
  return snap;
}

export function loadSeedMedida(
  name: string,
  id = 1
): TipologiaMedidaSnapshot {
  const snap = loadSeed(name, id);
  if (snap.modo !== "MEDIDA_DE_PRODUCAO") {
    throw new Error(`Seed "${name}" não é modo MEDIDA_DE_PRODUCAO`);
  }
  return snap;
}

export function emptyVaoTipologia(
  overrides: Partial<TipologiaVaoSnapshot> = {}
): TipologiaVaoSnapshot {
  return {
    id: 1,
    nome: "test",
    modo: "VAO",
    variables: [],
    computedValues: [],
    pieceGroups: [],
    pricingRules: [],
    vidrosElegiveis: [],
    renderKey: null,
    ...overrides,
  };
}

export function emptyMedidaTipologia(
  overrides: Partial<TipologiaMedidaSnapshot> = {}
): TipologiaMedidaSnapshot {
  return {
    id: 1,
    nome: "test",
    modo: "MEDIDA_DE_PRODUCAO",
    variables: [],
    computedValues: [],
    specificationTemplates: [],
    pricingRules: [],
    vidrosElegiveis: [],
    renderKey: null,
    ...overrides,
  };
}

export function lvarVar(
  codigo: string,
  overrides: Partial<VariableSnapshot> = {}
): VariableSnapshot {
  return {
    codigo,
    label: codigo,
    kind: "DIMENSION",
    nivel: "VAO",
    unit: "mm",
    required: true,
    defaultValue: null,
    minValue: null,
    maxValue: null,
    options: null,
    ordem: 1,
    ...overrides,
  };
}

/**
 * Catálogo de vidros usado pelos testes — espelha seed/vidro.json (mesma
 * ordem, ids = posição+1). Preço é intrínseco ao vidro, não recebe cor +
 * espessura como argumentos.
 */
export const VIDROS_FIXTURE = [
  { id: 1,  codigo: "INCOLOR_6",  cor: "INCOLOR", espessura: 6,  precoM2: 220 },
  { id: 2,  codigo: "INCOLOR_8",  cor: "INCOLOR", espessura: 8,  precoM2: 280 },
  { id: 3,  codigo: "INCOLOR_10", cor: "INCOLOR", espessura: 10, precoM2: 360 },
  { id: 4,  codigo: "INCOLOR_12", cor: "INCOLOR", espessura: 12, precoM2: 460 },
  { id: 5,  codigo: "FUME_6",     cor: "FUME",    espessura: 6,  precoM2: 260 },
  { id: 6,  codigo: "FUME_8",     cor: "FUME",    espessura: 8,  precoM2: 330 },
  { id: 7,  codigo: "FUME_10",    cor: "FUME",    espessura: 10, precoM2: 420 },
  { id: 8,  codigo: "FUME_12",    cor: "FUME",    espessura: 12, precoM2: 540 },
  { id: 9,  codigo: "VERDE_6",    cor: "VERDE",   espessura: 6,  precoM2: 250 },
  { id: 10, codigo: "VERDE_8",    cor: "VERDE",   espessura: 8,  precoM2: 320 },
  { id: 11, codigo: "VERDE_10",   cor: "VERDE",   espessura: 10, precoM2: 410 },
  { id: 12, codigo: "VERDE_12",   cor: "VERDE",   espessura: 12, precoM2: 520 },
] as const;

export const VIDRO_IDS = Object.fromEntries(
  VIDROS_FIXTURE.map((v) => [v.codigo, v.id])
) as Record<(typeof VIDROS_FIXTURE)[number]["codigo"], number>;

// Lookups mockados que cobrem 003/005/006.
export function makeLookups(): Lookups {
  const precoVidroById = new Map<number, number>(
    VIDROS_FIXTURE.map((v) => [v.id, v.precoM2])
  );
  const PRECO_TORRE: Record<string, number> = {
    "20": 320,
    "30": 420,
    "40": 560,
  };
  return {
    precoVidro: (vidroId) => {
      const v = precoVidroById.get(Number(vidroId));
      if (v === undefined) throw new Error(`vidro desconhecido: id=${vidroId}`);
      return v;
    },
    precoTorre: (modelo) => {
      const v = PRECO_TORRE[String(modelo)];
      if (v === undefined) throw new Error(`modelo de torre desconhecido: ${modelo}`);
      return v;
    },
  };
}
