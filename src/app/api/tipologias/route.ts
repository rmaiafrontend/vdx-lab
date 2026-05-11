import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TipologiaPayloadSchema } from "@/lib/schemas";
import { validateTipologia } from "@/lib/engine";
import { payloadToSnapshot } from "@/lib/snapshot";
import { errorResponse, prismaErrorTo400, zodToErrors } from "@/lib/api";
import { persistChildren } from "@/lib/tipologia-write";

export async function GET() {
  const tipologias = await prisma.tipologia.findMany({
    include: {
      categoria: { select: { id: true, nome: true } },
      _count: {
        select: {
          variables: true,
          pieceGroups: true,
          specificationTemplates: true,
          pricingRules: true,
        },
      },
      pieceGroups: {
        select: { _count: { select: { pieceRoles: true } } },
      },
    },
    orderBy: [{ ordem: "asc" }, { id: "asc" }],
  });

  const enriched = tipologias.map((t) => ({
    id: t.id,
    nome: t.nome,
    descricao: t.descricao,
    modoDeProducao: t.modoDeProducao,
    categoria: t.categoria,
    ordem: t.ordem,
    ativo: t.ativo,
    counts: {
      variables: t._count.variables,
      pieceGroups: t._count.pieceGroups,
      specificationTemplates: t._count.specificationTemplates,
      pricingRules: t._count.pricingRules,
      pieceRoles: t.pieceGroups.reduce(
        (s, g) => s + g._count.pieceRoles,
        0
      ),
    },
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  }));

  return NextResponse.json(enriched);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse(
      [{ code: "PAYLOAD_INVALID", field: "(root)", message: "JSON inválido" }],
      400
    );
  }

  const parsed = TipologiaPayloadSchema.safeParse(body);
  if (!parsed.success) return errorResponse(zodToErrors(parsed.error), 400);

  const issues = validateTipologia(payloadToSnapshot(parsed.data));
  if (issues.length > 0) return errorResponse(issues, 422);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const tipologia = await tx.tipologia.create({
        data: {
          nome: parsed.data.nome,
          descricao: parsed.data.descricao ?? null,
          categoriaId: parsed.data.categoria_id,
          modoDeProducao: parsed.data.modoDeProducao,
          imagemUrl: parsed.data.imagem_url ?? null,
          desenhoEsquematicoUrl: parsed.data.desenho_esquematico_url ?? null,
          renderKey: parsed.data.render_key ?? null,
          ordem: parsed.data.ordem,
          ativo: parsed.data.ativo,
        },
      });
      await persistChildren(tx, tipologia.id, parsed.data);
      return tipologia;
    });
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (err) {
    const prismaErr = prismaErrorTo400(err);
    if (prismaErr) return prismaErr;
    console.error("POST /api/tipologias failed:", err);
    return errorResponse(
      [
        {
          code: "FORMULA_RUNTIME_ERROR",
          field: "(root)",
          message: err instanceof Error ? err.message : String(err),
        },
      ],
      500
    );
  }
}
