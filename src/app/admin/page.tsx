import Link from "next/link";
import {
  Boxes,
  Layers,
  Plus,
  Receipt,
  Variable as VariableIcon,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { TipologiaListRow } from "@/components/admin/tipologia-list-row";

export const dynamic = "force-dynamic";

export default async function AdminListPage() {
  const tipologias = await prisma.tipologia.findMany({
    include: {
      categoria: { select: { id: true, nome: true } },
      variables: { select: { kind: true } },
      _count: {
        select: { variables: true, pieceGroups: true, pricingRules: true },
      },
    },
    orderBy: [{ ordem: "asc" }, { id: "asc" }],
  });

  const total = tipologias.length;
  const ativas = tipologias.filter((t) => t.ativo).length;
  const totalVars = tipologias.reduce((acc, t) => acc + t._count.variables, 0);
  const totalGrupos = tipologias.reduce(
    (acc, t) => acc + t._count.pieceGroups,
    0
  );
  const totalRegras = tipologias.reduce(
    (acc, t) => acc + t._count.pricingRules,
    0
  );

  // Distribuição por categoria
  const porCategoria = new Map<string, number>();
  for (const t of tipologias) {
    const nome = t.categoria?.nome ?? "(sem categoria)";
    porCategoria.set(nome, (porCategoria.get(nome) ?? 0) + 1);
  }
  const categoriasResumo = Array.from(porCategoria.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <div className="space-y-8">
      {/* Hero header */}
      <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            Catálogo
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Tipologias
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            {total === 0
              ? "Nenhuma tipologia cadastrada ainda. Comece criando a primeira."
              : `${total} ${total === 1 ? "tipologia" : "tipologias"} no catálogo${
                  ativas !== total
                    ? ` · ${ativas} ${ativas === 1 ? "ativa" : "ativas"}`
                    : ""
                }.`}
          </p>
        </div>

        <Button asChild size="lg" className="self-start lg:self-auto">
          <Link href="/admin/tipologias/nova">
            <Plus className="mr-1 size-4" />
            Nova tipologia
          </Link>
        </Button>
      </header>

      {/* Stats panel */}
      {total > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            icon={Boxes}
            label="Tipologias"
            value={total}
            accent="text-primary"
          />
          <StatCard
            icon={VariableIcon}
            label="Variáveis"
            value={totalVars}
            accent="text-blue-300"
          />
          <StatCard
            icon={Layers}
            label="Grupos de peças"
            value={totalGrupos}
            accent="text-emerald-300"
          />
          <StatCard
            icon={Receipt}
            label="Regras de preço"
            value={totalRegras}
            accent="text-amber-300"
          />
        </div>
      )}

      {/* Lista */}
      {total === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/10 p-16 text-center">
          <Boxes className="size-8 text-muted-foreground/50" />
          <p className="text-base font-semibold text-muted-foreground">
            Nenhuma tipologia ainda
          </p>
          <p className="max-w-sm text-xs text-muted-foreground/80">
            Cadastre a primeira tipologia para que o vendedor possa começar a
            cotar no wizard.
          </p>
          <Button asChild size="sm" className="mt-2">
            <Link href="/admin/tipologias/nova">
              <Plus className="mr-1 size-4" />
              Cadastrar tipologia
            </Link>
          </Button>
        </div>
      ) : (
        <section className="space-y-3">
          {/* Toolbar acima da lista */}
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Catálogo · {total}
            </p>
            {categoriasResumo.length > 1 && (
              <div className="hidden items-center gap-1.5 text-[11px] text-muted-foreground sm:flex">
                {categoriasResumo.map(([nome, count], idx) => (
                  <span key={nome} className="inline-flex items-center gap-1">
                    {idx > 0 && (
                      <span className="text-muted-foreground/40">·</span>
                    )}
                    <span>{nome}</span>
                    <span className="font-mono font-semibold text-foreground">
                      {count}
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* List view num único container */}
          <div className="overflow-hidden rounded-xl border border-border/60 bg-card/30 shadow-sm">
            <ul className="divide-y divide-border/40">
              {tipologias.map((t) => {
                const isDinamica = t.variables.some(
                  (v) => v.kind === "COUNT"
                );
                return (
                  <li key={t.id}>
                    <TipologiaListRow
                      id={t.id}
                      nome={t.nome}
                      descricao={t.descricao}
                      categoria={t.categoria?.nome ?? "sem categoria"}
                      categoriaId={t.categoria?.id ?? 0}
                      ativo={t.ativo}
                      isDinamica={isDinamica}
                      counts={t._count}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/40 p-4">
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 ${accent}`}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="font-mono text-2xl font-bold leading-none tabular-nums">
          {value}
        </p>
      </div>
    </div>
  );
}
