import { z } from "zod";

export const ModoDeProducaoSchema = z.enum(["VAO", "MEDIDA_DE_PRODUCAO"]);

export const VariableKindSchema = z.enum([
  "DIMENSION",
  "COUNT",
  "TECHNICAL_PARAM",
  "BOOLEAN",
  "OPTION_LIST",
]);

export const VariableNivelSchema = z.enum(["ORCAMENTO", "VAO", "PECA"]);

export const ComputeScopeSchema = z.enum([
  "VAO",
  "GROUP",
  "PIECE",
  "ORCAMENTO_PECA",
]);

export const SelectorKindSchema = z.enum([
  "ALL",
  "FIRST",
  "LAST",
  "FIRST_AND_LAST",
  "EXCEPT_FIRST_LAST",
  "INDEX",
  "INDEX_LIST",
  "RANGE",
  "ODD",
  "EVEN",
  "EXPRESSION",
]);

export const PricingBasisSchema = z.enum([
  "PER_M2",
  "PER_PIECE",
  "PER_GROUP",
  "PER_VAO",
  "PER_ORCAMENTO",
  "PER_SPECIFICATION",
  "FIXED",
]);

export const PricingAppliesToSchema = z.enum([
  "TIPOLOGIA",
  "GROUP_CODE",
  "ROLE_CODE",
  "SPECIFICATION_TYPE",
]);

export const PricingComponentKindSchema = z.enum([
  "VIDRO",
  "FERRAGEM",
  "INSTALACAO",
  "MAO_OBRA",
  "BENEFICIAMENTO",
  "OUTRO",
]);

export const SpecificationAttributeTypeSchema = z.enum([
  "integer",
  "number",
  "string",
  "boolean",
  "option",
]);

export const UnitSchema = z.enum(["mm", "cm", "m"]);

export const VariableOptionSchema = z.object({
  codigo: z.string().min(1),
  label: z.string().min(1),
});

export const VariableInputSchema = z.object({
  codigo: z.string().min(1),
  label: z.string().min(1),
  descricao: z.string().nullable().optional(),
  kind: VariableKindSchema,
  nivel: VariableNivelSchema,
  unit: z.string().nullable().optional(),
  required: z.boolean().optional().default(true),
  default_value: z.string().nullable().optional(),
  min_value: z.string().nullable().optional(),
  max_value: z.string().nullable().optional(),
  options: z.array(VariableOptionSchema).nullable().optional(),
  ordem: z.number().int().optional().default(0),
});

export const ComputedValueInputSchema = z
  .object({
    codigo: z.string().min(1),
    expression: z.string().min(1),
    scope: ComputeScopeSchema,
    piece_group_codigo: z.string().nullable().optional(),
    order_in_scope: z.number().int().optional().default(0),
  })
  .superRefine((cv, ctx) => {
    const requiresGroup = cv.scope === "GROUP" || cv.scope === "PIECE";
    if (requiresGroup && !cv.piece_group_codigo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "scope GROUP/PIECE exige piece_group_codigo",
        path: ["piece_group_codigo"],
      });
    }
    if (
      (cv.scope === "VAO" || cv.scope === "ORCAMENTO_PECA") &&
      cv.piece_group_codigo
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "scope VAO/ORCAMENTO_PECA não deve ter piece_group_codigo",
        path: ["piece_group_codigo"],
      });
    }
  });

export const PieceRoleInputSchema = z.object({
  codigo: z.string().min(1),
  label: z.string().min(1),
  selector_kind: SelectorKindSchema,
  selector_value: z.string().nullable().optional(),
  condition: z.string().nullable().optional(),
  width_expression: z.string().min(1),
  height_expression: z.string().min(1),
  ordem: z.number().int().optional().default(0),
});

export const PieceGroupInputSchema = z.object({
  codigo: z.string().min(1),
  label: z.string().min(1),
  quantity_expression: z.string().min(1),
  ordem: z.number().int().optional().default(0),
  piece_roles: z.array(PieceRoleInputSchema).min(1),
});

export const SpecificationAttributeDefSchema = z.object({
  type: SpecificationAttributeTypeSchema,
  required: z.boolean().optional(),
  default: z.unknown().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  options: z.array(z.string()).optional(),
  source: z.string().optional(),
});

export const SpecificationTemplateInputSchema = z.object({
  codigo: z.string().min(1),
  label: z.string().min(1),
  schema_atributos: z.record(z.string(), SpecificationAttributeDefSchema),
  required_min: z.number().int().nonnegative().optional().default(0),
  required_max: z.number().int().nullable().optional(),
  ordem: z.number().int().optional().default(0),
});

export const PricingRuleInputSchema = z.object({
  codigo: z.string().min(1),
  label: z.string().nullable().optional(),
  component_kind: PricingComponentKindSchema,
  basis: PricingBasisSchema,
  applies_to: PricingAppliesToSchema,
  applies_to_value: z.string().nullable().optional(),
  expression: z.string().min(1),
  condition: z.string().nullable().optional(),
  ordem: z.number().int().optional().default(0),
  ativo: z.boolean().optional().default(true),
});

const TipologiaCommonSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().nullable().optional(),
  categoria_id: z.number().int().positive(),
  imagem_url: z.string().nullable().optional(),
  desenho_esquematico_url: z.string().nullable().optional(),
  render_key: z.string().nullable().optional(),
  ordem: z.number().int().optional().default(0),
  ativo: z.boolean().optional().default(true),
  /** IDs de Vidro elegíveis para a tipologia (ordem importa para a UI). */
  vidros_elegiveis: z
    .array(z.number().int().positive())
    .optional()
    .default([]),
  variables: z.array(VariableInputSchema),
  computed_values: z.array(ComputedValueInputSchema),
  pricing_rules: z.array(PricingRuleInputSchema),
});

export const TipologiaVaoPayloadSchema = TipologiaCommonSchema.extend({
  modoDeProducao: z.literal("VAO"),
  piece_groups: z.array(PieceGroupInputSchema).min(1),
});

export const TipologiaMedidaPayloadSchema = TipologiaCommonSchema.extend({
  modoDeProducao: z.literal("MEDIDA_DE_PRODUCAO"),
  specification_templates: z.array(SpecificationTemplateInputSchema),
});

export const TipologiaPayloadSchema = z.discriminatedUnion("modoDeProducao", [
  TipologiaVaoPayloadSchema,
  TipologiaMedidaPayloadSchema,
]);

export type TipologiaPayload = z.infer<typeof TipologiaPayloadSchema>;
export type TipologiaVaoPayload = z.infer<typeof TipologiaVaoPayloadSchema>;
export type TipologiaMedidaPayload = z.infer<typeof TipologiaMedidaPayloadSchema>;
export type VariableInput = z.infer<typeof VariableInputSchema>;
export type ComputedValueInput = z.infer<typeof ComputedValueInputSchema>;
export type PieceRoleInput = z.infer<typeof PieceRoleInputSchema>;
export type PieceGroupInput = z.infer<typeof PieceGroupInputSchema>;
export type SpecificationTemplateInput = z.infer<
  typeof SpecificationTemplateInputSchema
>;
export type PricingRuleInput = z.infer<typeof PricingRuleInputSchema>;

// ----------------------- Calc requests -----------------------

const VariableValueSchema = z.union([z.number(), z.boolean(), z.string()]);

export const PieceSpecificationInputSchema = z.object({
  tipo: z.string().min(1),
  atributos: z.record(z.string(), z.unknown()),
});

export const PecaInputMedidaSchema = z.object({
  identificacao: z.string().optional(),
  variables: z.record(z.string(), VariableValueSchema),
  especificacoes: z.array(PieceSpecificationInputSchema),
});

const VidroSchema = z
  .object({
    vidro_id: z.number().int().positive().optional(),
    /** Override do preço/m² do vidro selecionado (não altera o catálogo). */
    preco_m2: z.number().optional(),
  })
  .optional();

export const CalcRequestVaoSchema = z.object({
  tipologia_id: z.number().int().positive(),
  variables: z.record(z.string(), VariableValueSchema),
  unit: UnitSchema.optional().default("mm"),
  vidro: VidroSchema,
});

export const CalcRequestMedidaSchema = z.object({
  tipologia_id: z.number().int().positive(),
  variaveis_orcamento: z.record(z.string(), VariableValueSchema),
  pecas: z.array(PecaInputMedidaSchema),
  unit: UnitSchema.optional().default("mm"),
  vidro: VidroSchema,
});

export type CalcRequestVao = z.infer<typeof CalcRequestVaoSchema>;
export type CalcRequestMedida = z.infer<typeof CalcRequestMedidaSchema>;

// schema legado para identificar tipologia_id antes de discriminar por modo
export const CalcRequestIdentitySchema = z.object({
  tipologia_id: z.number().int().positive(),
});
