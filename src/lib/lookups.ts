import { prisma } from "@/lib/db";
import type { Lookups } from "@/lib/engine";

/**
 * Carrega tabelas auxiliares (Vidro, ModeloTorre) e devolve os builtins
 * `precoVidro`/`precoTorre` injetáveis no motor.
 *
 * Por padrão lê tudo via Prisma uma vez por request — para o lab, custo
 * irrelevante e simplifica testes. Em prod, considerar cache curto.
 */
export async function loadLookups(): Promise<Lookups> {
  const [vidros, modelosTorre] = await Promise.all([
    prisma.vidro.findMany({ where: { ativo: true } }),
    prisma.modeloTorre.findMany({ where: { ativo: true } }),
  ]);

  const precoVidroById = new Map<number, number>();
  for (const v of vidros) precoVidroById.set(v.id, v.precoM2);

  const precoTorreMap = new Map<string, number>();
  for (const m of modelosTorre) precoTorreMap.set(m.codigo, m.preco);

  return {
    precoVidro: (vidroId) => {
      const v = precoVidroById.get(Number(vidroId));
      if (v === undefined) {
        throw new Error(`vidro desconhecido: id=${vidroId}`);
      }
      return v;
    },
    precoTorre: (modelo) => {
      const v = precoTorreMap.get(String(modelo));
      if (v === undefined) {
        throw new Error(`modelo de torre desconhecido: ${modelo}`);
      }
      return v;
    },
  };
}
