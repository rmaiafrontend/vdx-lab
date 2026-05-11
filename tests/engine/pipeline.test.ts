import { describe, expect, it } from "vitest";
import { runPipeline, ValidationError } from "@/lib/engine";
import { VIDRO_IDS, loadSeedVao, makeLookups } from "./helpers";

const varanda = loadSeedVao("003-varanda-dinamica");
const portaFixo = loadSeedVao("005-porta-com-fixo", 2);
const lookups = makeLookups();
const vidroIncolor8 = { vidroId: VIDRO_IDS.INCOLOR_8 };
const vidroIncolor10 = { vidroId: VIDRO_IDS.INCOLOR_10 };

describe("pipeline VAO — varanda dinâmica (003)", () => {
  it("5 folhas (caso §appendix B)", () => {
    const out = runPipeline({
      tipologia: varanda,
      variables: { Lvao: 4000, Avao: 2200, Nfolhas: 5 },
      unit: "mm",
      vidro: vidroIncolor8,
      lookups,
    });

    expect(out.pecas).toHaveLength(5);
    expect(out.pecas.map((p) => p.roleCode)).toEqual([
      "CANTO_ESQ",
      "CENTRAL",
      "CENTRAL",
      "CENTRAL",
      "CANTO_DIR",
    ]);

    expect(out.variaveisCalculadas.Lutil).toBe(3650);
    expect(out.variaveisCalculadas.Lfolha).toBe(730);
    expect(out.variaveisCalculadas.Afolha).toBe(2100);

    const canto = out.pecas[0];
    expect(canto.wReal).toBe(805);
    expect(canto.wCobranca).toBe(850);
    expect(canto.areaCobrancaM2).toBeCloseTo(1.785, 4);

    const central = out.pecas[1];
    expect(central.wReal).toBe(730);
    expect(central.wCobranca).toBe(750);

    expect(out.totais.quantidadePecas).toBe(5);
    expect(out.totais.porRole.CANTO_ESQ.count).toBe(1);
    expect(out.totais.porRole.CENTRAL.count).toBe(3);
    expect(out.totais.porRole.CANTO_DIR.count).toBe(1);
  });

  it("3 folhas (mínima)", () => {
    const out = runPipeline({
      tipologia: varanda,
      variables: { Lvao: 4000, Avao: 2200, Nfolhas: 3 },
      unit: "mm",
      vidro: vidroIncolor8,
      lookups,
    });

    expect(out.pecas).toHaveLength(3);
    expect(out.pecas.map((p) => p.roleCode)).toEqual([
      "CANTO_ESQ",
      "CENTRAL",
      "CANTO_DIR",
    ]);
    // Lutil = 4000 - 150 - 2*50 = 3750; Lfolha = 1250
    expect(out.variaveisCalculadas.Lfolha).toBe(1250);
  });

  it("Nfolhas mínimo - 1 falha (VARIABLE_OUT_OF_RANGE)", () => {
    expect(() =>
      runPipeline({
        tipologia: varanda,
        variables: { Lvao: 4000, Avao: 2200, Nfolhas: 2 },
        unit: "mm",
        vidro: vidroIncolor8,
        lookups,
      })
    ).toThrow(ValidationError);
  });

  it("Lvao fora do range falha", () => {
    expect(() =>
      runPipeline({
        tipologia: varanda,
        variables: { Lvao: 1500, Avao: 2200, Nfolhas: 5 },
        unit: "mm",
        vidro: vidroIncolor8,
        lookups,
      })
    ).toThrow(/Lvao=1500/);
  });

  it("variável obrigatória ausente falha", () => {
    expect(() =>
      runPipeline({
        tipologia: varanda,
        variables: { Avao: 2200, Nfolhas: 5 },
        unit: "mm",
        vidro: vidroIncolor8,
        lookups,
      })
    ).toThrow(/Lvao/);
  });

  it("conversão de unidade cm → mm", () => {
    const out = runPipeline({
      tipologia: varanda,
      variables: { Lvao: 400, Avao: 220, Nfolhas: 5 },
      unit: "cm",
      vidro: vidroIncolor8,
      lookups,
    });
    expect(out.variaveisCalculadas.Lvao).toBe(4000);
    expect(out.variaveisCalculadas.Avao).toBe(2200);
  });
});

describe("pipeline VAO — porta com fixo (005, condition)", () => {
  it("TipoInstalacao=U gera FIXO_U", () => {
    const out = runPipeline({
      tipologia: portaFixo,
      variables: {
        Lvao: 2000,
        Avao: 2200,
        Lporta: 900,
        TipoInstalacao: "U",
      },
      unit: "mm",
      vidro: vidroIncolor10,
      lookups,
    });

    expect(out.pecas).toHaveLength(2);
    const porta = out.pecas.find((p) => p.groupCode === "PORTA");
    const fixo = out.pecas.find((p) => p.groupCode === "FIXO");
    expect(porta?.roleCode).toBe("UNICO");
    expect(fixo?.roleCode).toBe("FIXO_U");
    // Lfixo_bruto = 2000 - 900 = 1100; w = 1100 - 2*12 = 1076
    expect(fixo?.wReal).toBe(1076);
    expect(fixo?.hReal).toBe(2200 - 2 * 12);
  });

  it("TipoInstalacao=FERRAGEM gera FIXO_FERRAGEM (condition diferente)", () => {
    const out = runPipeline({
      tipologia: portaFixo,
      variables: {
        Lvao: 2000,
        Avao: 2200,
        Lporta: 900,
        TipoInstalacao: "FERRAGEM",
      },
      unit: "mm",
      vidro: vidroIncolor10,
      lookups,
    });

    expect(out.pecas).toHaveLength(2);
    const fixo = out.pecas.find((p) => p.groupCode === "FIXO");
    expect(fixo?.roleCode).toBe("FIXO_FERRAGEM");
    // w = 1100 - 2*5 = 1090
    expect(fixo?.wReal).toBe(1090);
    expect(fixo?.hReal).toBe(2200 - 2 * 5);
  });

  it("breakdown em modo U inclui FERRAGEM_U e exclui FERRAGEM_FE", () => {
    const out = runPipeline({
      tipologia: portaFixo,
      variables: {
        Lvao: 2000,
        Avao: 2200,
        Lporta: 900,
        TipoInstalacao: "U",
      },
      unit: "mm",
      vidro: vidroIncolor10,
      lookups,
    });
    const codes = out.preco.breakdown.map((b) => b.ruleCode);
    expect(codes).toContain("FERRAGEM_U");
    expect(codes).not.toContain("FERRAGEM_FE");
  });

  it("breakdown em modo FERRAGEM inclui FERRAGEM_FE e exclui FERRAGEM_U", () => {
    const out = runPipeline({
      tipologia: portaFixo,
      variables: {
        Lvao: 2000,
        Avao: 2200,
        Lporta: 900,
        TipoInstalacao: "FERRAGEM",
      },
      unit: "mm",
      vidro: vidroIncolor10,
      lookups,
    });
    const codes = out.preco.breakdown.map((b) => b.ruleCode);
    expect(codes).toContain("FERRAGEM_FE");
    expect(codes).not.toContain("FERRAGEM_U");
  });
});

describe("pipeline — saída tem shape esperado", () => {
  it("CalcOutput contem pecas, variaveisCalculadas, totais, preco", () => {
    const out = runPipeline({
      tipologia: varanda,
      variables: { Lvao: 4000, Avao: 2200, Nfolhas: 5 },
      unit: "mm",
      vidro: vidroIncolor8,
      lookups,
    });
    expect(out).toHaveProperty("pecas");
    expect(out).toHaveProperty("variaveisCalculadas");
    expect(out).toHaveProperty("totais");
    expect(out).toHaveProperty("preco.breakdown");
    expect(out).toHaveProperty("preco.total");
  });
});
