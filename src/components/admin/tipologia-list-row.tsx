"use client";

import Link from "next/link";
import {
  ChevronRight,
  Layers,
  Receipt,
  Sparkles,
  Variable as VariableIcon,
} from "lucide-react";

type Props = {
  id: number;
  nome: string;
  descricao: string | null;
  categoria: string;
  categoriaId: number;
  ativo: boolean;
  isDinamica: boolean;
  counts: {
    variables: number;
    pieceGroups: number;
    pricingRules: number;
  };
};

/** Cor por categoria (rotação simples para diferenciar). */
function categoriaStyle(categoriaId: number) {
  const palettes = [
    {
      stripe: "bg-blue-400",
      bg: "bg-blue-500/10",
      text: "text-blue-300",
      border: "border-blue-500/30",
    },
    {
      stripe: "bg-emerald-400",
      bg: "bg-emerald-500/10",
      text: "text-emerald-300",
      border: "border-emerald-500/30",
    },
    {
      stripe: "bg-amber-400",
      bg: "bg-amber-500/10",
      text: "text-amber-300",
      border: "border-amber-500/30",
    },
    {
      stripe: "bg-violet-400",
      bg: "bg-violet-500/10",
      text: "text-violet-300",
      border: "border-violet-500/30",
    },
    {
      stripe: "bg-rose-400",
      bg: "bg-rose-500/10",
      text: "text-rose-300",
      border: "border-rose-500/30",
    },
  ];
  return palettes[(categoriaId - 1) % palettes.length] ?? palettes[0];
}

export function TipologiaListRow({
  id,
  nome,
  descricao,
  categoria,
  categoriaId,
  ativo,
  isDinamica,
  counts,
}: Props) {
  const cat = categoriaStyle(categoriaId);

  return (
    <Link
      href={`/admin/tipologias/${id}`}
      className="group relative flex items-stretch gap-4 px-4 py-4 transition-colors hover:bg-muted/20 sm:px-6"
    >
      {/* Stripe lateral em cor da categoria */}
      <span
        className={`absolute inset-y-3 left-0 w-0.5 rounded-r-full transition-all group-hover:w-1 group-hover:inset-y-2 ${cat.stripe}`}
        aria-hidden
      />

      {/* ID em mono pequeno (mobile esconde) */}
      <div className="hidden w-12 shrink-0 items-center justify-center text-center sm:flex">
        <span className="font-mono text-xs text-muted-foreground/70">
          #{id}
        </span>
      </div>

      {/* Conteúdo principal */}
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cat.bg} ${cat.border} ${cat.text}`}
          >
            {categoria}
          </span>
          {isDinamica && (
            <span className="inline-flex items-center gap-1 rounded border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-2.5" />
              dinâmica
            </span>
          )}
          {!ativo && (
            <span className="inline-flex items-center rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              inativa
            </span>
          )}
        </div>

        <h3 className="truncate text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-lg">
          {nome}
        </h3>

        {descricao ? (
          <p className="line-clamp-1 text-sm leading-relaxed text-muted-foreground">
            {descricao}
          </p>
        ) : (
          <p className="text-sm italic text-muted-foreground/50">
            sem descrição
          </p>
        )}
      </div>

      {/* Stats inline (à direita no desktop) */}
      <div className="hidden shrink-0 items-center gap-4 self-center text-xs text-muted-foreground sm:flex">
        <Stat icon={VariableIcon} value={counts.variables} label="vars" />
        <Stat icon={Layers} value={counts.pieceGroups} label="grupos" />
        <Stat icon={Receipt} value={counts.pricingRules} label="regras" />
      </div>

      {/* Chevron */}
      <div className="flex shrink-0 items-center self-center">
        <ChevronRight className="size-4 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
    </Link>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="size-3.5 text-muted-foreground/50" />
      <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
        {value}
      </span>
      <span className="text-[11px] text-muted-foreground/70">{label}</span>
    </div>
  );
}
