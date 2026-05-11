import { PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const prisma = new PrismaClient();

type CategoriaSeed = {
  id: number;
  nome: string;
  ordem: number;
  ativo: boolean;
};

type CorVidroSeed = {
  codigo: string;
  label: string;
  ordem: number;
  ativo: boolean;
};

type VidroSeed = {
  codigo: string;
  label: string;
  cor_codigo: string;
  espessura: number;
  preco_m2: number;
  ordem: number;
  ativo: boolean;
};

type ModeloTorreSeed = {
  codigo: string;
  label: string;
  preco: number;
  max_furos_por_torre: number;
  ordem: number;
  ativo: boolean;
};

type VariableOptionSeed = { codigo: string; label: string };

type VariableSeed = {
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
  options?: VariableOptionSeed[] | null;
  ordem?: number;
};

type ComputedValueSeed = {
  codigo: string;
  expression: string;
  scope: "VAO" | "GROUP" | "PIECE" | "ORCAMENTO_PECA";
  piece_group_codigo?: string | null;
  order_in_scope?: number;
};

type PieceRoleSeed = {
  codigo: string;
  label: string;
  selector_kind: string;
  selector_value?: string | null;
  condition?: string | null;
  width_expression: string;
  height_expression: string;
  ordem?: number;
};

type PieceGroupSeed = {
  codigo: string;
  label: string;
  quantity_expression: string;
  ordem?: number;
  piece_roles: PieceRoleSeed[];
};

type SpecificationTemplateSeed = {
  codigo: string;
  label: string;
  schema_atributos: Record<string, unknown>;
  required_min?: number;
  required_max?: number | null;
  ordem?: number;
};

type PricingRuleSeed = {
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
};

type TipologiaSeed = {
  nome: string;
  descricao?: string | null;
  categoria_id: number;
  modoDeProducao: "VAO" | "MEDIDA_DE_PRODUCAO";
  imagem_url?: string | null;
  desenho_esquematico_url?: string | null;
  ordem?: number;
  ativo?: boolean;
  vidros_elegiveis?: string[];
  variables: VariableSeed[];
  computed_values: ComputedValueSeed[];
  piece_groups?: PieceGroupSeed[];
  specification_templates?: SpecificationTemplateSeed[];
  pricing_rules: PricingRuleSeed[];
};

function readJson<T>(file: string): T {
  return JSON.parse(
    readFileSync(join(process.cwd(), "seed", file), "utf-8")
  ) as T;
}

async function seedCategorias() {
  const categorias = readJson<CategoriaSeed[]>("categorias.json");
  for (const c of categorias) {
    await prisma.categoria.upsert({
      where: { id: c.id },
      update: { nome: c.nome, ordem: c.ordem, ativo: c.ativo },
      create: c,
    });
  }
  console.log(`✓ ${categorias.length} categorias`);
}

async function seedCorVidro() {
  const cores = readJson<CorVidroSeed[]>("cor-vidro.json");
  for (const c of cores) {
    await prisma.corVidro.upsert({
      where: { codigo: c.codigo },
      update: { label: c.label, ordem: c.ordem, ativo: c.ativo },
      create: { codigo: c.codigo, label: c.label, ordem: c.ordem, ativo: c.ativo },
    });
  }
  console.log(`✓ ${cores.length} cores de vidro`);
}

async function seedVidros() {
  const vidros = readJson<VidroSeed[]>("vidro.json");
  const cores = await prisma.corVidro.findMany();
  const corIdByCodigo = new Map(cores.map((c) => [c.codigo, c.id]));

  for (const v of vidros) {
    const corId = corIdByCodigo.get(v.cor_codigo);
    if (!corId) {
      throw new Error(
        `Vidro ${v.codigo} referencia cor "${v.cor_codigo}" inexistente`
      );
    }
    await prisma.vidro.upsert({
      where: { codigo: v.codigo },
      update: {
        label: v.label,
        corId,
        espessura: v.espessura,
        precoM2: v.preco_m2,
        ordem: v.ordem,
        ativo: v.ativo,
      },
      create: {
        codigo: v.codigo,
        label: v.label,
        corId,
        espessura: v.espessura,
        precoM2: v.preco_m2,
        ordem: v.ordem,
        ativo: v.ativo,
      },
    });
  }
  console.log(`✓ ${vidros.length} vidros`);
}

async function seedModeloTorre() {
  const modelos = readJson<ModeloTorreSeed[]>("modelo-torre.json");
  for (const m of modelos) {
    await prisma.modeloTorre.upsert({
      where: { codigo: m.codigo },
      update: {
        label: m.label,
        preco: m.preco,
        maxFurosPorTorre: m.max_furos_por_torre,
        ordem: m.ordem,
        ativo: m.ativo,
      },
      create: {
        codigo: m.codigo,
        label: m.label,
        preco: m.preco,
        maxFurosPorTorre: m.max_furos_por_torre,
        ordem: m.ordem,
        ativo: m.ativo,
      },
    });
  }
  console.log(`✓ ${modelos.length} modelos de torre`);
}

async function seedTipologia(file: string) {
  const t = readJson<TipologiaSeed>(file);

  await prisma.tipologia.deleteMany({ where: { nome: t.nome } });

  // Vidros elegíveis precisam ser resolvidos antes da transação para validar
  // que existem no catálogo (erros aqui devem cancelar o seed da tipologia).
  const vidrosElegiveisIds: number[] = [];
  if (t.vidros_elegiveis && t.vidros_elegiveis.length > 0) {
    const vidros = await prisma.vidro.findMany({
      where: { codigo: { in: t.vidros_elegiveis } },
      select: { id: true, codigo: true },
    });
    const idByCodigo = new Map(vidros.map((v) => [v.codigo, v.id]));
    for (const codigo of t.vidros_elegiveis) {
      const id = idByCodigo.get(codigo);
      if (!id) {
        throw new Error(
          `Tipologia "${t.nome}" referencia vidro "${codigo}" inexistente`
        );
      }
      vidrosElegiveisIds.push(id);
    }
  }

  await prisma.$transaction(async (tx) => {
    const tipologia = await tx.tipologia.create({
      data: {
        nome: t.nome,
        descricao: t.descricao ?? null,
        categoriaId: t.categoria_id,
        modoDeProducao: t.modoDeProducao,
        imagemUrl: t.imagem_url ?? null,
        desenhoEsquematicoUrl: t.desenho_esquematico_url ?? null,
        ordem: t.ordem ?? 0,
        ativo: t.ativo ?? true,
      },
    });

    if (vidrosElegiveisIds.length > 0) {
      await tx.tipologiaVidro.createMany({
        data: vidrosElegiveisIds.map((vidroId, i) => ({
          tipologiaId: tipologia.id,
          vidroId,
          ordem: i + 1,
        })),
      });
    }

    if (t.variables.length > 0) {
      await tx.variable.createMany({
        data: t.variables.map((v) => ({
          tipologiaId: tipologia.id,
          codigo: v.codigo,
          label: v.label,
          descricao: v.descricao ?? null,
          kind: v.kind,
          nivel: v.nivel,
          unit: v.unit ?? null,
          required: v.required ?? true,
          defaultValue: v.default_value ?? null,
          minValue: v.min_value ?? null,
          maxValue: v.max_value ?? null,
          options: v.options ? JSON.stringify(v.options) : null,
          ordem: v.ordem ?? 0,
        })),
      });
    }

    const groupIdByCodigo = new Map<string, number>();
    if (t.modoDeProducao === "VAO" && t.piece_groups) {
      for (const g of t.piece_groups) {
        const created = await tx.pieceGroup.create({
          data: {
            tipologiaId: tipologia.id,
            codigo: g.codigo,
            label: g.label,
            quantityExpression: g.quantity_expression,
            ordem: g.ordem ?? 0,
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
              ordem: r.ordem ?? 0,
            })),
          });
        }
      }
    }

    if (
      t.modoDeProducao === "MEDIDA_DE_PRODUCAO" &&
      t.specification_templates &&
      t.specification_templates.length > 0
    ) {
      await tx.specificationTemplate.createMany({
        data: t.specification_templates.map((s) => ({
          tipologiaId: tipologia.id,
          codigo: s.codigo,
          label: s.label,
          schemaAtributos: JSON.stringify(s.schema_atributos),
          requiredMin: s.required_min ?? 0,
          requiredMax: s.required_max ?? null,
          ordem: s.ordem ?? 0,
        })),
      });
    }

    if (t.computed_values.length > 0) {
      await tx.computedValue.createMany({
        data: t.computed_values.map((c) => {
          const requiresGroup = c.scope === "GROUP" || c.scope === "PIECE";
          if (requiresGroup && !c.piece_group_codigo) {
            throw new Error(
              `ComputedValue ${c.codigo} em scope=${c.scope} precisa de piece_group_codigo`
            );
          }
          const pieceGroupId = requiresGroup
            ? groupIdByCodigo.get(c.piece_group_codigo!) ?? null
            : null;
          if (requiresGroup && pieceGroupId === null) {
            throw new Error(
              `ComputedValue ${c.codigo} referencia piece_group ${c.piece_group_codigo} inexistente`
            );
          }
          return {
            tipologiaId: tipologia.id,
            codigo: c.codigo,
            expression: c.expression,
            scope: c.scope,
            pieceGroupId,
            orderInScope: c.order_in_scope ?? 0,
          };
        }),
      });
    }

    if (t.pricing_rules.length > 0) {
      await tx.pricingRule.createMany({
        data: t.pricing_rules.map((p) => ({
          tipologiaId: tipologia.id,
          codigo: p.codigo,
          label: p.label ?? null,
          componentKind: p.component_kind,
          basis: p.basis,
          appliesTo: p.applies_to,
          appliesToValue: p.applies_to_value ?? null,
          expression: p.expression,
          condition: p.condition ?? null,
          ordem: p.ordem ?? 0,
          ativo: p.ativo ?? true,
        })),
      });
    }
  });

  console.log(
    `✓ tipologia "${t.nome}" (${t.modoDeProducao}, ${vidrosElegiveisIds.length} vidros elegíveis)`
  );
}

async function main() {
  await seedCategorias();
  await seedCorVidro();
  await seedVidros();
  await seedModeloTorre();
  await seedTipologia("003-varanda-dinamica.json");
  await seedTipologia("005-porta-com-fixo.json");
  await seedTipologia("006-guarda-corpo.json");
  await seedTipologia("007-porta-bandeira-4x2.json");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
