import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  CalcRequestIdentitySchema,
  CalcRequestMedidaSchema,
  CalcRequestVaoSchema,
} from "@/lib/schemas";
import { runPipeline } from "@/lib/engine";
import type { CalcInput } from "@/lib/engine";
import { TIPOLOGIA_INCLUDE, tipologiaPrismaToSnapshot } from "@/lib/snapshot";
import { engineErrorTo422, errorResponse, zodToErrors } from "@/lib/api";
import { loadLookups } from "@/lib/lookups";

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

  // 1. Identificar tipologia (schema mínimo só para extrair tipologia_id)
  const identity = CalcRequestIdentitySchema.safeParse(body);
  if (!identity.success) return errorResponse(zodToErrors(identity.error), 400);

  const tipologia = await prisma.tipologia.findFirst({
    where: { id: identity.data.tipologia_id, ativo: true },
    include: TIPOLOGIA_INCLUDE,
  });
  if (!tipologia) {
    return NextResponse.json(
      { error: "tipologia não encontrada ou inativa" },
      { status: 404 }
    );
  }

  // 2. Escolher schema de request pelo modo da tipologia (servidor decide)
  const snap = tipologiaPrismaToSnapshot(tipologia);
  const lookups = await loadLookups();

  let calcInput: CalcInput;
  let variaveisEntrada: unknown;

  if (snap.modo === "VAO") {
    const parsed = CalcRequestVaoSchema.safeParse(body);
    if (!parsed.success) return errorResponse(zodToErrors(parsed.error), 400);
    variaveisEntrada = parsed.data.variables;
    calcInput = {
      tipologia: snap,
      variables: parsed.data.variables,
      unit: parsed.data.unit,
      vidro: parsed.data.vidro
        ? {
            vidroId: parsed.data.vidro.vidro_id,
            precoM2: parsed.data.vidro.preco_m2,
          }
        : undefined,
      lookups,
    };
  } else {
    const parsed = CalcRequestMedidaSchema.safeParse(body);
    if (!parsed.success) return errorResponse(zodToErrors(parsed.error), 400);
    variaveisEntrada = {
      orcamento: parsed.data.variaveis_orcamento,
      pecas: parsed.data.pecas,
    };
    calcInput = {
      tipologia: snap,
      variaveisOrcamento: parsed.data.variaveis_orcamento,
      pecas: parsed.data.pecas.map((p) => ({
        identificacao: p.identificacao,
        variables: p.variables,
        especificacoes: p.especificacoes,
      })),
      unit: parsed.data.unit,
      vidro: parsed.data.vidro
        ? {
            vidroId: parsed.data.vidro.vidro_id,
            precoM2: parsed.data.vidro.preco_m2,
          }
        : undefined,
      lookups,
    };
  }

  try {
    const result = runPipeline(calcInput);

    const isAdmin = req.headers.get("x-admin") === "1";
    if (isAdmin) {
      return NextResponse.json({
        tipologia_id: tipologia.id,
        tipologia_nome: tipologia.nome,
        modo_de_producao: snap.modo,
        variaveis_entrada: variaveisEntrada,
        variaveis_calculadas: result.variaveisCalculadas,
        pecas: result.pecas,
        totais: result.totais,
        preco: result.preco,
      });
    }

    // Modo público: sem breakdown, sem variáveis_calculadas, sem expressões
    return NextResponse.json({
      tipologia_id: tipologia.id,
      tipologia_nome: tipologia.nome,
      modo_de_producao: snap.modo,
      pecas: result.pecas.map((p) => ({
        groupCode: p.groupCode,
        roleCode: p.roleCode,
        index: p.index,
        identificacao: p.identificacao,
        wReal: p.wReal,
        hReal: p.hReal,
        wCobranca: p.wCobranca,
        hCobranca: p.hCobranca,
        areaCobrancaM2: p.areaCobrancaM2,
        especificacoes: p.especificacoes,
      })),
      totais: {
        areaCobrancaM2: result.totais.areaCobrancaM2,
        quantidadePecas: result.totais.quantidadePecas,
      },
      preco: { total: result.preco.total },
    });
  } catch (err) {
    const engineErr = engineErrorTo422(err);
    if (engineErr) return engineErr;
    throw err;
  }
}
