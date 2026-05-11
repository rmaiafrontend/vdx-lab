import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  TIPOLOGIA_INCLUDE,
  tipologiaPrismaToSnapshot,
} from "@/lib/snapshot";
import { WizardClient } from "./wizard-client";

export const dynamic = "force-dynamic";

export default async function WizardSimuladorPage({
  params,
}: {
  params: Promise<{ tipologiaId: string }>;
}) {
  const { tipologiaId: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const tipologia = await prisma.tipologia.findUnique({
    where: { id },
    include: {
      ...TIPOLOGIA_INCLUDE,
      categoria: { select: { id: true, nome: true } },
    },
  });

  if (!tipologia || !tipologia.ativo) notFound();

  const snapshot = tipologiaPrismaToSnapshot(tipologia);
  const isDinamica = snapshot.variables.some((v) => v.kind === "COUNT");

  return (
    <WizardClient
      snapshot={snapshot}
      categoria={tipologia.categoria.nome}
      isDinamica={isDinamica}
    />
  );
}
