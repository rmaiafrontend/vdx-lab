import { describe, expect, it } from "vitest";
import { runPipeline } from "@/lib/engine";
import { VIDRO_IDS, loadSeedMedida, makeLookups } from "./helpers";

const guardaCorpo = loadSeedMedida("006-guarda-corpo");
const lookups = makeLookups();
const vidroIncolor10 = { vidroId: VIDRO_IDS.INCOLOR_10 };

describe("pipeline MEDIDA_DE_PRODUCAO — guarda-corpo (006)", () => {
  it("processa uma peça com 2 torres × 1 furo", () => {
    const out = runPipeline({
      tipologia: guardaCorpo,
      variaveisOrcamento: {
        ModeloTorre: "30",
      },
      pecas: [
        {
          identificacao: "Calenze 1",
          variables: {
            Largura: 1200,
            Altura: 1050,
            QtdTorres: 2,
            FurosPorTorre: 1,
          },
          especificacoes: [{ tipo: "FURACAO", atributos: {} }],
        },
      ],
      unit: "mm",
      vidro: vidroIncolor10,
      lookups,
    });

    expect(out.pecas).toHaveLength(1);
    const p = out.pecas[0];
    expect(p.identificacao).toBe("Calenze 1");
    expect(p.wReal).toBe(1200);
    expect(p.hReal).toBe(1050);
    expect(p.especificacoes).toHaveLength(1);
    const furacao = p.especificacoes[0];
    expect(furacao.tipo).toBe("FURACAO");
    expect(furacao.atributos.qtdTorres).toBe(2);
    expect(furacao.atributos.furosPorTorre).toBe(1);
    // distEntreTorres = (1200 - 2*80) / (2 - 1) = 1040
    expect(furacao.atributos.distEntreTorres).toBe(1040);
  });

  it("12 peças idênticas → quantidades agregadas batem", () => {
    const pecas = Array.from({ length: 12 }, (_, i) => ({
      identificacao: `P${i + 1}`,
      variables: {
        Largura: 1200,
        Altura: 1050,
        QtdTorres: 2,
        FurosPorTorre: 1,
      },
      especificacoes: [{ tipo: "FURACAO", atributos: {} }],
    }));

    const out = runPipeline({
      tipologia: guardaCorpo,
      variaveisOrcamento: {
        ModeloTorre: "30",
      },
      pecas,
      unit: "mm",
      vidro: vidroIncolor10,
      lookups,
    });

    expect(out.pecas).toHaveLength(12);
    expect(out.totais.quantidadePecas).toBe(12);

    // FURACAO: 8 * qtdTorres * furosPorTorre por especificação = 16, total 16*12 = 192
    const furacao = out.preco.breakdown.find((b) => b.ruleCode === "FURO");
    expect(furacao?.valor).toBe(192);
    expect(furacao?.kind).toBe("BENEFICIAMENTO");

    // TORRE: 2 * 420 = 840 por peça, total = 840 * 12 = 10080
    const torre = out.preco.breakdown.find((b) => b.ruleCode === "TORRE");
    expect(torre?.valor).toBe(10080);

    // INSTALACAO: 200 + 50*12 = 800
    const instalacao = out.preco.breakdown.find(
      (b) => b.ruleCode === "INSTALACAO"
    );
    expect(instalacao?.valor).toBe(800);

    // VIDRO_M2: cada peça 1200×1050=1.26 m² (cobrança), 12 peças = 15.12 m²
    // × 360 (INCOLOR_10) = 5443.20
    const vidro = out.preco.breakdown.find((b) => b.ruleCode === "VIDRO_M2");
    expect(vidro?.valor).toBeCloseTo(5443.2, 1);
  });

  it("alterar QtdTorres por peça muda atributos da especificação", () => {
    const out = runPipeline({
      tipologia: guardaCorpo,
      variaveisOrcamento: {
        ModeloTorre: "30",
      },
      pecas: [
        {
          identificacao: "A",
          variables: { Largura: 1200, Altura: 1050, QtdTorres: 3, FurosPorTorre: 1 },
          especificacoes: [{ tipo: "FURACAO", atributos: {} }],
        },
        {
          identificacao: "B",
          variables: { Largura: 1200, Altura: 1050, QtdTorres: 2, FurosPorTorre: 2 },
          especificacoes: [{ tipo: "FURACAO", atributos: {} }],
        },
      ],
      unit: "mm",
      vidro: vidroIncolor10,
      lookups,
    });

    expect(out.pecas[0].especificacoes[0].atributos.qtdTorres).toBe(3);
    expect(out.pecas[1].especificacoes[0].atributos.furosPorTorre).toBe(2);
    // FURO: 8*3*1 + 8*2*2 = 24 + 32 = 56
    const furo = out.preco.breakdown.find((b) => b.ruleCode === "FURO");
    expect(furo?.valor).toBe(56);
  });

  it("override explícito de atributo da especificação", () => {
    const out = runPipeline({
      tipologia: guardaCorpo,
      variaveisOrcamento: {
        ModeloTorre: "30",
      },
      pecas: [
        {
          identificacao: "Custom",
          variables: { Largura: 1200, Altura: 1050, QtdTorres: 2, FurosPorTorre: 1 },
          especificacoes: [
            { tipo: "FURACAO", atributos: { distBordaH: 100 } },
          ],
        },
      ],
      unit: "mm",
      vidro: vidroIncolor10,
      lookups,
    });
    expect(out.pecas[0].especificacoes[0].atributos.distBordaH).toBe(100);
  });
});
