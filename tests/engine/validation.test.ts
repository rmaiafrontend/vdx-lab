import { describe, expect, it } from "vitest";
import { validateTipologia } from "@/lib/engine";
import type { TipologiaVaoSnapshot } from "@/lib/engine";
import {
  emptyMedidaTipologia,
  emptyVaoTipologia,
  loadSeed,
  lvarVar,
} from "./helpers";

describe("validation — seeds reais devem passar limpos", () => {
  it.each([
    ["003-varanda-dinamica"],
    ["005-porta-com-fixo"],
    ["006-guarda-corpo"],
  ])("%s não tem issues", (name) => {
    const snap = loadSeed(name);
    expect(validateTipologia(snap)).toEqual([]);
  });
});

describe("validation — FORMULA_PARSE_ERROR", () => {
  it("expressão sintaticamente inválida", () => {
    const snap = emptyVaoTipologia({
      variables: [lvarVar("Lvao")],
      computedValues: [
        {
          codigo: "X",
          expression: "1 +",
          scope: "VAO",
          pieceGroupCodigo: null,
          orderInScope: 1,
        },
      ],
    });
    const issues = validateTipologia(snap);
    expect(issues.some((i) => i.code === "FORMULA_PARSE_ERROR")).toBe(true);
  });
});

describe("validation — FORMULA_REFERENCE_ERROR", () => {
  it("variável citada não existe", () => {
    const snap = emptyVaoTipologia({
      variables: [lvarVar("Avao")],
      computedValues: [
        {
          codigo: "Afolha",
          expression: "Avao - Pinexistente",
          scope: "VAO",
          pieceGroupCodigo: null,
          orderInScope: 1,
        },
      ],
    });
    const issues = validateTipologia(snap);
    const refErrors = issues.filter((i) => i.code === "FORMULA_REFERENCE_ERROR");
    expect(refErrors).toHaveLength(1);
    expect(refErrors[0].context).toMatchObject({ symbol: "Pinexistente" });
  });
});

describe("validation — COMPUTED_VALUE_CYCLE", () => {
  it("ciclo Lutil ↔ Lfolha no escopo VAO", () => {
    const snap = emptyVaoTipologia({
      variables: [lvarVar("Lvao")],
      computedValues: [
        {
          codigo: "Lutil",
          expression: "Lfolha + 1",
          scope: "VAO",
          pieceGroupCodigo: null,
          orderInScope: 1,
        },
        {
          codigo: "Lfolha",
          expression: "Lutil - 1",
          scope: "VAO",
          pieceGroupCodigo: null,
          orderInScope: 2,
        },
      ],
    });
    const issues = validateTipologia(snap);
    const cycles = issues.filter((i) => i.code === "COMPUTED_VALUE_CYCLE");
    expect(cycles).toHaveLength(1);
    const ctx = cycles[0].context as { cycle: string[] };
    expect(ctx.cycle).toContain("Lutil");
    expect(ctx.cycle).toContain("Lfolha");
  });
});

describe("validation — MODE / LEVEL incompatibility", () => {
  it("modo VAO + variável nivel=PECA → LEVEL_INCOMPATIBILITY", () => {
    const snap = emptyVaoTipologia({
      variables: [lvarVar("Largura", { nivel: "PECA" })],
    });
    const issues = validateTipologia(snap);
    expect(
      issues.some((i) => i.code === "LEVEL_INCOMPATIBILITY")
    ).toBe(true);
  });

  it("modo VAO + ComputedValue scope=ORCAMENTO_PECA → MODE_INCOMPATIBILITY", () => {
    const snap = emptyVaoTipologia({
      variables: [lvarVar("Lvao")],
      computedValues: [
        {
          codigo: "X",
          expression: "1",
          scope: "ORCAMENTO_PECA",
          pieceGroupCodigo: null,
          orderInScope: 1,
        },
      ],
    });
    const issues = validateTipologia(snap);
    expect(
      issues.some((i) => i.code === "MODE_INCOMPATIBILITY")
    ).toBe(true);
  });

  it("modo MEDIDA + variável nivel=VAO → LEVEL_INCOMPATIBILITY", () => {
    const snap = emptyMedidaTipologia({
      variables: [lvarVar("Lvao", { nivel: "VAO" })],
    });
    const issues = validateTipologia(snap);
    expect(
      issues.some((i) => i.code === "LEVEL_INCOMPATIBILITY")
    ).toBe(true);
  });
});

describe("validation — selector", () => {
  function snapWithRoles(
    roles: TipologiaVaoSnapshot["pieceGroups"][number]["pieceRoles"],
    quantityExpression = "5"
  ): TipologiaVaoSnapshot {
    return emptyVaoTipologia({
      variables: [lvarVar("Lvao")],
      pieceGroups: [
        {
          codigo: "G",
          label: "G",
          quantityExpression,
          ordem: 1,
          pieceRoles: roles,
        },
      ],
    });
  }

  it("SELECTOR_OVERLAP — FIRST e ALL", () => {
    const snap = snapWithRoles([
      {
        codigo: "A",
        label: "A",
        selectorKind: "FIRST",
        selectorValue: null,
        condition: null,
        widthExpression: "100",
        heightExpression: "100",
        ordem: 1,
      },
      {
        codigo: "B",
        label: "B",
        selectorKind: "ALL",
        selectorValue: null,
        condition: null,
        widthExpression: "100",
        heightExpression: "100",
        ordem: 2,
      },
    ]);
    const issues = validateTipologia(snap);
    expect(issues.some((i) => i.code === "SELECTOR_OVERLAP")).toBe(true);
  });

  it("SELECTOR_GAP — FIRST e LAST com TOTAL=5 deixa 2..4 sem cobertura", () => {
    const snap = snapWithRoles([
      {
        codigo: "A",
        label: "A",
        selectorKind: "FIRST",
        selectorValue: null,
        condition: null,
        widthExpression: "100",
        heightExpression: "100",
        ordem: 1,
      },
      {
        codigo: "B",
        label: "B",
        selectorKind: "LAST",
        selectorValue: null,
        condition: null,
        widthExpression: "100",
        heightExpression: "100",
        ordem: 2,
      },
    ]);
    const gaps = validateTipologia(snap).filter(
      (i) => i.code === "SELECTOR_GAP"
    );
    expect(gaps.length).toBeGreaterThanOrEqual(3);
  });

  it("cobertura completa não gera issues de selector", () => {
    const snap = snapWithRoles(
      [
        {
          codigo: "A",
          label: "A",
          selectorKind: "FIRST",
          selectorValue: null,
          condition: null,
          widthExpression: "100",
          heightExpression: "100",
          ordem: 1,
        },
        {
          codigo: "B",
          label: "B",
          selectorKind: "EXCEPT_FIRST_LAST",
          selectorValue: null,
          condition: null,
          widthExpression: "100",
          heightExpression: "100",
          ordem: 2,
        },
        {
          codigo: "C",
          label: "C",
          selectorKind: "LAST",
          selectorValue: null,
          condition: null,
          widthExpression: "100",
          heightExpression: "100",
          ordem: 3,
        },
      ],
      "5"
    );
    const issues = validateTipologia(snap).filter((i) =>
      i.code.startsWith("SELECTOR_")
    );
    expect(issues).toEqual([]);
  });
});

describe("validation — selector com condition (caso 005-like)", () => {
  it("dois roles condicionais cobrem o índice 1 sem gap em ambas as opções", () => {
    const snap = emptyVaoTipologia({
      variables: [
        lvarVar("Lvao"),
        {
          codigo: "TipoInstalacao",
          label: "Tipo",
          kind: "OPTION_LIST",
          nivel: "VAO",
          unit: null,
          required: true,
          defaultValue: "U",
          minValue: null,
          maxValue: null,
          options: [
            { codigo: "U", label: "U" },
            { codigo: "FERRAGEM", label: "Ferragem" },
          ],
          ordem: 2,
        },
      ],
      pieceGroups: [
        {
          codigo: "FIXO",
          label: "Fixo",
          quantityExpression: "1",
          ordem: 1,
          pieceRoles: [
            {
              codigo: "FIXO_U",
              label: "Fixo U",
              selectorKind: "ALL",
              selectorValue: null,
              condition: "TipoInstalacao == 'U'",
              widthExpression: "100",
              heightExpression: "100",
              ordem: 1,
            },
            {
              codigo: "FIXO_FE",
              label: "Fixo FE",
              selectorKind: "ALL",
              selectorValue: null,
              condition: "TipoInstalacao == 'FERRAGEM'",
              widthExpression: "100",
              heightExpression: "100",
              ordem: 2,
            },
          ],
        },
      ],
    });
    const issues = validateTipologia(snap).filter((i) =>
      i.code.startsWith("SELECTOR_")
    );
    expect(issues).toEqual([]);
  });

  it("cobertura com condition: opção sem role aplicável gera SELECTOR_GAP", () => {
    const snap = emptyVaoTipologia({
      variables: [
        lvarVar("Lvao"),
        {
          codigo: "Tipo",
          label: "Tipo",
          kind: "OPTION_LIST",
          nivel: "VAO",
          unit: null,
          required: true,
          defaultValue: "A",
          minValue: null,
          maxValue: null,
          options: [
            { codigo: "A", label: "A" },
            { codigo: "B", label: "B" },
            { codigo: "C", label: "C" },
          ],
          ordem: 2,
        },
      ],
      pieceGroups: [
        {
          codigo: "G",
          label: "G",
          quantityExpression: "1",
          ordem: 1,
          pieceRoles: [
            {
              codigo: "RA",
              label: "RA",
              selectorKind: "ALL",
              selectorValue: null,
              condition: "Tipo == 'A'",
              widthExpression: "100",
              heightExpression: "100",
              ordem: 1,
            },
            {
              codigo: "RB",
              label: "RB",
              selectorKind: "ALL",
              selectorValue: null,
              condition: "Tipo == 'B'",
              widthExpression: "100",
              heightExpression: "100",
              ordem: 2,
            },
          ],
        },
      ],
    });
    const issues = validateTipologia(snap).filter(
      (i) => i.code === "SELECTOR_GAP"
    );
    expect(issues.length).toBeGreaterThan(0);
  });
});

describe("validation — SpecificationTemplate (modo MEDIDA)", () => {
  it("schemaAtributos com source apontando variável inexistente gera erro", () => {
    const snap = emptyMedidaTipologia({
      variables: [
        lvarVar("Largura", { nivel: "PECA" }),
        lvarVar("Altura", { nivel: "PECA" }),
      ],
      specificationTemplates: [
        {
          codigo: "FURACAO",
          label: "Furação",
          schemaAtributos: {
            qtd: { type: "integer", source: "QtdInexistente" },
          },
          requiredMin: 0,
          requiredMax: null,
          ordem: 1,
        },
      ],
    });
    const issues = validateTipologia(snap);
    expect(
      issues.some((i) => i.code === "SPECIFICATION_SCHEMA_INVALID")
    ).toBe(true);
  });

  it("schemaAtributos com type inválido gera erro", () => {
    const snap = emptyMedidaTipologia({
      variables: [
        lvarVar("Largura", { nivel: "PECA" }),
        lvarVar("Altura", { nivel: "PECA" }),
      ],
      specificationTemplates: [
        {
          codigo: "FURACAO",
          label: "Furação",
          schemaAtributos: {
            x: { type: "datetime" as never },
          },
          requiredMin: 0,
          requiredMax: null,
          ordem: 1,
        },
      ],
    });
    const issues = validateTipologia(snap);
    expect(
      issues.some((i) => i.code === "SPECIFICATION_SCHEMA_INVALID")
    ).toBe(true);
  });
});

describe("validation — Pricing × modo", () => {
  it("modo VAO não aceita basis=PER_SPECIFICATION", () => {
    const snap = emptyVaoTipologia({
      variables: [lvarVar("Lvao")],
      pieceGroups: [
        {
          codigo: "G",
          label: "G",
          quantityExpression: "1",
          ordem: 1,
          pieceRoles: [
            {
              codigo: "R",
              label: "R",
              selectorKind: "ALL",
              selectorValue: null,
              condition: null,
              widthExpression: "100",
              heightExpression: "100",
              ordem: 1,
            },
          ],
        },
      ],
      pricingRules: [
        {
          codigo: "X",
          label: null,
          componentKind: "BENEFICIAMENTO",
          basis: "PER_SPECIFICATION",
          appliesTo: "TIPOLOGIA",
          appliesToValue: null,
          expression: "10",
          condition: null,
          ordem: 1,
          ativo: true,
        },
      ],
    });
    const issues = validateTipologia(snap);
    expect(
      issues.some((i) => i.code === "PRICING_BASIS_INCOMPATIBLE")
    ).toBe(true);
  });

  it("modo MEDIDA não aceita basis=PER_GROUP", () => {
    const snap = emptyMedidaTipologia({
      variables: [
        lvarVar("Largura", { nivel: "PECA" }),
        lvarVar("Altura", { nivel: "PECA" }),
      ],
      pricingRules: [
        {
          codigo: "X",
          label: null,
          componentKind: "FERRAGEM",
          basis: "PER_GROUP",
          appliesTo: "TIPOLOGIA",
          appliesToValue: null,
          expression: "10",
          condition: null,
          ordem: 1,
          ativo: true,
        },
      ],
    });
    const issues = validateTipologia(snap);
    expect(
      issues.some((i) => i.code === "PRICING_BASIS_INCOMPATIBLE")
    ).toBe(true);
  });
});
