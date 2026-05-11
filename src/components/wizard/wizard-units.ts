import type { Unit } from "@/lib/engine";

export const UNIT_OPTIONS: Unit[] = ["mm", "cm", "m"];

const FACTOR_TO_MM: Record<Unit, number> = {
  mm: 1,
  cm: 10,
  m: 1000,
};

export function toMm(value: number, unit: Unit): number {
  return value * FACTOR_TO_MM[unit];
}

export function fromMm(valueMm: number, unit: Unit): number {
  return valueMm / FACTOR_TO_MM[unit];
}

export function isDimensionUnit(u: string | null | undefined): u is Unit {
  return u === "mm" || u === "cm" || u === "m";
}

export function parseFloatOr(
  s: string | null | undefined,
  fallback: number
): number {
  if (s === null || s === undefined || s === "") return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? n : fallback;
}

export function parseIntOr(
  s: string | null | undefined,
  fallback: number
): number {
  if (s === null || s === undefined || s === "") return fallback;
  const n = Number(s);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

export function parseBool(s: string | null | undefined): boolean | null {
  if (s === "true" || s === "1") return true;
  if (s === "false" || s === "0") return false;
  return null;
}

export function fmtNumber(n: number, decimals = 0): string {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
