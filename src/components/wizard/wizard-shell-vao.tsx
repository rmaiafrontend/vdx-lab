"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { TipologiaVaoSnapshot, VariableValue } from "@/lib/engine";
import { buildEmbedVars, getRenderConfig } from "@/lib/render-mapping";
import { AdvancedSection } from "./advanced-section";
import { Diagrama } from "./diagrama";
import { ErrorCard } from "./error-card";
import { ResumoComposicao } from "./resumo-composicao";
import { TipologiaRender } from "./tipologia-render";
import { useWizardCalcVao, type CalcInputs } from "./use-wizard-calc";
import { VariableInput } from "./variable-input";
import { VidroPicker } from "./vidro-picker";
import { parseBool } from "./wizard-units";

type Props = {
  snapshot: TipologiaVaoSnapshot;
  categoria: string;
  isDinamica: boolean;
};

export function WizardShellVao({ snapshot, categoria, isDinamica }: Props) {
  const calc = useWizardCalcVao(snapshot);
  const searchParams = useSearchParams();
  const deepLinkAppliedRef = useRef(false);

  // Deep link: aplica query params no mount
  useEffect(() => {
    if (deepLinkAppliedRef.current) return;
    deepLinkAppliedRef.current = true;
    const overrides: CalcInputs = {};
    for (const v of snapshot.variables) {
      const raw = searchParams.get(v.codigo);
      if (raw === null) continue;
      if (v.kind === "BOOLEAN") {
        const b = parseBool(raw);
        if (b !== null) overrides[v.codigo] = b;
      } else if (v.kind === "OPTION_LIST") {
        overrides[v.codigo] = raw;
      } else {
        const n = Number(raw.replace(",", "."));
        if (Number.isFinite(n)) overrides[v.codigo] = n;
      }
    }
    if (Object.keys(overrides).length > 0) {
      calc.setMultipleInputs(overrides);
    }
  }, [searchParams, snapshot.variables, calc]);

  // Ordenação: COUNT → DIMENSION → OPTION_LIST → Avançado
  const grouped = useMemo(() => {
    const sorted = [...snapshot.variables].sort(
      (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)
    );
    return {
      counts: sorted.filter((v) => v.kind === "COUNT"),
      dimensions: sorted.filter((v) => v.kind === "DIMENSION"),
      options: sorted.filter((v) => v.kind === "OPTION_LIST"),
      advanced: sorted.filter(
        (v) => v.kind === "BOOLEAN" || v.kind === "TECHNICAL_PARAM"
      ),
    };
  }, [snapshot.variables]);

  const display = calc.result ?? calc.lastValid;
  const isStale = calc.status === "error" && !!calc.lastValid;
  const isLoading = calc.status === "loading" || calc.status === "idle";
  const showErrorCard =
    (calc.status === "error" && !calc.lastValid) ||
    calc.status === "network-error" ||
    calc.invalidTipologia;

  const renderConfig = useMemo(() => getRenderConfig(snapshot), [snapshot]);
  const embedVars = useMemo(
    () => (renderConfig ? buildEmbedVars(renderConfig, calc.inputs) : null),
    [renderConfig, calc.inputs]
  );

  const fallbackFor = (v: { kind: string }): VariableValue => {
    if (v.kind === "BOOLEAN") return false;
    if (v.kind === "OPTION_LIST") return "";
    return 0;
  };

  return (
    <main className="min-h-screen pb-32 sm:pb-8">
      <header className="border-b border-border/40 bg-card/30 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Button
            asChild
            size="icon"
            variant="ghost"
            className="size-9 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <Link href="/wizard" aria-label="Voltar para a lista">
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
          {isDinamica && (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-primary/30 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3" />
              dinâmica
            </span>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <section className="order-2 space-y-3 md:order-1">
            {grouped.counts.map((v) => (
              <VariableInput
                key={v.codigo}
                variable={v}
                value={calc.inputs[v.codigo] ?? fallbackFor(v)}
                onChange={(val) => calc.setInput(v.codigo, val)}
              />
            ))}

            {grouped.dimensions.map((v) => (
              <VariableInput
                key={v.codigo}
                variable={v}
                value={calc.inputs[v.codigo] ?? fallbackFor(v)}
                onChange={(val) => calc.setInput(v.codigo, val)}
              />
            ))}

            {grouped.options.map((v) => (
              <VariableInput
                key={v.codigo}
                variable={v}
                value={calc.inputs[v.codigo] ?? fallbackFor(v)}
                onChange={(val) => calc.setInput(v.codigo, val)}
              />
            ))}

            <VidroPicker
              vidros={snapshot.vidrosElegiveis}
              value={calc.vidroId}
              onChange={calc.setVidroId}
            />

            <AdvancedSection count={grouped.advanced.length}>
              {grouped.advanced.map((v) => (
                <VariableInput
                  key={v.codigo}
                  variable={v}
                  value={calc.inputs[v.codigo] ?? fallbackFor(v)}
                  onChange={(val) => calc.setInput(v.codigo, val)}
                />
              ))}
            </AdvancedSection>

            {grouped.counts.length === 0 &&
              grouped.dimensions.length === 0 &&
              grouped.options.length === 0 &&
              grouped.advanced.length === 0 && (
                <p className="rounded-md border border-dashed border-border/60 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                  esta tipologia não tem variáveis cadastradas
                </p>
              )}
          </section>

          <section className="order-1 flex flex-col gap-3 md:order-2 md:sticky md:top-4 md:h-[calc(100vh-2rem)] md:self-start">
            {showErrorCard ? (
              <ErrorCard
                issues={calc.errors}
                network={calc.status === "network-error"}
                invalidTipologia={calc.invalidTipologia}
              />
            ) : renderConfig && embedVars ? (
              <TipologiaRender
                renderKey={renderConfig.renderKey}
                vars={embedVars}
                fillHeight
              />
            ) : (
              <Diagrama
                pecas={display?.pecas ?? []}
                pieceGroups={snapshot.pieceGroups}
                loading={isLoading}
                stale={isStale}
              />
            )}

            {display && !calc.invalidTipologia && (
              <ResumoComposicao
                pecas={display.pecas}
                pieceGroups={snapshot.pieceGroups}
                totais={display.totais}
                total={display.preco.total}
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
