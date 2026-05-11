"use client";

import { AlertTriangle, WifiOff } from "lucide-react";
import type { ValidationIssue } from "@/lib/engine";
import { translateIssue } from "@/lib/error-messages";

type Props = {
  /** Estado de erro de cálculo (422). Se vazio/null e `network=false`, renderiza nulo. */
  issues: ValidationIssue[] | null;
  /** Estado de erro de rede (offline / fetch falhou). */
  network?: boolean;
  /** Tipologia inválida — 3 falhas consecutivas com mesmo code. */
  invalidTipologia?: boolean;
};

export function ErrorCard({ issues, network, invalidTipologia }: Props) {
  if (network) {
    return (
      <div
        className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"
        role="status"
        aria-live="polite"
      >
        <WifiOff className="mt-0.5 size-5 shrink-0 text-amber-400" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-amber-300">
            Sem conexão com o servidor
          </p>
          <p className="text-xs leading-relaxed text-amber-200/80">
            Tentando novamente em alguns instantes…
          </p>
        </div>
      </div>
    );
  }

  if (invalidTipologia) {
    return (
      <div
        className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4"
        role="alert"
        aria-live="assertive"
      >
        <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-400" />
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-rose-300">
            Esta tipologia tem um problema de configuração
          </p>
          <p className="text-xs leading-relaxed text-rose-200/80">
            Volte e escolha outra. Avise o administrador para revisar o cadastro.
          </p>
        </div>
      </div>
    );
  }

  if (!issues || issues.length === 0) return null;

  const main = issues[0];
  const message = translateIssue(main);

  return (
    <div
      className="flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4"
      role="alert"
      aria-live="polite"
    >
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-400" />
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold text-rose-300">
          Não consegui calcular essa configuração
        </p>
        <p className="text-xs leading-relaxed text-rose-200/90">{message}</p>
      </div>
    </div>
  );
}
