import Link from "next/link";
import { ArrowLeft, Settings } from "lucide-react";
import { prisma } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { TipologiaCard } from "@/components/wizard/tipologia-card";

export const dynamic = "force-dynamic";

export default async function WizardListPage() {
  const categorias = await prisma.categoria.findMany({
    where: { ativo: true },
    orderBy: { ordem: "asc" },
    include: {
      tipologias: {
        where: { ativo: true },
        orderBy: [{ ordem: "asc" }, { id: "asc" }],
        include: {
          variables: { select: { kind: true } },
        },
      },
    },
  });

  const ativas = categorias.filter((c) => c.tipologias.length > 0);
  const total = ativas.reduce((acc, c) => acc + c.tipologias.length, 0);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="mb-10 flex flex-col gap-3">
        <Link
          href="/admin"
          className="inline-flex w-fit items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-3" />
          voltar ao admin
        </Link>
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
            Catálogo de tipologias
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Escolha uma tipologia
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            {total > 0
              ? `${total} ${total === 1 ? "tipologia disponível" : "tipologias disponíveis"} para simular ao vivo.`
              : "Nenhuma tipologia ativa no momento."}
          </p>
        </div>
      </header>

      {/* Empty state */}
      {ativas.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border/60 bg-muted/10 p-12 text-center">
          <Settings className="size-7 text-muted-foreground/60" />
          <p className="text-sm font-medium text-muted-foreground">
            Nenhuma tipologia cadastrada
          </p>
          <p className="max-w-sm text-xs text-muted-foreground/80">
            Vá até o admin e cadastre ao menos uma tipologia ativa para começar
            a simular.
          </p>
          <Button asChild size="sm" className="mt-2">
            <Link href="/admin/tipologias/nova">Cadastrar tipologia</Link>
          </Button>
        </div>
      )}

      {/* Categorias com tipologias */}
      <div className="space-y-12">
        {ativas.map((categoria) => (
          <section key={categoria.id} className="space-y-4">
            <div className="flex items-baseline justify-between border-b border-border/40 pb-2">
              <div className="flex items-baseline gap-3">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                  {categoria.nome}
                </h2>
                <span className="font-mono text-[11px] text-muted-foreground/70">
                  {categoria.tipologias.length}{" "}
                  {categoria.tipologias.length === 1 ? "item" : "itens"}
                </span>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {categoria.tipologias.map((t) => {
                const isDinamica = t.variables.some(
                  (v) => v.kind === "COUNT"
                );
                return (
                  <TipologiaCard
                    key={t.id}
                    id={t.id}
                    nome={t.nome}
                    descricao={t.descricao}
                    imagemUrl={t.imagemUrl}
                    categoria={categoria.nome}
                    categoriaId={categoria.id}
                    isDinamica={isDinamica}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
