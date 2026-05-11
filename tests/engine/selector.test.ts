import { describe, expect, it } from "vitest";
import { resolveSelector, SelectorError } from "@/lib/engine";

const set = (...n: number[]) => new Set(n);

describe("selector — kinds sem valor", () => {
  it("ALL", () => {
    expect(resolveSelector("ALL", null, 0)).toEqual(set());
    expect(resolveSelector("ALL", null, 1)).toEqual(set(1));
    expect(resolveSelector("ALL", null, 5)).toEqual(set(1, 2, 3, 4, 5));
  });

  it("FIRST", () => {
    expect(resolveSelector("FIRST", null, 0)).toEqual(set());
    expect(resolveSelector("FIRST", null, 1)).toEqual(set(1));
    expect(resolveSelector("FIRST", null, 5)).toEqual(set(1));
  });

  it("LAST", () => {
    expect(resolveSelector("LAST", null, 0)).toEqual(set());
    expect(resolveSelector("LAST", null, 1)).toEqual(set(1));
    expect(resolveSelector("LAST", null, 5)).toEqual(set(5));
  });

  it("FIRST_AND_LAST", () => {
    expect(resolveSelector("FIRST_AND_LAST", null, 0)).toEqual(set());
    expect(resolveSelector("FIRST_AND_LAST", null, 1)).toEqual(set(1));
    expect(resolveSelector("FIRST_AND_LAST", null, 2)).toEqual(set(1, 2));
    expect(resolveSelector("FIRST_AND_LAST", null, 5)).toEqual(set(1, 5));
  });

  it("EXCEPT_FIRST_LAST", () => {
    expect(resolveSelector("EXCEPT_FIRST_LAST", null, 1)).toEqual(set());
    expect(resolveSelector("EXCEPT_FIRST_LAST", null, 2)).toEqual(set());
    expect(resolveSelector("EXCEPT_FIRST_LAST", null, 3)).toEqual(set(2));
    expect(resolveSelector("EXCEPT_FIRST_LAST", null, 5)).toEqual(set(2, 3, 4));
  });

  it("ODD", () => {
    expect(resolveSelector("ODD", null, 5)).toEqual(set(1, 3, 5));
    expect(resolveSelector("ODD", null, 6)).toEqual(set(1, 3, 5));
  });

  it("EVEN", () => {
    expect(resolveSelector("EVEN", null, 5)).toEqual(set(2, 4));
    expect(resolveSelector("EVEN", null, 6)).toEqual(set(2, 4, 6));
  });
});

describe("selector — kinds com valor", () => {
  it("INDEX", () => {
    expect(resolveSelector("INDEX", "3", 5)).toEqual(set(3));
    expect(resolveSelector("INDEX", "1", 5)).toEqual(set(1));
  });

  it("INDEX fora do range vira erro", () => {
    expect(() => resolveSelector("INDEX", "10", 5)).toThrow(SelectorError);
    expect(() => resolveSelector("INDEX", "0", 5)).toThrow(SelectorError);
  });

  it("INDEX inválido", () => {
    expect(() => resolveSelector("INDEX", "abc", 5)).toThrow(SelectorError);
    expect(() => resolveSelector("INDEX", "1.5", 5)).toThrow(SelectorError);
  });

  it("INDEX_LIST", () => {
    expect(resolveSelector("INDEX_LIST", "1,3,5", 5)).toEqual(set(1, 3, 5));
    expect(resolveSelector("INDEX_LIST", "2, 4", 5)).toEqual(set(2, 4));
  });

  it("INDEX_LIST com índice fora do range falha", () => {
    expect(() => resolveSelector("INDEX_LIST", "1,10", 5)).toThrow(
      SelectorError
    );
  });

  it("RANGE com expressão dos dois lados", () => {
    expect(resolveSelector("RANGE", "2..N-1", 5)).toEqual(set(2, 3, 4));
    expect(resolveSelector("RANGE", "1..3", 10)).toEqual(set(1, 2, 3));
    expect(resolveSelector("RANGE", "TOTAL/2..TOTAL", 10)).toEqual(
      set(5, 6, 7, 8, 9, 10)
    );
  });

  it("RANGE clipping aos limites", () => {
    expect(resolveSelector("RANGE", "0..100", 5)).toEqual(set(1, 2, 3, 4, 5));
  });

  it("EXPRESSION com INDEX % 2", () => {
    expect(resolveSelector("EXPRESSION", "INDEX % 2 == 0", null as never, {})).toEqual(
      set()
    );
    expect(resolveSelector("EXPRESSION", "INDEX % 2 == 0", 6)).toEqual(set(2, 4, 6));
    expect(resolveSelector("EXPRESSION", "INDEX % 2 == 1", 5)).toEqual(set(1, 3, 5));
  });

  it("EXPRESSION pode usar IS_FIRST/IS_LAST/TOTAL", () => {
    expect(
      resolveSelector("EXPRESSION", "not IS_FIRST and not IS_LAST", 5)
    ).toEqual(set(2, 3, 4));
  });

  it("EXPRESSION usando variáveis do escopo", () => {
    expect(
      resolveSelector(
        "EXPRESSION",
        "INDEX <= corte",
        5,
        { corte: 3 }
      )
    ).toEqual(set(1, 2, 3));
  });
});
