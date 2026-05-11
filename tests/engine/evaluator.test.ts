import { describe, expect, it } from "vitest";
import { evaluate, FormulaError } from "@/lib/engine";

const VAO = { scope: "VAO" } as const;

describe("evaluator — aritmética e operadores", () => {
  it.each([
    ["1 + 2", {}, 3],
    ["10 - 4", {}, 6],
    ["3 * 4", {}, 12],
    ["10 / 4", {}, 2.5],
    ["7 % 3", {}, 1],
    ["2 ^ 8", {}, 256],
    ["(1 + 2) * 3", {}, 9],
    ["a + b * 2", { a: 10, b: 5 }, 20],
    ["Lvao - 2*Pcanto - (Nfolhas - 1)*Pperfil", { Lvao: 4000, Pcanto: 75, Nfolhas: 5, Pperfil: 50 }, 3650],
  ])("%s", (expr, scope, expected) => {
    expect(evaluate(expr, scope, VAO)).toBe(expected);
  });

  it.each([
    ["1 < 2", true],
    ["2 <= 2", true],
    ["3 > 5", false],
    ["3 == 3", true],
    ["3 != 4", true],
    ["true and false", false],
    ["true or false", true],
    ["not false", true],
  ])("%s -> %s", (expr, expected) => {
    expect(evaluate(expr, {}, VAO)).toBe(expected);
  });

  it("ternário cond ? a : b", () => {
    expect(evaluate("x > 5 ? 100 : 0", { x: 10 }, VAO)).toBe(100);
    expect(evaluate("x > 5 ? 100 : 0", { x: 3 }, VAO)).toBe(0);
  });

  it("strings literais e comparação ==", () => {
    expect(evaluate("Tipo == 'U'", { Tipo: "U" }, VAO)).toBe(true);
    expect(evaluate("Tipo == 'U'", { Tipo: "FERRAGEM" }, VAO)).toBe(false);
    expect(evaluate("Cor != 'INCOLOR'", { Cor: "FUME" }, VAO)).toBe(true);
  });
});

describe("evaluator — builtins permitidos", () => {
  it.each([
    ["min(3, 5, 1)", 1],
    ["max(3, 5, 1)", 5],
    ["floor(3.7)", 3],
    ["ceil(3.2)", 4],
    ["round(3.5)", 4],
    ["abs(-7)", 7],
    ["sqrt(16)", 4],
    ["if(true, 10, 20)", 10],
    ["if(false, 10, 20)", 20],
    ["if(x > 0, x, -x)", 5],
  ])("%s", (expr, expected) => {
    expect(evaluate(expr, { x: 5 }, VAO)).toBe(expected);
  });

  it("precoVidro injetado por ctx", () => {
    const result = evaluate(
      "precoVidro(VidroId)",
      { VidroId: 3 },
      {
        ...VAO,
        precoVidro: (id) => (id === 3 ? 360 : 0),
      }
    );
    expect(result).toBe(360);
  });

  it("precoTorre injetado por ctx", () => {
    const result = evaluate(
      "precoTorre(ModeloTorre)",
      { ModeloTorre: "30" },
      { ...VAO, precoTorre: (m) => (m === "30" ? 420 : 0) }
    );
    expect(result).toBe(420);
  });

  it("precoVidro sem injeção lança erro de runtime", () => {
    let err: FormulaError | undefined;
    try {
      evaluate("precoVidro(1)", {}, VAO);
    } catch (e) {
      if (e instanceof FormulaError) err = e;
    }
    expect(err).toBeDefined();
  });
});

describe("evaluator — erros estruturados", () => {
  it("FORMULA_PARSE_ERROR para sintaxe inválida", () => {
    let captured: FormulaError | undefined;
    try {
      evaluate("1 +", {}, VAO);
    } catch (err) {
      if (err instanceof FormulaError) captured = err;
    }
    expect(captured).toBeInstanceOf(FormulaError);
    expect(captured?.code).toBe("FORMULA_PARSE_ERROR");
  });

  it("FORMULA_REFERENCE_ERROR para símbolo inexistente", () => {
    let captured: FormulaError | undefined;
    try {
      evaluate("Lvxx + 10", {}, VAO);
    } catch (err) {
      if (err instanceof FormulaError) captured = err;
    }
    expect(captured?.code).toBe("FORMULA_REFERENCE_ERROR");
    expect(captured?.expression).toBe("Lvxx + 10");
    expect(captured?.scope).toBe("VAO");
  });

  it("FORMULA_DIVISION_BY_ZERO para resultado infinito", () => {
    let captured: FormulaError | undefined;
    try {
      evaluate("1 / 0", {}, VAO);
    } catch (err) {
      if (err instanceof FormulaError) captured = err;
    }
    expect(captured?.code).toBe("FORMULA_DIVISION_BY_ZERO");
  });

  it("FORMULA_RUNTIME_ERROR para função fora da whitelist", () => {
    let captured: FormulaError | undefined;
    try {
      evaluate("eval(\"1+1\")", {}, VAO);
    } catch (err) {
      if (err instanceof FormulaError) captured = err;
    }
    expect(captured?.code).toBe("FORMULA_RUNTIME_ERROR");
    expect(captured?.message).toMatch(/eval/);
  });

  it("contexto de erro inclui tipologia/group/role", () => {
    let captured: FormulaError | undefined;
    try {
      evaluate("Pinexistente", {}, {
        scope: "PIECE",
        tipologiaId: 42,
        groupCode: "FOLHAS",
        roleCode: "CANTO_ESQ",
      });
    } catch (err) {
      if (err instanceof FormulaError) captured = err;
    }
    expect(captured?.context).toMatchObject({
      tipologia_id: 42,
      group_code: "FOLHAS",
      role_code: "CANTO_ESQ",
    });
  });

  it("toJSON devolve shape do 422", () => {
    let captured: FormulaError | undefined;
    try {
      evaluate("Pinexistente", {}, VAO);
    } catch (err) {
      if (err instanceof FormulaError) captured = err;
    }
    const json = captured?.toJSON();
    expect(json).toMatchObject({
      code: "FORMULA_REFERENCE_ERROR",
      scope: "VAO",
      expression: "Pinexistente",
    });
  });
});
