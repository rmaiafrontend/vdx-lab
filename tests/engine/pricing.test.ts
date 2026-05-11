import { describe, expect, it } from "vitest";
import { runPipeline } from "@/lib/engine";
import type { TipologiaVaoSnapshot } from "@/lib/engine";
import {
  VIDRO_IDS,
  emptyVaoTipologia,
  loadSeedVao,
  lvarVar,
  makeLookups,
} from "./helpers";

const varanda = loadSeedVao("003-varanda-dinamica");
const lookups = makeLookups();
const vidroIncolor8 = { vidroId: VIDRO_IDS.INCOLOR_8 };

describe("pricing — varanda (003)", () => {
  it("breakdown tem VIDRO + FERRAGEM + INSTALACAO", () => {
    const out = runPipeline({
      tipologia: varanda,
      variables: { Lvao: 4000, Avao: 2200, Nfolhas: 5 },
      unit: "mm",
      vidro: vidroIncolor8,
      lookups,
    });
    const codes = out.preco.breakdown.map((b) => b.ruleCode);
    expect(codes).toEqual(["VIDRO_M2", "FERRAGEM_CANTO", "INSTALACAO_VAO"]);
  });

  it("FERRAGEM = 360 (2 cantos × 180)", () => {
    const out = runPipeline({
      tipologia: varanda,
      variables: { Lvao: 4000, Avao: 2200, Nfolhas: 5 },
      unit: "mm",
      vidro: vidroIncolor8,
      lookups,
    });
    const ferragem = out.preco.breakdown.find(
      (b) => b.ruleCode === "FERRAGEM_CANTO"
    );
    expect(ferragem?.valor).toBe(360);
    expect(ferragem?.kind).toBe("FERRAGEM");
  });

  it("INSTALACAO = 750 (350 + 80*5)", () => {
    const out = runPipeline({
      tipologia: varanda,
      variables: { Lvao: 4000, Avao: 2200, Nfolhas: 5 },
      unit: "mm",
      vidro: vidroIncolor8,
      lookups,
    });
    const instalacao = out.preco.breakdown.find(
      (b) => b.ruleCode === "INSTALACAO_VAO"
    );
    expect(instalacao?.valor).toBe(750);
  });

  it("INSTALACAO escala com Nfolhas (350 + 80*Nfolhas)", () => {
    const out3 = runPipeline({
      tipologia: varanda,
      variables: { Lvao: 4000, Avao: 2200, Nfolhas: 3 },
      unit: "mm",
      vidro: vidroIncolor8,
      lookups,
    });
    expect(
      out3.preco.breakdown.find((b) => b.ruleCode === "INSTALACAO_VAO")?.valor
    ).toBe(590); // 350 + 80*3
  });

  it("VIDRO_M2 usa precoVidro injetado (INCOLOR_8 = 280) × área de cobrança", () => {
    const out = runPipeline({
      tipologia: varanda,
      variables: { Lvao: 4000, Avao: 2200, Nfolhas: 5 },
      unit: "mm",
      vidro: vidroIncolor8,
      lookups,
    });
    const vidro = out.preco.breakdown.find((b) => b.ruleCode === "VIDRO_M2");
    // area_cob_total = 8.295, 8.295 * 280 = 2322.60
    expect(vidro?.valor).toBeCloseTo(2322.6, 2);
  });

  it("vidro.precoM2 custom override entra no lugar da tabela", () => {
    const out = runPipeline({
      tipologia: varanda,
      variables: { Lvao: 4000, Avao: 2200, Nfolhas: 5 },
      unit: "mm",
      vidro: { vidroId: VIDRO_IDS.INCOLOR_8, precoM2: 500 },
      lookups,
    });
    const vidro = out.preco.breakdown.find((b) => b.ruleCode === "VIDRO_M2");
    expect(vidro?.valor).toBeCloseTo(8.295 * 500, 2);
  });

  it("total bate com soma do breakdown", () => {
    const out = runPipeline({
      tipologia: varanda,
      variables: { Lvao: 4000, Avao: 2200, Nfolhas: 5 },
      unit: "mm",
      vidro: vidroIncolor8,
      lookups,
    });
    const sum = out.preco.breakdown.reduce((s, b) => s + b.valor, 0);
    expect(out.preco.total).toBeCloseTo(sum, 2);
  });
});

describe("pricing — basis × applies_to (PER_GROUP inline)", () => {
  it("PER_GROUP × GROUP_CODE aplica 1× por grupo presente", () => {
    const tip: TipologiaVaoSnapshot = emptyVaoTipologia({
      variables: [
        lvarVar("Lvao", { defaultValue: "1200", required: false }),
        lvarVar("Avao", { defaultValue: "2000", required: false }),
      ],
      pieceGroups: [
        {
          codigo: "FOLHAS",
          label: "Folhas",
          quantityExpression: "2",
          ordem: 1,
          pieceRoles: [
            {
              codigo: "FIXA",
              label: "Fixa",
              selectorKind: "FIRST",
              selectorValue: null,
              condition: null,
              widthExpression: "Lvao*0.4",
              heightExpression: "Avao",
              ordem: 1,
            },
            {
              codigo: "MOVEL",
              label: "Móvel",
              selectorKind: "LAST",
              selectorValue: null,
              condition: null,
              widthExpression: "Lvao*0.6",
              heightExpression: "Avao",
              ordem: 2,
            },
          ],
        },
      ],
      pricingRules: [
        {
          codigo: "FERRAGEM_BOX",
          label: "Ferragem do box",
          componentKind: "FERRAGEM",
          basis: "PER_GROUP",
          appliesTo: "GROUP_CODE",
          appliesToValue: "FOLHAS",
          expression: "420",
          condition: null,
          ordem: 1,
          ativo: true,
        },
      ],
    });
    const out = runPipeline({
      tipologia: tip,
      variables: {},
      unit: "mm",
      lookups,
    });
    const ferragem = out.preco.breakdown.find(
      (b) => b.ruleCode === "FERRAGEM_BOX"
    );
    expect(ferragem?.valor).toBe(420);
  });
});

describe("pricing — condition e ativo", () => {
  it("regra com ativo=false é ignorada", () => {
    const tip: TipologiaVaoSnapshot = {
      ...varanda,
      pricingRules: varanda.pricingRules.map((r) =>
        r.codigo === "INSTALACAO_VAO" ? { ...r, ativo: false } : r
      ),
    };
    const out = runPipeline({
      tipologia: tip,
      variables: { Lvao: 4000, Avao: 2200, Nfolhas: 5 },
      unit: "mm",
      vidro: vidroIncolor8,
      lookups,
    });
    expect(
      out.preco.breakdown.find((b) => b.ruleCode === "INSTALACAO_VAO")
    ).toBeUndefined();
  });

  it("regra com condition=false é ignorada", () => {
    const tip: TipologiaVaoSnapshot = {
      ...varanda,
      pricingRules: varanda.pricingRules.map((r) =>
        r.codigo === "FERRAGEM_CANTO"
          ? { ...r, condition: "Nfolhas > 99" }
          : r
      ),
    };
    const out = runPipeline({
      tipologia: tip,
      variables: { Lvao: 4000, Avao: 2200, Nfolhas: 5 },
      unit: "mm",
      vidro: vidroIncolor8,
      lookups,
    });
    expect(
      out.preco.breakdown.find((b) => b.ruleCode === "FERRAGEM_CANTO")
    ).toBeUndefined();
  });

  it("regra com condition=true é aplicada", () => {
    const tip: TipologiaVaoSnapshot = {
      ...varanda,
      pricingRules: varanda.pricingRules.map((r) =>
        r.codigo === "FERRAGEM_CANTO"
          ? { ...r, condition: "Nfolhas >= 3" }
          : r
      ),
    };
    const out = runPipeline({
      tipologia: tip,
      variables: { Lvao: 4000, Avao: 2200, Nfolhas: 5 },
      unit: "mm",
      vidro: vidroIncolor8,
      lookups,
    });
    expect(
      out.preco.breakdown.find((b) => b.ruleCode === "FERRAGEM_CANTO")?.valor
    ).toBe(360);
  });
});
