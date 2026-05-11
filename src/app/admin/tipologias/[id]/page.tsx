import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { TipologiaTabs } from "@/components/admin/tipologia-tabs";
import {
  TIPOLOGIA_INCLUDE,
  tipologiaPrismaToSnapshot,
} from "@/lib/snapshot";

export const dynamic = "force-dynamic";

export default async function EditarTipologiaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [tipologia, categorias] = await Promise.all([
    prisma.tipologia.findUnique({ where: { id }, include: TIPOLOGIA_INCLUDE }),
    prisma.categoria.findMany({
      where: { ativo: true },
      orderBy: { ordem: "asc" },
      select: { id: true, nome: true },
    }),
  ]);

  if (!tipologia) notFound();

  return (
    <TipologiaTabs
      tipologiaId={tipologia.id}
      initial={{
        snapshot: tipologiaPrismaToSnapshot(tipologia),
        categoriaId: tipologia.categoriaId,
        ordem: tipologia.ordem,
        ativo: tipologia.ativo,
        descricao: tipologia.descricao,
      }}
      categorias={categorias}
    />
  );
}
