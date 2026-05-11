"use client";

import Link from "next/link";
import {
  AppWindow,
  ArrowRight,
  Bath,
  Boxes,
  DoorOpen,
  Layers,
  Sparkles,
} from "lucide-react";

type Props = {
  id: number;
  nome: string;
  descricao: string | null;
  imagemUrl: string | null;
  categoria: string;
  categoriaId: number;
  isDinamica: boolean;
};

type CategoryStyle = {
  // Ícone semântico da categoria
  icon: React.ComponentType<{ className?: string }>;
  // Classes Tailwind do hero (gradiente sutil em cor da categoria)
  heroBg: string;
  // Cor do ícone semântico no hero
  heroIcon: string;
  // Hairline da borda no hover
  hoverBorder: string;
  // Cor do CTA "simular →"
  cta: string;
};

const CATEGORY_PALETTES: CategoryStyle[] = [
  {
    icon: Layers,
    heroBg:
      "bg-gradient-to-br from-blue-500/15 via-blue-500/8 to-transparent",
    heroIcon: "text-blue-300/60",
    hoverBorder: "hover:border-blue-400/40",
    cta: "text-blue-300",
  },
  {
    icon: DoorOpen,
    heroBg:
      "bg-gradient-to-br from-emerald-500/15 via-emerald-500/8 to-transparent",
    heroIcon: "text-emerald-300/60",
    hoverBorder: "hover:border-emerald-400/40",
    cta: "text-emerald-300",
  },
  {
    icon: AppWindow,
    heroBg:
      "bg-gradient-to-br from-amber-500/15 via-amber-500/8 to-transparent",
    heroIcon: "text-amber-300/60",
    hoverBorder: "hover:border-amber-400/40",
    cta: "text-amber-300",
  },
  {
    icon: Bath,
    heroBg:
      "bg-gradient-to-br from-violet-500/15 via-violet-500/8 to-transparent",
    heroIcon: "text-violet-300/60",
    hoverBorder: "hover:border-violet-400/40",
    cta: "text-violet-300",
  },
  {
    icon: Boxes,
    heroBg:
      "bg-gradient-to-br from-rose-500/15 via-rose-500/8 to-transparent",
    heroIcon: "text-rose-300/60",
    hoverBorder: "hover:border-rose-400/40",
    cta: "text-rose-300",
  },
];

function categoryStyle(categoriaId: number): CategoryStyle {
  return (
    CATEGORY_PALETTES[(categoriaId - 1) % CATEGORY_PALETTES.length] ??
    CATEGORY_PALETTES[0]
  );
}

export function TipologiaCard({
  id,
  nome,
  descricao,
  imagemUrl,
  categoria,
  categoriaId,
  isDinamica,
}: Props) {
  const valid = !!imagemUrl && /^https?:\/\//.test(imagemUrl);
  const style = categoryStyle(categoriaId);
  const Icon = style.icon;

  return (
    <Link
      href={`/wizard/${id}`}
      className={`group flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card/40 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg ${style.hoverBorder}`}
    >
      {/* Hero — imagem real ou painel com ícone semântico */}
      <div className={`relative h-36 overflow-hidden ${style.heroBg}`}>
        {valid ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagemUrl!}
            alt={nome}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <>
            {/* Texto decorativo de fundo (categoria em uppercase grande, baixíssima opacidade) */}
            <span
              className="pointer-events-none absolute -bottom-4 -right-2 select-none text-7xl font-black uppercase tracking-tighter text-foreground/[0.04]"
              aria-hidden
            >
              {categoria}
            </span>
            {/* Ícone semântico centralizado */}
            <div className="flex h-full items-center justify-center">
              <Icon
                className={`size-14 transition-transform duration-300 group-hover:scale-110 ${style.heroIcon}`}
              />
            </div>
          </>
        )}

        {/* Badge dinâmica flutuante */}
        {isDinamica && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md border border-primary/30 bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary backdrop-blur">
            <Sparkles className="size-3" />
            dinâmica
          </span>
        )}
      </div>

      {/* Conteúdo */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="text-base font-semibold tracking-tight text-foreground transition-colors group-hover:text-foreground">
          {nome}
        </h3>
        {descricao && (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {descricao}
          </p>
        )}
        <div className="mt-auto flex items-center justify-end pt-2">
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide ${style.cta} opacity-0 transition-opacity group-hover:opacity-100`}
          >
            simular
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
