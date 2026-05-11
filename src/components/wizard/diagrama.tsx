"use client";

import { useMemo } from "react";
import type {
  PecaCalculada,
  PieceGroupSnapshot,
} from "@/lib/engine";
import { roleColor } from "@/lib/colors";
import { LoadingOverlay } from "./loading-overlay";

type Props = {
  pecas: PecaCalculada[];
  pieceGroups: PieceGroupSnapshot[];
  loading?: boolean;
  /** Se true, aplica `opacity-60` no diagrama (ex.: erro mas mantém última versão visível). */
  stale?: boolean;
};

type GroupRow = {
  codigo: string;
  label: string;
  pecas: PecaCalculada[];
  totalWidth: number;
  maxHeight: number;
};

function buildRows(
  pecas: PecaCalculada[],
  pieceGroups: PieceGroupSnapshot[]
): GroupRow[] {
  const byCodigo = new Map<string, PecaCalculada[]>();
  for (const p of pecas) {
    if (!p.groupCode) continue;
    const arr = byCodigo.get(p.groupCode) ?? [];
    arr.push(p);
    byCodigo.set(p.groupCode, arr);
  }

  // Ordem dos grupos: pelo `ordem` definido no snapshot
  const ordered = [...pieceGroups].sort(
    (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)
  );

  const rows: GroupRow[] = [];
  for (const g of ordered) {
    const pieces = (byCodigo.get(g.codigo) ?? []).sort(
      (a, b) => a.index - b.index
    );
    if (pieces.length === 0) continue;
    const totalWidth = pieces.reduce((acc, p) => acc + p.wReal, 0);
    const maxHeight = pieces.reduce((acc, p) => Math.max(acc, p.hReal), 0);
    if (totalWidth === 0 || maxHeight === 0) continue; // grupo conceitual (sem dimensões)

    rows.push({
      codigo: g.codigo,
      label: g.label,
      pecas: pieces,
      totalWidth,
      maxHeight,
    });
  }
  return rows;
}

function fmtMm(n: number): string {
  return Math.round(n).toLocaleString("pt-BR");
}

export function Diagrama({ pecas, pieceGroups, loading, stale }: Props) {
  const rows = useMemo(
    () => buildRows(pecas, pieceGroups),
    [pecas, pieceGroups]
  );

  // Texto descritivo para acessibilidade
  const a11yLabel = useMemo(() => {
    if (rows.length === 0) return "Sem peças para mostrar.";
    const parts = rows.map((r) => {
      const byRole = new Map<string, number>();
      for (const p of r.pecas) {
        const role = p.roleCode ?? "?";
        byRole.set(role, (byRole.get(role) ?? 0) + 1);
      }
      const roleSummary = Array.from(byRole.entries())
        .map(([role, count]) => `${count} ${role.toLowerCase()}`)
        .join(", ");
      return `${r.label || r.codigo}: ${r.pecas.length} peças (${roleSummary})`;
    });
    return `Composição: ${parts.join("; ")}.`;
  }, [rows]);

  if (rows.length === 0) {
    return (
      <div className="relative rounded-xl border border-border/60 bg-card/40 p-6 shadow-sm">
        <LoadingOverlay visible={!!loading} />
        <p className="text-center text-sm text-muted-foreground">
          {loading ? "Preparando pré-visualização…" : "Sem peças para mostrar."}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-xl border border-border/60 bg-card/40 p-4 shadow-sm transition-opacity ${
        stale ? "opacity-60" : ""
      }`}
      role="img"
      aria-label={a11yLabel}
    >
      <LoadingOverlay visible={!!loading} />

      <div className="space-y-4">
        {rows.map((row) => (
          <GroupStrip key={row.codigo} row={row} showLabel={rows.length > 1} />
        ))}
      </div>
    </div>
  );
}

function GroupStrip({ row, showLabel }: { row: GroupRow; showLabel: boolean }) {
  return (
    <div>
      {showLabel && (
        <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {row.label || row.codigo}
        </p>
      )}

      <div className="flex items-stretch gap-2">
        {/* Cota lateral (Avao) */}
        <div className="flex w-6 flex-col items-center justify-center text-[10px] text-muted-foreground">
          <span className="rotate-180 whitespace-nowrap [writing-mode:vertical-rl]">
            {fmtMm(row.maxHeight)} mm
          </span>
        </div>

        <div className="min-w-0 flex-1">
          {/* Cota superior (Lvao) */}
          <div className="mb-1.5 flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border/60" />
            <span className="font-mono tabular-nums">{fmtMm(row.totalWidth)} mm</span>
            <span className="h-px flex-1 bg-border/60" />
          </div>

          {/* Strip de peças — sempre 100% de largura, altura fixa */}
          <div
            className="flex w-full items-stretch gap-1.5"
            style={{ height: "min(45vh, 280px)" }}
          >
            {row.pecas.map((p) => (
              <PieceRect key={`${p.groupCode}-${p.index}`} peca={p} totalWidth={row.totalWidth} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function PieceRect({
  peca,
  totalWidth,
}: {
  peca: PecaCalculada;
  totalWidth: number;
}) {
  const c = roleColor(peca.roleCode ?? "");
  const widthPct = (peca.wReal / totalWidth) * 100;
  // Heurística: se a peça for muito estreita (< ~6% da largura), oculta texto
  const showText = widthPct >= 6;
  return (
    <div
      style={{ width: `${widthPct}%` }}
      className={`relative flex min-w-0 flex-col items-center justify-center overflow-hidden rounded-md border-2 ${c.bg} ${c.border} ${c.text}`}
      title={peca.roleCode ?? undefined}
    >
      {showText && (
        <>
          <span className="text-base font-bold leading-none drop-shadow-sm sm:text-lg">
            #{peca.index}
          </span>
          <span className="mt-1 font-mono text-[9px] tabular-nums opacity-80 sm:text-[10px]">
            {fmtMm(peca.wReal)}
          </span>
        </>
      )}
    </div>
  );
}
