import type { Prisma, PrismaClient } from "@prisma/client";
import type { TipologiaPayload } from "@/lib/schemas";

type Tx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Persiste os filhos de uma tipologia (variables, piece_groups + roles,
 * specification_templates, computed_values, pricing_rules). NÃO cria/atualiza
 * a Tipologia em si.
 *
 * Para POST: chame após criar a Tipologia.
 * Para PUT: chame após `deleteAllChildren()` + `update()`.
 */
export async function persistChildren(
  tx: Tx,
  tipologiaId: number,
  payload: TipologiaPayload
): Promise<void> {
  if (payload.variables.length > 0) {
    await tx.variable.createMany({
      data: payload.variables.map((v) => ({
        tipologiaId,
        codigo: v.codigo,
        label: v.label,
        descricao: v.descricao ?? null,
        kind: v.kind,
        nivel: v.nivel,
        unit: v.unit ?? null,
        required: v.required,
        defaultValue: v.default_value ?? null,
        minValue: v.min_value ?? null,
        maxValue: v.max_value ?? null,
        options: v.options ? JSON.stringify(v.options) : null,
        ordem: v.ordem,
      })),
    });
  }

  if (payload.vidros_elegiveis.length > 0) {
    await tx.tipologiaVidro.createMany({
      data: payload.vidros_elegiveis.map((vidroId, i) => ({
        tipologiaId,
        vidroId,
        ordem: i + 1,
      })),
    });
  }

  const groupIdByCodigo = new Map<string, number>();

  if (payload.modoDeProducao === "VAO") {
    for (const g of payload.piece_groups) {
      const created = await tx.pieceGroup.create({
        data: {
          tipologiaId,
          codigo: g.codigo,
          label: g.label,
          quantityExpression: g.quantity_expression,
          ordem: g.ordem,
        },
      });
      groupIdByCodigo.set(g.codigo, created.id);

      if (g.piece_roles.length > 0) {
        await tx.pieceRole.createMany({
          data: g.piece_roles.map((r) => ({
            pieceGroupId: created.id,
            codigo: r.codigo,
            label: r.label,
            selectorKind: r.selector_kind,
            selectorValue: r.selector_value ?? null,
            condition: r.condition ?? null,
            widthExpression: r.width_expression,
            heightExpression: r.height_expression,
            ordem: r.ordem,
          })),
        });
      }
    }
  } else {
    if (payload.specification_templates.length > 0) {
      await tx.specificationTemplate.createMany({
        data: payload.specification_templates.map((s) => ({
          tipologiaId,
          codigo: s.codigo,
          label: s.label,
          schemaAtributos: JSON.stringify(s.schema_atributos),
          requiredMin: s.required_min,
          requiredMax: s.required_max ?? null,
          ordem: s.ordem,
        })),
      });
    }
  }

  if (payload.computed_values.length > 0) {
    const data: Prisma.ComputedValueCreateManyInput[] = [];
    for (const c of payload.computed_values) {
      const pieceGroupId =
        c.scope === "GROUP" || c.scope === "PIECE"
          ? c.piece_group_codigo
            ? groupIdByCodigo.get(c.piece_group_codigo) ?? null
            : null
          : null;
      data.push({
        tipologiaId,
        codigo: c.codigo,
        expression: c.expression,
        scope: c.scope,
        pieceGroupId,
        orderInScope: c.order_in_scope,
      });
    }
    await tx.computedValue.createMany({ data });
  }

  if (payload.pricing_rules.length > 0) {
    await tx.pricingRule.createMany({
      data: payload.pricing_rules.map((p) => ({
        tipologiaId,
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
      })),
    });
  }
}

export async function deleteAllChildren(
  tx: Tx,
  tipologiaId: number
): Promise<void> {
  await tx.computedValue.deleteMany({ where: { tipologiaId } });
  await tx.variable.deleteMany({ where: { tipologiaId } });
  await tx.pricingRule.deleteMany({ where: { tipologiaId } });
  await tx.specificationTemplate.deleteMany({ where: { tipologiaId } });
  await tx.tipologiaVidro.deleteMany({ where: { tipologiaId } });
  // pieceGroup cascade -> pieceRole
  await tx.pieceGroup.deleteMany({ where: { tipologiaId } });
}
