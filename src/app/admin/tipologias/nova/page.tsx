import { prisma } from "@/lib/db";
import { TipologiaTabs } from "@/components/admin/tipologia-tabs";

export const dynamic = "force-dynamic";

export default async function NovaTipologiaPage() {
  const categorias = await prisma.categoria.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
    select: { id: true, nome: true },
  });

  return <TipologiaTabs categorias={categorias} />;
}
