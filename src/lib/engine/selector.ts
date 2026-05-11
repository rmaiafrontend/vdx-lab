import { SelectorError } from "./errors";
import { evaluate } from "./evaluator";
import type { EvalScope, SelectorKind } from "./types";

const SELECTORS_WITHOUT_VALUE: SelectorKind[] = [
  "ALL",
  "FIRST",
  "LAST",
  "FIRST_AND_LAST",
  "EXCEPT_FIRST_LAST",
  "ODD",
  "EVEN",
];

export function selectorRequiresValue(kind: SelectorKind): boolean {
  return !SELECTORS_WITHOUT_VALUE.includes(kind);
}

export function resolveSelector(
  kind: SelectorKind,
  value: string | null,
  groupTotal: number,
  scope: EvalScope = {}
): Set<number> {
  const result = new Set<number>();
  if (!Number.isFinite(groupTotal) || groupTotal < 0) return result;

  const total = Math.floor(groupTotal);

  switch (kind) {
    case "ALL": {
      for (let i = 1; i <= total; i++) result.add(i);
      return result;
    }
    case "FIRST": {
      if (total >= 1) result.add(1);
      return result;
    }
    case "LAST": {
      if (total >= 1) result.add(total);
      return result;
    }
    case "FIRST_AND_LAST": {
      if (total >= 1) result.add(1);
      if (total >= 2) result.add(total);
      return result;
    }
    case "EXCEPT_FIRST_LAST": {
      for (let i = 2; i <= total - 1; i++) result.add(i);
      return result;
    }
    case "ODD": {
      for (let i = 1; i <= total; i += 2) result.add(i);
      return result;
    }
    case "EVEN": {
      for (let i = 2; i <= total; i += 2) result.add(i);
      return result;
    }
    case "INDEX": {
      const idx = parseIntStrict(value, "INDEX");
      assertInRange(idx, total, "INDEX");
      result.add(idx);
      return result;
    }
    case "INDEX_LIST": {
      if (!value || value.trim() === "") {
        throw new SelectorError({
          code: "SELECTOR_OUT_OF_RANGE",
          message: "INDEX_LIST requer ao menos um índice",
        });
      }
      const parts = value
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      for (const p of parts) {
        const idx = parseIntStrict(p, "INDEX_LIST");
        assertInRange(idx, total, "INDEX_LIST");
        result.add(idx);
      }
      return result;
    }
    case "RANGE": {
      if (!value || !value.includes("..")) {
        throw new SelectorError({
          code: "SELECTOR_OUT_OF_RANGE",
          message: 'RANGE precisa do formato "início..fim" (ex.: "2..N-1")',
          context: { value },
        });
      }
      const dotIdx = value.indexOf("..");
      const left = value.slice(0, dotIdx).trim();
      const right = value.slice(dotIdx + 2).trim();
      const rangeScope: EvalScope = {
        ...scope,
        N: total,
        TOTAL: total,
      };
      const start = Math.floor(
        Number(evaluate(left, rangeScope, { scope: "VAO" }))
      );
      const end = Math.floor(
        Number(evaluate(right, rangeScope, { scope: "VAO" }))
      );
      const a = Math.max(1, start);
      const b = Math.min(total, end);
      for (let i = a; i <= b; i++) result.add(i);
      return result;
    }
    case "EXPRESSION": {
      if (!value || value.trim() === "") {
        throw new SelectorError({
          code: "SELECTOR_OUT_OF_RANGE",
          message: "EXPRESSION requer um predicado booleano",
        });
      }
      for (let i = 1; i <= total; i++) {
        const exprScope: EvalScope = {
          ...scope,
          INDEX: i,
          TOTAL: total,
          IS_FIRST: i === 1,
          IS_LAST: i === total,
        };
        const v = evaluate(value, exprScope, { scope: "PIECE" });
        if (v === true) result.add(i);
      }
      return result;
    }
  }
}

function parseIntStrict(raw: string | null, kind: string): number {
  if (raw === null || raw === undefined || raw.trim() === "") {
    throw new SelectorError({
      code: "SELECTOR_OUT_OF_RANGE",
      message: `${kind} requer um índice numérico`,
    });
  }
  const n = Number(raw.trim());
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new SelectorError({
      code: "SELECTOR_OUT_OF_RANGE",
      message: `${kind} recebeu valor não-inteiro: "${raw}"`,
    });
  }
  return n;
}

function assertInRange(idx: number, total: number, kind: string): void {
  if (idx < 1 || idx > total) {
    throw new SelectorError({
      code: "SELECTOR_OUT_OF_RANGE",
      message: `${kind}=${idx} fora do intervalo [1, ${total}]`,
      context: { index: idx, total },
    });
  }
}
