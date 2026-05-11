import type {
  ComputedValueInput,
  PieceGroupInput,
  PieceRoleInput,
  PricingRuleInput,
  SpecificationTemplateInput,
  TipologiaPayload,
  VariableInput,
} from "@/lib/schemas";
import type {
  ModoDeProducao,
  TipologiaSnapshot,
  VidroSnapshot,
} from "@/lib/engine";

let idCounter = 0;
function newId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${++idCounter}_${Date.now()}`;
}

export type FormVariable = VariableInput & { _id: string };
export type FormComputedValue = ComputedValueInput & { _id: string };
export type FormPieceRole = PieceRoleInput & { _id: string };
export type FormPieceGroup = Omit<PieceGroupInput, "piece_roles"> & {
  _id: string;
  piece_roles: FormPieceRole[];
};
export type FormPricingRule = PricingRuleInput & { _id: string };
export type FormSpecificationTemplate = SpecificationTemplateInput & {
  _id: string;
};

/**
 * FormState mantém ambas listas (`piece_groups` e `specification_templates`)
 * sempre presentes para simplificar o `setForm({...form, x})`. O campo
 * `modoDeProducao` discrimina qual delas é levada ao payload final em
 * `formToPayload()`. As listas inativas ficam vazias e a UI ramifica por modo.
 */
export type FormState = {
  nome: string;
  descricao: string | null;
  categoria_id: number;
  modoDeProducao: ModoDeProducao;
  imagem_url: string | null;
  desenho_esquematico_url: string | null;
  render_key: string | null;
  ordem: number;
  ativo: boolean;
  variables: FormVariable[];
  computed_values: FormComputedValue[];
  piece_groups: FormPieceGroup[];
  specification_templates: FormSpecificationTemplate[];
  pricing_rules: FormPricingRule[];
  /** Vidros elegíveis para a tipologia — snapshot completo para o simulador. */
  vidros_elegiveis: VidroSnapshot[];
};

export function emptyForm(
  categoriaId = 1,
  modoDeProducao: ModoDeProducao = "VAO"
): FormState {
  return {
    nome: "",
    descricao: null,
    categoria_id: categoriaId,
    modoDeProducao,
    imagem_url: null,
    desenho_esquematico_url: null,
    render_key: null,
    ordem: 0,
    ativo: true,
    variables: [],
    computed_values: [],
    piece_groups: [],
    specification_templates: [],
    pricing_rules: [],
    vidros_elegiveis: [],
  };
}

export function snapshotToForm(
  snap: TipologiaSnapshot,
  categoriaId: number,
  ordem = 0,
  ativo = true,
  descricao: string | null = null
): FormState {
  const variables: FormVariable[] = snap.variables.map((v) => ({
    _id: newId(),
    codigo: v.codigo,
    label: v.label,
    kind: v.kind,
    nivel: v.nivel,
    unit: v.unit,
    required: v.required,
    default_value: v.defaultValue,
    min_value: v.minValue,
    max_value: v.maxValue,
    options: v.options,
    ordem: v.ordem,
  }));
  const computed_values: FormComputedValue[] = snap.computedValues.map((c) => ({
    _id: newId(),
    codigo: c.codigo,
    expression: c.expression,
    scope: c.scope,
    piece_group_codigo: c.pieceGroupCodigo,
    order_in_scope: c.orderInScope,
  }));
  const pricing_rules: FormPricingRule[] = snap.pricingRules.map((p) => ({
    _id: newId(),
    codigo: p.codigo,
    label: p.label,
    component_kind: p.componentKind,
    basis: p.basis,
    applies_to: p.appliesTo,
    applies_to_value: p.appliesToValue,
    expression: p.expression,
    condition: p.condition,
    ordem: p.ordem,
    ativo: p.ativo,
  }));

  if (snap.modo === "VAO") {
    return {
      nome: snap.nome,
      descricao,
      categoria_id: categoriaId,
      modoDeProducao: "VAO",
      imagem_url: null,
      desenho_esquematico_url: null,
      render_key: snap.renderKey,
      ordem,
      ativo,
      variables,
      computed_values,
      vidros_elegiveis: snap.vidrosElegiveis,
      piece_groups: snap.pieceGroups.map((g) => ({
        _id: newId(),
        codigo: g.codigo,
        label: g.label,
        quantity_expression: g.quantityExpression,
        ordem: g.ordem,
        piece_roles: g.pieceRoles.map((r) => ({
          _id: newId(),
          codigo: r.codigo,
          label: r.label,
          selector_kind: r.selectorKind,
          selector_value: r.selectorValue,
          condition: r.condition,
          width_expression: r.widthExpression,
          height_expression: r.heightExpression,
          ordem: r.ordem,
        })),
      })),
      specification_templates: [],
      pricing_rules,
    };
  }

  return {
    nome: snap.nome,
    descricao,
    categoria_id: categoriaId,
    modoDeProducao: "MEDIDA_DE_PRODUCAO",
    imagem_url: null,
    desenho_esquematico_url: null,
    render_key: snap.renderKey,
    ordem,
    ativo,
    variables,
    computed_values,
    vidros_elegiveis: snap.vidrosElegiveis,
    piece_groups: [],
    specification_templates: snap.specificationTemplates.map((s) => ({
      _id: newId(),
      codigo: s.codigo,
      label: s.label,
      schema_atributos: s.schemaAtributos,
      required_min: s.requiredMin,
      required_max: s.requiredMax,
      ordem: s.ordem,
    })),
    pricing_rules,
  };
}

export function formToPayload(form: FormState): TipologiaPayload {
  const strip = <T extends { _id: string }>(o: T): Omit<T, "_id"> => {
    const { _id: _, ...rest } = o;
    return rest;
  };
  const common = {
    nome: form.nome,
    descricao: form.descricao,
    categoria_id: form.categoria_id,
    imagem_url: form.imagem_url,
    desenho_esquematico_url: form.desenho_esquematico_url,
    render_key: form.render_key,
    ordem: form.ordem,
    ativo: form.ativo,
    vidros_elegiveis: form.vidros_elegiveis.map((v) => v.id),
    variables: form.variables.map(strip),
    computed_values: form.computed_values.map(strip),
    pricing_rules: form.pricing_rules.map(strip),
  };

  if (form.modoDeProducao === "VAO") {
    return {
      ...common,
      modoDeProducao: "VAO",
      piece_groups: form.piece_groups.map((g) => ({
        ...strip(g),
        piece_roles: g.piece_roles.map(strip),
      })),
    };
  }
  return {
    ...common,
    modoDeProducao: "MEDIDA_DE_PRODUCAO",
    specification_templates: form.specification_templates.map(strip),
  };
}

export function blankVariable(modo: ModoDeProducao = "VAO"): FormVariable {
  return {
    _id: newId(),
    codigo: "",
    label: "",
    kind: "DIMENSION",
    nivel: modo === "VAO" ? "VAO" : "PECA",
    unit: "mm",
    required: true,
    default_value: null,
    min_value: null,
    max_value: null,
    options: null,
    ordem: 0,
  };
}

export function blankComputedValue(
  modo: ModoDeProducao = "VAO"
): FormComputedValue {
  return {
    _id: newId(),
    codigo: "",
    expression: "",
    scope: modo === "VAO" ? "VAO" : "ORCAMENTO_PECA",
    piece_group_codigo: null,
    order_in_scope: 0,
  };
}

export function blankPieceGroup(): FormPieceGroup {
  return {
    _id: newId(),
    codigo: "",
    label: "",
    quantity_expression: "1",
    ordem: 0,
    piece_roles: [blankPieceRole()],
  };
}

export function blankPieceRole(): FormPieceRole {
  return {
    _id: newId(),
    codigo: "",
    label: "",
    selector_kind: "ALL",
    selector_value: null,
    condition: null,
    width_expression: "",
    height_expression: "",
    ordem: 0,
  };
}

export function blankSpecificationTemplate(): FormSpecificationTemplate {
  return {
    _id: newId(),
    codigo: "",
    label: "",
    schema_atributos: {},
    required_min: 0,
    required_max: null,
    ordem: 0,
  };
}

export function blankPricingRule(modo: ModoDeProducao = "VAO"): FormPricingRule {
  return {
    _id: newId(),
    codigo: "",
    label: null,
    component_kind: "VIDRO",
    basis: "PER_M2",
    applies_to: "TIPOLOGIA",
    applies_to_value: null,
    expression: "",
    condition: null,
    ordem: 0,
    ativo: true,
  };
}

// Helpers genéricos para listas com _id
export function moveItem<T extends { _id: string }>(
  list: T[],
  id: string,
  direction: "up" | "down"
): T[] {
  const idx = list.findIndex((i) => i._id === id);
  if (idx === -1) return list;
  const newIdx = direction === "up" ? idx - 1 : idx + 1;
  if (newIdx < 0 || newIdx >= list.length) return list;
  const next = [...list];
  [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
  return next.map((item, i) => ({ ...item, ordem: i + 1 }));
}

export function removeItem<T extends { _id: string }>(
  list: T[],
  id: string
): T[] {
  return list.filter((i) => i._id !== id);
}

export function patchItem<T extends { _id: string }>(
  list: T[],
  id: string,
  patch: Partial<T>
): T[] {
  return list.map((i) => (i._id === id ? { ...i, ...patch } : i));
}
