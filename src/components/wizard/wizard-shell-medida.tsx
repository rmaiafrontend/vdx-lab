"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Copy, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  TipologiaMedidaSnapshot,
  VariableSnapshot,
  VariableValue,
} from "@/lib/engine";
import { ErrorCard } from "./error-card";
import { useWizardCalcMedida } from "./use-wizard-calc";
import { VariableInput } from "./variable-input";
import { VidroPicker } from "./vidro-picker";

type Props = {
  snapshot: TipologiaMedidaSnapshot;
  categoria: string;
};

export function WizardShellMedida({ snapshot, categoria }: Props) {
  const calc = useWizardCalcMedida(snapshot);

  const orcamentoVars = snapshot.variables.filter(
    (v) => v.nivel === "ORCAMENTO"
  );
  const pecaVars = snapshot.variables.filter((v) => v.nivel === "PECA");

  const display = calc.result ?? calc.lastValid;
  const isStale = calc.status === "error" && !!calc.lastValid;
  const showErrorCard =
    (calc.status === "error" && !calc.lastValid) ||
    calc.status === "network-error" ||
    calc.invalidTipologia;

  return (
    <main className="min-h-screen pb-32 sm:pb-8">
      <header className="border-b border-border/40 bg-card/30 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Button
            asChild
            size="icon"
            variant="ghost"
            className="size-9 shrink-0"
          >
            <Link href="/wizard" aria-label="Voltar">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {categoria}
            </p>
            <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
              {snapshot.nome}
            </h1>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-cyan-500/30 bg-cyan-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
            ficha de obra
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {/* Coluna principal: orçamento + lista de peças */}
          <section className="order-2 space-y-4 md:order-1">
            <VidroPicker
              vidros={snapshot.vidrosElegiveis}
              value={calc.vidroId}
              onChange={calc.setVidroId}
            />

            {/* Variáveis do orçamento */}
            {orcamentoVars.length > 0 && (
              <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4 shadow-sm">
                <h3 className="text-sm font-semibold tracking-tight">
                  Configuração do orçamento
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {orcamentoVars.map((v) => (
                    <VariableInput
                      key={v.codigo}
                      variable={v}
                      value={calc.variaveisOrcamento[v.codigo] ?? fallback(v)}
                      onChange={(val) => calc.setOrcamentoVar(v.codigo, val)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Lista de peças */}
            <div className="space-y-3 rounded-xl border border-border/60 bg-card/40 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-tight">
                  Peças ({calc.pecas.length})
                </h3>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={calc.addPeca}
                  className="h-8"
                >
                  <Plus className="mr-1 size-3.5" />
                  Adicionar peça
                </Button>
              </div>

              {calc.pecas.map((p, i) => (
                <div
                  key={i}
                  className="space-y-3 rounded-lg border border-border/40 bg-background/40 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      value={p.identificacao}
                      onChange={(e) =>
                        calc.patchPeca(i, { identificacao: e.target.value })
                      }
                      placeholder={`Peça ${i + 1}`}
                      className="h-8 flex-1 text-sm font-medium"
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => calc.duplicarPeca(i)}
                      className="size-8"
                    >
                      <Copy className="size-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => calc.removePeca(i)}
                      className="size-8 text-rose-400/70 hover:bg-rose-500/10 hover:text-rose-400"
                      disabled={calc.pecas.length <= 1}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {pecaVars.map((v) => (
                      <VariableInput
                        key={v.codigo}
                        variable={v}
                        value={p.variables[v.codigo] ?? fallback(v)}
                        onChange={(val) =>
                          calc.patchPeca(i, {
                            variables: { ...p.variables, [v.codigo]: val },
                          })
                        }
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Coluna lateral: resumo */}
          <section className="order-1 space-y-3 md:order-2 md:sticky md:top-4 md:self-start">
            {showErrorCard ? (
              <ErrorCard
                issues={calc.errors}
                network={calc.status === "network-error"}
                invalidTipologia={calc.invalidTipologia}
              />
            ) : (
              <ResumoMedida
                pecas={display?.pecas ?? []}
                quantidade={display?.totais.quantidadePecas ?? 0}
                area={display?.totais.areaCobrancaM2 ?? 0}
                total={display?.preco.total ?? 0}
                stale={isStale}
              />
            )}

            {calc.status === "error" &&
              calc.lastValid &&
              calc.errors &&
              calc.errors.length > 0 && <ErrorCard issues={calc.errors} />}
          </section>
        </div>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-10 border-t border-border/40 bg-card/80 backdrop-blur sm:relative sm:mt-8 sm:border-t-0 sm:bg-transparent sm:backdrop-blur-none">
        <div
          className="mx-auto flex max-w-6xl items-center justify-end gap-3 px-4 py-3 sm:px-6 lg:px-8"
          style={{
            paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))",
          }}
        >
          <Button asChild size="lg" className="min-h-11">
            <Link href={`/wizard/${snapshot.id}/proxima-etapa`}>
              Continuar
              <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>
      </footer>
    </main>
  );
}

function fallback(v: VariableSnapshot): VariableValue {
  if (v.kind === "BOOLEAN") return false;
  if (v.kind === "OPTION_LIST") return v.options?.[0]?.codigo ?? "";
  return 0;
}

function ResumoMedida({
  pecas,
  quantidade,
  area,
  total,
  stale,
}: {
  pecas: { identificacao: string | null; wReal: number; hReal: number }[];
  quantidade: number;
  area: number;
  total: number;
  stale: boolean;
}) {
  const fmtBRL = (n: number) =>
    n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtArea = (n: number) =>
    n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className={`space-y-3 transition-opacity ${stale ? "opacity-60" : ""}`}>
      <div className="rounded-xl border border-border/60 bg-card/40 p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold tracking-tight">
          Resumo do orçamento
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-border/40 bg-muted/10 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Peças
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums">{quantidade}</p>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/10 p-3">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Área de cobrança
            </p>
            <p className="mt-1 text-xl font-bold tabular-nums">
              {fmtArea(area)} m²
            </p>
          </div>
        </div>

        {pecas.length > 0 && (
          <ul className="mt-3 max-h-60 space-y-1 overflow-y-auto border-t border-border/40 pt-3 text-xs">
            {pecas.map((p, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-md bg-background/40 px-2 py-1"
              >
                <span className="truncate text-foreground/90">
                  {p.identificacao || `Peça ${i + 1}`}
                </span>
                <span className="font-mono text-muted-foreground">
                  {p.wReal} × {p.hReal}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 p-4 shadow-sm">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Total estimado
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">
          R$ <span className="text-primary">{fmtBRL(total)}</span>
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/80">
          estimativa preliminar — sujeita a confirmação
        </p>
      </div>
    </div>
  );
}
