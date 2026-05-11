import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { TipologiaPayloadSchema } from "@/lib/schemas";
import { validateTipologia } from "@/lib/engine";
import {
  TIPOLOGIA_INCLUDE,
  payloadToSnapshot,
  tipologiaPrismaToSnapshot,
} from "@/lib/snapshot";
import { errorResponse, prismaErrorTo400, zodToErrors } from "@/lib/api";
import {
  deleteAllChildren,
  persistChildren,
} from "@/lib/tipologia-write";

type Params = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const n = Number(raw);
  return Number.isFinite(n) && Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const tipologia = await prisma.tipologia.findUnique({
    where: { id },
    include: TIPOLOGIA_INCLUDE,
  });
  if (!tipologia) {
    return NextResponse.json({ error: "tipologia não encontrada" }, { status: 404 });
  }

  return NextResponse.json({
    ...tipologia,
    snapshot: tipologiaPrismaToSnapshot(tipologia),
  });
}

export async function PUT(req: NextRequest, { params }: Params) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

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

  const exists = await prisma.tipologia.findUnique({
    where: { id },
    select: { id: true, modoDeProducao: true },
  });
  if (!exists) {
    return NextResponse.json({ error: "tipologia não encontrada" }, { status: 404 });
  }

  if (exists.modoDeProducao !== parsed.data.modoDeProducao) {
    return errorResponse(
      [
        {
          code: "MODE_INCOMPATIBILITY",
          field: "modoDeProducao",
          message: `modoDeProducao não pode ser alterado após criação (atual=${exists.modoDeProducao}, recebido=${parsed.data.modoDeProducao})`,
          context: {
            atual: exists.modoDeProducao,
            recebido: parsed.data.modoDeProducao,
          },
        },
      ],
      422
    );
  }

  const issues = validateTipologia(payloadToSnapshot(parsed.data, id));
  if (issues.length > 0) return errorResponse(issues, 422);

  try {
    await prisma.$transaction(async (tx) => {
      await deleteAllChildren(tx, id);
      await tx.tipologia.update({
        where: { id },
        data: {
          nome: parsed.data.nome,
          descricao: parsed.data.descricao ?? null,
          categoriaId: parsed.data.categoria_id,
          imagemUrl: parsed.data.imagem_url ?? null,
          desenhoEsquematicoUrl: parsed.data.desenho_esquematico_url ?? null,
          renderKey: parsed.data.render_key ?? null,
          ordem: parsed.data.ordem,
          ativo: parsed.data.ativo,
        },
      });
      await persistChildren(tx, id, parsed.data);
    });
    return NextResponse.json({ id }, { status: 200 });
  } catch (err) {
    const prismaErr = prismaErrorTo400(err);
    if (prismaErr) return prismaErr;
    console.error("PUT /api/tipologias/[id] failed:", err);
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

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id: rawId } = await params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  const exists = await prisma.tipologia.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ error: "tipologia não encontrada" }, { status: 404 });
  }

  await prisma.tipologia.delete({ where: { id } });
  return NextResponse.json({ id }, { status: 200 });
}
