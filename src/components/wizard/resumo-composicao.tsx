"use client";

import { useMemo } from "react";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  PecaCalculada,
  PieceGroupSnapshot,
} from "@/lib/engine";
import { roleColor } from "@/lib/colors";

type Props = {
  pecas: PecaCalculada[];
  pieceGroups: PieceGroupSnapshot[];
  totais: {
    areaCobrancaM2: number;
    quantidadePecas: number;
  };
  total: number;
  /** Mantém valores quando estiver em estado stale (mas não esconde). */
  stale?: boolean;
};

function fmtBRL(n: number): string {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtArea(n: number): string {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function ResumoComposicao({
  pecas,
  pieceGroups,
  totais,
  total,
  stale,
}: Props) {
  const groupCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of pecas) {
      if (!p.groupCode) continue;
      counts.set(p.groupCode, (counts.get(p.groupCode) ?? 0) + 1);
    }
    const ordered = [...pieceGroups].sort(
      (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)
    );
    return ordered
      .map((g) => ({
        codigo: g.codigo,
        label: g.label || g.codigo,
        count: counts.get(g.codigo) ?? 0,
      }))
      .filter((g) => g.count > 0);
  }, [pecas, pieceGroups]);

  const roleBreakdown = useMemo(() => {
    const counts = new Map<string, { count: number; label: string }>();
    for (const g of pieceGroups) {
      for (const r of g.pieceRoles) {
        if (!counts.has(r.codigo)) {
          counts.set(r.codigo, { count: 0, label: r.label || r.codigo });
        }
      }
    }
    for (const p of pecas) {
      const role = p.roleCode;
      if (!role) continue;
      const entry = counts.get(role);
      if (entry) entry.count += 1;
      else counts.set(role, { count: 1, label: role });
    }
    return Array.from(counts.entries())
      .map(([codigo, v]) => ({ codigo, label: v.label, count: v.count }))
      .filter((r) => r.count > 0)
      .sort((a, b) => a.codigo.localeCompare(b.codigo));
  }, [pecas, pieceGroups]);

  return (
    <div
      className={`space-y-3 transition-opacity ${stale ? "opacity-60" : ""}`}
    >
      <div className="rounded-xl border border-border/60 bg-card/40 p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold tracking-tight">
          Resumo da composição
        </h3>

        {/* Métricas em cards */}
        <div className="grid grid-cols-2 gap-2">
          {groupCounts.length > 0 ? (
            groupCounts.map((g) => (
              <MetricCard
                key={g.codigo}
                label={g.label}
                value={g.count.toString()}
              />
            ))
          ) : (
            <MetricCard
              label="Peças"
              value={totais.quantidadePecas.toString()}
            />
          )}
          <MetricCard
            label="Área de cobrança"
            value={`${fmtArea(totais.areaCobrancaM2)} m²`}
            tooltip="Área arredondada para múltiplos de 50mm — é o que você paga pelo vidro."
          />
        </div>

        {/* Breakdown por papel */}
        {roleBreakdown.length > 0 && (
          <ul className="mt-3 space-y-1.5 border-t border-border/40 pt-3">
            {roleBreakdown.map((r) => {
              const c = roleColor(r.codigo);
              return (
                <li
                  key={r.codigo}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className={`size-2 shrink-0 rounded-full ${c.dot}`} />
                  <span className="flex-1 truncate text-muted-foreground">
                    {r.label}
                  </span>
                  <span className="font-mono tabular-nums text-foreground">
                    {r.count}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Total destacado */}
      <div className="rounded-xl border border-border/60 bg-card/40 p-4 shadow-sm">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Total estimado
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl">
          R$ <span className="text-primary">{fmtBRL(total)}</span>
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/80">
          estimativa preliminar — sujeita a confirmação
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  tooltip,
}: {
  label: string;
  value: string;
  tooltip?: string;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/10 p-3">
      <div className="flex items-center gap-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {tooltip && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="text-muted-foreground/70 hover:text-foreground"
                  aria-label="mais informações"
                >
                  <Info className="size-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}
