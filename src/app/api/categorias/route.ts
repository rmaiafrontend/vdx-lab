import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  const categorias = await prisma.categoria.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
  });
  return NextResponse.json(categorias);
}
