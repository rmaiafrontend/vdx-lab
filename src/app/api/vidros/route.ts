import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const vidros = await prisma.vidro.findMany({
    where: { ativo: true },
    include: { cor: true },
    orderBy: { ordem: "asc" },
  });
  return NextResponse.json(
    vidros.map((v) => ({
      id: v.id,
      codigo: v.codigo,
      label: v.label,
      corCodigo: v.cor.codigo,
      corLabel: v.cor.label,
      espessura: v.espessura,
      precoM2: v.precoM2,
      ordem: v.ordem,
    }))
  );
}
