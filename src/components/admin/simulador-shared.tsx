"use client";

import type {
  CalcOutput,
  Lookups,
  PricingComponentKind,
  TipologiaMedidaSnapshot,
  TipologiaSnapshot,
  TipologiaVaoSnapshot,
  VariableValue,
  VidroSnapshot,
} from "@/lib/engine";

/**
 * Lookups client-side a partir do catálogo de vidros elegíveis da tipologia
 * (preço/m² já é intrínseco ao vidro). Em produção, o motor real usa
 * `loadLookups()` no servidor; aqui basta os preços que já vêm no snapshot.
 */
export function clientLookups(vidros: VidroSnapshot[]): Lookups {
  const precoVidroById = new Map(vidros.map((v) => [v.id, v.precoM2]));
  const PRECO_TORRE: Record<string, number> = {
    "20": 320,
    "30": 420,
    "40": 560,
  };
  return {
    precoVidro: (vidroId) => {
      const v = precoVidroById.get(Number(vidroId));
      // Sem fallback silencioso: se o usuário ainda não selecionou um vidro
      // o motor verá precoVidro retornando 0 e a UI mostrará VIDRO_M2 = 0.
      return v ?? 0;
    },
    precoTorre: (modelo) => PRECO_TORRE[String(modelo)] ?? 0,
  };
}

const KIND_STYLES: Record<
  PricingComponentKind,
  { bg: string; text: string; border: string }
> = {
  VIDRO: { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30" },
  FERRAGEM: { bg: "bg-amber-500/15", text: "text-amber-400", border: "border-amber-500/30" },
  INSTALACAO: { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  MAO_OBRA: { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30" },
  BENEFICIAMENTO: { bg: "bg-cyan-500/15", text: "text-cyan-400", border: "border-cyan-500/30" },
  OUTRO: { bg: "bg-zinc-500/15", text: "text-zinc-400", border: "border-zinc-500/30" },
};

const KIND_LABEL: Record<PricingComponentKind, string> = {
  VIDRO: "VIDRO",
  FERRAGEM: "FERRAGEM",
  INSTALACAO: "INSTALAÇÃO",
  MAO_OBRA: "MÃO OBRA",
  BENEFICIAMENTO: "BENEFIC.",
  OUTRO: "OUTRO",
};

export function KindBadge({ kind }: { kind: PricingComponentKind }) {
  const s = KIND_STYLES[kind];
  return (
    <span
      className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide border ${s.bg} ${s.text} ${s.border}`}
    >
      {KIND_LABEL[kind]}
    </span>
  );
}

export function fmtBRL(n: number): string {
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Painel "trace" do cálculo: mostra variáveis de entrada, ComputedValues na
 * ordem de execução e as fórmulas resolvidas peça-a-peça. Reconstitui a
 * sequência cruzando o snapshot com o output (sem instrumentar o motor).
 */
export function TracePanel({
  snapshot,
  inputs,
  output,
}: {
  snapshot: TipologiaSnapshot | null;
  /** Em modo VAO: o map flat. Em MEDIDA: variáveis-orcamento. */
  inputs: Record<string, VariableValue>;
  output: CalcOutput | null;
}) {
  if (!snapshot || !output) return null;

  return (
    <details className="rounded-xl border border-border/60 bg-card shadow-sm" open>
      <summary className="cursor-pointer select-none border-b border-border/60 px-4 py-3 text-sm font-semibold">
        Trace do cálculo
      </summary>
      <div className="space-y-3 px-4 py-3 text-xs">
        {snapshot.modo === "VAO" ? (
          <TraceVao snapshot={snapshot} inputs={inputs} output={output} />
        ) : (
          <TraceMedida snapshot={snapshot} inputs={inputs} output={output} />
        )}
      </div>
    </details>
  );
}

function TraceVao({
  snapshot,
  inputs,
  output,
}: {
  snapshot: TipologiaVaoSnapshot;
  inputs: Record<string, VariableValue>;
  output: CalcOutput;
}) {
  const calc = output.variaveisCalculadas;
  const inputVars = snapshot.variables.filter(
    (v) => v.codigo in inputs || v.defaultValue
  );
  const cvVao = snapshot.computedValues
    .filter((c) => c.scope === "VAO")
    .sort((a, b) => a.orderInScope - b.orderInScope);

  return (
    <>
      <TraceSection title="1. Variáveis de entrada">
        {inputVars.map((v) => (
          <TraceLine
            key={v.codigo}
            name={v.codigo}
            value={fmtVal(inputs[v.codigo] ?? calc[v.codigo] ?? "—")}
            unit={v.unit ?? undefined}
          />
        ))}
      </TraceSection>

      {cvVao.length > 0 && (
        <TraceSection title="2. Cálculos auxiliares (Vão)">
          {cvVao.map((cv) => (
            <TraceLine
              key={cv.codigo}
              name={cv.codigo}
              expr={cv.expression}
              value={fmtNum(calc[cv.codigo])}
            />
          ))}
        </TraceSection>
      )}

      <TraceSection title={`3. Peças (${output.pecas.length})`}>
        {output.pecas.map((p) => {
          const grupo = snapshot.pieceGroups.find((g) => g.codigo === p.groupCode);
          const role = grupo?.pieceRoles.find((r) => r.codigo === p.roleCode);
          return (
            <div
              key={`${p.groupCode}-${p.index}`}
              className="rounded-md border border-border/40 bg-background/30 p-2"
            >
              <p className="mb-1 font-mono text-[11px] font-semibold">
                #{p.index} · {p.groupCode} → {p.roleCode}
              </p>
              {role && (
                <>
                  <TraceLine
                    name="largura"
                    expr={role.widthExpression}
                    value={`${p.wReal} mm`}
                    sub={`(cobrança: ${p.wCobranca} mm)`}
                  />
                  <TraceLine
                    name="altura"
                    expr={role.heightExpression}
                    value={`${p.hReal} mm`}
                    sub={`(cobrança: ${p.hCobranca} mm)`}
                  />
                </>
              )}
            </div>
          );
        })}
      </TraceSection>

      <PricingTrace snapshot={snapshot} output={output} />
    </>
  );
}

function TraceMedida({
  snapshot,
  inputs,
  output,
}: {
  snapshot: TipologiaMedidaSnapshot;
  inputs: Record<string, VariableValue>;
  output: CalcOutput;
}) {
  const orcamentoVars = snapshot.variables.filter((v) => v.nivel === "ORCAMENTO");
  const pecaVars = snapshot.variables.filter((v) => v.nivel === "PECA");
  const cvOrcPeca = snapshot.computedValues
    .filter((c) => c.scope === "ORCAMENTO_PECA")
    .sort((a, b) => a.orderInScope - b.orderInScope);

  return (
    <>
      <TraceSection title="1. Variáveis do orçamento">
        {orcamentoVars.map((v) => (
          <TraceLine
            key={v.codigo}
            name={v.codigo}
            value={fmtVal(inputs[v.codigo] ?? "—")}
            unit={v.unit ?? undefined}
          />
        ))}
      </TraceSection>

      {output.pecas.map((p) => (
        <TraceSection
          key={p.index}
          title={`2.${p.index} ${p.identificacao ?? `Peça ${p.index}`}`}
        >
          {pecaVars.map((v) => (
            <TraceLine
              key={v.codigo}
              name={v.codigo}
              value={fmtVal(p.variables[v.codigo] ?? "—")}
              unit={v.unit ?? undefined}
            />
          ))}
          {cvOrcPeca.length > 0 && (
            <div className="mt-1 border-t border-border/30 pt-1">
              {cvOrcPeca.map((cv) => {
                const v = p.variables[cv.codigo];
                return (
                  <TraceLine
                    key={cv.codigo}
                    name={cv.codigo}
                    expr={cv.expression}
                    value={typeof v === "number" ? fmtNum(v) : "—"}
                  />
                );
              })}
            </div>
          )}
          {p.especificacoes.length > 0 && (
            <div className="mt-1 border-t border-border/30 pt-1">
              {p.especificacoes.map((spec, i) => (
                <div key={i}>
                  <p className="font-mono text-[10px] font-semibold text-cyan-400">
                    spec: {spec.tipo}
                  </p>
                  {Object.entries(spec.atributos).map(([k, v]) => (
                    <TraceLine key={k} name={k} value={fmtVal(v)} />
                  ))}
                </div>
              ))}
            </div>
          )}
          <TraceLine
            name="dimensões"
            value={`${p.wReal} × ${p.hReal} mm`}
            sub={`(cobrança: ${p.wCobranca} × ${p.hCobranca})`}
          />
        </TraceSection>
      ))}

      <PricingTrace snapshot={snapshot} output={output} />
    </>
  );
}

function PricingTrace({
  snapshot,
  output,
}: {
  snapshot: TipologiaSnapshot;
  output: CalcOutput;
}) {
  const rules = [...snapshot.pricingRules].sort((a, b) => a.ordem - b.ordem);
  if (rules.length === 0) return null;

  // Mapa rule.codigo → valor (do breakdown). Se ausente, foi pulada.
  const valorPorRule = new Map(
    output.preco.breakdown.map((b) => [b.ruleCode, b.valor])
  );

  const stepNum = snapshot.modo === "VAO" ? 4 : 3;

  return (
    <TraceSection title={`${stepNum}. Cobrança (${rules.length} regras)`}>
      {rules.map((r) => {
        const aplicada = valorPorRule.has(r.codigo);
        const valor = valorPorRule.get(r.codigo);
        const motivo = !r.ativo
          ? "regra desativada"
          : !aplicada
            ? r.condition
              ? "condição falsa"
              : "—"
            : null;

        return (
          <div
            key={r.codigo}
            className={`rounded-md border p-2 ${
              aplicada
                ? "border-border/40 bg-background/30"
                : "border-border/30 bg-background/20 opacity-60"
            }`}
          >
            <div className="mb-1 flex items-baseline gap-2">
              <span className="font-mono text-[11px] font-semibold">
                {r.codigo}
              </span>
              <span className="rounded bg-muted/60 px-1 text-[9px] uppercase tracking-wide text-muted-foreground">
                {r.componentKind}
              </span>
              <span className="text-[10px] text-muted-foreground/80">
                {r.basis} · {r.appliesTo}
                {r.appliesToValue ? ` (${r.appliesToValue})` : ""}
              </span>
              {aplicada ? (
                <span className="ml-auto shrink-0 font-mono text-[11px] font-semibold tabular-nums text-foreground">
                  R$ {fmtBRL(valor ?? 0)}
                </span>
              ) : (
                <span className="ml-auto shrink-0 text-[10px] italic text-muted-foreground">
                  pulada · {motivo}
                </span>
              )}
            </div>
            {r.condition && (
              <TraceLine
                name="quando"
                expr={r.condition}
                value={aplicada ? "✓" : "✗"}
              />
            )}
            <TraceLine
              name="fórmula"
              expr={r.expression}
              value={aplicada ? `R$ ${fmtBRL(valor ?? 0)}` : "—"}
            />
          </div>
        );
      })}
      <div className="mt-2 flex items-baseline justify-between border-t border-border/40 pt-2 font-mono text-[11px] font-semibold">
        <span>Total</span>
        <span className="tabular-nums text-foreground">
          R$ {fmtBRL(output.preco.total)}
        </span>
      </div>
    </TraceSection>
  );
}

function TraceSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function TraceLine({
  name,
  expr,
  value,
  unit,
  sub,
}: {
  name: string;
  expr?: string;
  value: string;
  unit?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-baseline gap-2 font-mono text-[11px]">
      <span className="shrink-0 font-semibold text-foreground/90">{name}</span>
      {expr && (
        <span className="truncate text-muted-foreground/80" title={expr}>
          = {expr}
        </span>
      )}
      <span className="ml-auto shrink-0 tabular-nums text-foreground">
        {value}
        {unit ? ` ${unit}` : ""}
      </span>
      {sub && <span className="text-[10px] text-muted-foreground/70">{sub}</span>}
    </div>
  );
}

function fmtNum(n: unknown): string {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(4).replace(/\.?0+$/, "");
}

function fmtVal(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "boolean") return v ? "sim" : "não";
  if (typeof v === "number") return fmtNum(v);
  return String(v);
}

export function BreakdownPanel({
  output,
  error,
}: {
  output: CalcOutput | null;
  error: string | null;
}) {
  if (error) {
    return (
      <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
        {error}
      </div>
    );
  }
  if (!output) return null;

  return (
    <div className="rounded-xl border border-border/60 bg-card shadow-sm">
      <div className="border-b border-border/60 px-4 py-3">
        <h3 className="text-sm font-semibold text-foreground">
          Breakdown calculado
        </h3>
        <p className="text-[11px] text-muted-foreground/80">
          apenas administrador vê os componentes
        </p>
      </div>
      <div className="px-4 py-4 space-y-1">
        {output.preco.breakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground/80">sem regras ativas</p>
        ) : (
          output.preco.breakdown.map((b) => {
            const kind = b.kind as PricingComponentKind;
            return (
              <div
                key={b.ruleCode}
                className="flex items-start justify-between gap-3 py-2"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <KindBadge kind={kind} />
                  <p className="text-sm font-medium text-foreground leading-tight">
                    {b.ruleCode}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold text-foreground tabular-nums">
                  R$&nbsp;{fmtBRL(b.valor)}
                </span>
              </div>
            );
          })
        )}
        {output.preco.breakdown.length > 0 && (
          <div className="border-t border-border/60 pt-3 mt-1">
            <div className="flex items-end justify-between">
              <span className="text-sm text-muted-foreground">
                Total ao vidraceiro
              </span>
              <p className="text-2xl font-bold text-foreground leading-none tabular-nums">
                R$&nbsp;{fmtBRL(output.preco.total)}
              </p>
            </div>
          </div>
        )}
        <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2">
          <p className="text-[11px] text-amber-300 leading-relaxed">
            O vendedor vê só o <strong>total</strong> e a área. Os componentes
            da cobrança ficam ocultos.
          </p>
        </div>
      </div>
    </div>
  );
}
