import { ValidationError } from "./errors";
import type { Unit } from "./types";

export const FACTOR_TO_MM: Record<Unit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
};

export function unitFactor(unit: Unit): number {
  const f = FACTOR_TO_MM[unit];
  if (f === undefined) {
    throw new ValidationError({
      code: "FORMULA_RUNTIME_ERROR",
      message: `unidade desconhecida: ${unit}`,
    });
  }
  return f;
}

export function ceil50(n: number): number {
  return Math.ceil(n / 50) * 50;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
