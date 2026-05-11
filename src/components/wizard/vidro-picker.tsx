"use client";

import type { VidroSnapshot } from "@/lib/engine";

type Props = {
  vidros: VidroSnapshot[];
  value: number | null;
  onChange: (id: number) => void;
};

/**
 * Seletor de vidro do orçamento. Cor e espessura são intrínsecas ao vidro
 * escolhido — nunca variáveis isoladas. A lista vem da elegibilidade
 * cadastrada na tipologia.
 */
export function VidroPicker({ vidros, value, onChange }: Props) {
  if (vidros.length === 0) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300">
        Nenhum vidro elegível cadastrado para esta tipologia. Configure os
        vidros na aba <strong>Vidros</strong> do admin.
      </div>
    );
  }

  // Agrupa por cor para a UI ficar mais legível quando há muitas opções
  const porCor = new Map<string, VidroSnapshot[]>();
  for (const v of vidros) {
    const arr = porCor.get(v.corLabel) ?? [];
    arr.push(v);
    porCor.set(v.corLabel, arr);
  }

  return (
    <div className="rounded-lg border border-border/40 bg-muted/10 p-4">
      <p className="mb-3 text-sm font-semibold tracking-tight">Vidro</p>
      <div className="space-y-3">
        {Array.from(porCor.entries()).map(([cor, opcoes]) => (
          <div key={cor}>
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
              {cor}
            </p>
            <div className="flex flex-wrap gap-2">
              {opcoes.map((v) => {
                const selected = value === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => onChange(v.id)}
                    className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                      selected
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-border/40 bg-background/40 text-foreground hover:border-border/80 hover:bg-background/60"
                    }`}
                  >
                    {v.espessura} mm
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
