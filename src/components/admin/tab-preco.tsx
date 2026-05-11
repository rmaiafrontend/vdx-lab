"use client";

import {
  ArrowDown,
  ArrowUp,
  ClipboardList,
  Cog,
  Drill,
  Hammer,
  HardHat,
  Package,
  Plus,
  Receipt,
  Square,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  blankPricingRule,
  moveItem,
  patchItem,
  removeItem,
  type FormPricingRule,
  type FormState,
} from "./form-state";
import { FormulaInput } from "./formula-input";

type Props = {
  form: FormState;
  setForm: (next: FormState) => void;
};

type ComponentKind = FormPricingRule["component_kind"];
type Basis = FormPricingRule["basis"];
type AppliesTo = FormPricingRule["applies_to"];

const COMPONENT_KINDS: ComponentKind[] = [
  "VIDRO",
  "FERRAGEM",
  "INSTALACAO",
  "MAO_OBRA",
  "BENEFICIAMENTO",
  "OUTRO",
];

const BASIS_VAO: Basis[] = [
  "PER_M2",
  "PER_PIECE",
  "PER_GROUP",
  "PER_VAO",
  "FIXED",
];
const BASIS_MEDIDA: Basis[] = [
  "PER_M2",
  "PER_PIECE",
  "PER_ORCAMENTO",
  "PER_SPECIFICATION",
  "FIXED",
];

const APPLIES_TO_VAO: AppliesTo[] = ["TIPOLOGIA", "GROUP_CODE", "ROLE_CODE"];
const APPLIES_TO_MEDIDA: AppliesTo[] = ["TIPOLOGIA", "SPECIFICATION_TYPE"];

const KIND_LABEL: Record<ComponentKind, string> = {
  VIDRO: "Vidro",
  FERRAGEM: "Ferragem",
  INSTALACAO: "Instalação",
  MAO_OBRA: "Mão de obra",
  BENEFICIAMENTO: "Beneficiamento",
  OUTRO: "Outro",
};

const KIND_STYLES: Record<
  ComponentKind,
  {
    icon: React.ComponentType<{ className?: string }>;
    bg: string;
    text: string;
    border: string;
  }
> = {
  VIDRO: {
    icon: Square,
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
  },
  FERRAGEM: {
    icon: Cog,
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  INSTALACAO: {
    icon: Hammer,
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  MAO_OBRA: {
    icon: HardHat,
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-violet-500/30",
  },
  BENEFICIAMENTO: {
    icon: Drill,
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
  },
  OUTRO: {
    icon: Package,
    bg: "bg-zinc-500/10",
    text: "text-zinc-400",
    border: "border-zinc-500/30",
  },
};

const BASIS_LABEL: Record<Basis, string> = {
  PER_M2: "Por m²",
  PER_PIECE: "Por peça",
  PER_GROUP: "Por grupo de peças",
  PER_VAO: "Por vão",
  PER_ORCAMENTO: "Por orçamento",
  PER_SPECIFICATION: "Por beneficiamento",
  FIXED: "Valor fixo",
};

const APPLIES_TO_LABEL: Record<AppliesTo, string> = {
  TIPOLOGIA: "Em toda a tipologia",
  GROUP_CODE: "Em um grupo de peças",
  ROLE_CODE: "Em um tipo de peça",
  SPECIFICATION_TYPE: "Em uma especificação",
};

function ComponentBadge({ kind }: { kind: ComponentKind }) {
  const s = KIND_STYLES[kind];
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.bg} ${s.text} ${s.border}`}
    >
      <Icon className="size-3" />
      {KIND_LABEL[kind]}
    </span>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <Label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </Label>
  );
}

/**
 * Texto curto que descreve o que entrar na fórmula naquela base de cobrança.
 * Imperativo, dirigido ao vendedor — diz O QUE colocar, não como o motor opera.
 */
function formulaHelpText(basis: Basis): string {
  switch (basis) {
    case "PER_M2":
      return "Informe apenas o preço por m² (ex.: 150). A área de cobrança é multiplicada automaticamente — não use 'areaCobrancaTotal' aqui.";
    case "PER_PIECE":
      return "Informe o valor por peça (ex.: 180). O motor cobra esse valor uma vez para cada peça.";
    case "PER_GROUP":
      return "Informe o valor cobrado uma única vez por grupo de peças presente.";
    case "PER_VAO":
      return "Fórmula completa do valor por vão. Pode usar campos e cálculos auxiliares.";
    case "PER_ORCAMENTO":
      return "Fórmula completa do valor cobrado uma vez pelo orçamento (modo peça a peça).";
    case "PER_SPECIFICATION":
      return "Valor por especificação (ex.: por furo). Pode usar os detalhes da especificação na fórmula.";
    case "FIXED":
      return "Valor fixo, independente de dimensões.";
  }
}

/** Label do campo da fórmula, contextual à base. */
function formulaFieldLabel(basis: Basis): string {
  switch (basis) {
    case "PER_M2":
      return "Preço por m²";
    case "PER_PIECE":
      return "Preço por peça";
    case "PER_GROUP":
      return "Valor por grupo";
    case "PER_VAO":
      return "Fórmula do preço por vão";
    case "PER_ORCAMENTO":
      return "Fórmula do preço por orçamento";
    case "PER_SPECIFICATION":
      return "Preço por especificação";
    case "FIXED":
      return "Valor fixo";
  }
}

/** Placeholder contextual por base. */
function formulaPlaceholder(basis: Basis): string {
  switch (basis) {
    case "PER_M2":
      return "ex.: 150 ou precoVidro(VidroId)";
    case "PER_PIECE":
      return "ex.: 180";
    case "PER_GROUP":
      return "ex.: 420";
    case "PER_VAO":
      return "ex.: 350 + 80 * Nfolhas";
    case "PER_ORCAMENTO":
      return "ex.: 200 + 50 * count(pecas)";
    case "PER_SPECIFICATION":
      return "ex.: 8 * qtdTorres * furosPorTorre";
    case "FIXED":
      return "ex.: 100";
  }
}

/**
 * Detecta uso indevido de tokens "auto-multiplicados" na fórmula.
 * Em PER_M2 a área já é multiplicada — usar areaCobrancaTotal/areaRealTotal
 * costuma ser engano (multiplicação dupla).
 */
function detectarMultiplicacaoDupla(rule: FormPricingRule): string | null {
  const expr = rule.expression ?? "";
  if (rule.basis === "PER_M2") {
    if (/\bareaCobrancaTotal\b/.test(expr) || /\bareaRealTotal\b/.test(expr)) {
      return "Você está usando 'areaCobrancaTotal' ou 'areaRealTotal' numa regra 'Por m²'. A área já é multiplicada automaticamente — incluir aqui causa multiplicação dupla. Informe apenas o preço unitário (ex.: 150).";
    }
  }
  if (rule.basis === "PER_PIECE") {
    if (/\bquantidadePecas\b/.test(expr) || /\bcount\s*\(/.test(expr)) {
      return "Você está usando 'quantidadePecas' ou 'count(...)' numa regra 'Por peça'. O motor já itera por cada peça — multiplicar pela quantidade aqui causa cobrança duplicada.";
    }
  }
  return null;
}

export function TabPreco({ form, setForm }: Props) {
  const update = (next: FormPricingRule[]) =>
    setForm({ ...form, pricing_rules: next });
  const patch = (id: string, p: Partial<FormPricingRule>) =>
    update(patchItem(form.pricing_rules, id, p));

  const isVao = form.modoDeProducao === "VAO";
  const BASIS = isVao ? BASIS_VAO : BASIS_MEDIDA;
  const APPLIES_TO = isVao ? APPLIES_TO_VAO : APPLIES_TO_MEDIDA;

  const variableTokens = form.variables.map((v) => ({
    codigo: v.codigo,
    label: v.label,
  }));
  const computedTokens = form.computed_values
    .filter(
      (c) =>
        c.scope === "VAO" ||
        (!isVao && c.scope === "ORCAMENTO_PECA")
    )
    .map((c) => ({ codigo: c.codigo, label: "derivado" }));
  const groupCodes = form.piece_groups.map((g) => g.codigo).filter(Boolean);
  const roleCodes = Array.from(
    new Set(
      form.piece_groups.flatMap((g) =>
        g.piece_roles.map((r) => r.codigo).filter(Boolean)
      )
    )
  );
  const specCodes = form.specification_templates
    .map((s) => s.codigo)
    .filter(Boolean);

  const baseTokens = [
    ...variableTokens,
    ...computedTokens,
    { codigo: "corVidro", label: "cor do vidro" },
    { codigo: "tipoVidro", label: "tipo do vidro" },
    { codigo: "areaCobrancaTotal", label: "área cobrada total (m²)" },
    { codigo: "areaRealTotal", label: "área real total (m²)" },
    { codigo: "quantidadePecas", label: "qtd. de peças" },
    { codigo: "pecas", label: "lista de peças (use com count())" },
  ];

  const pieceTokens = [
    { codigo: "INDEX", label: "posição da peça" },
    { codigo: "ROLE", label: "tipo da peça" },
    { codigo: "wReal", label: "largura real da peça" },
    { codigo: "hReal", label: "altura real da peça" },
    { codigo: "wCobranca", label: "largura cobrada" },
    { codigo: "hCobranca", label: "altura cobrada" },
    { codigo: "areaRealM2", label: "área real da peça (m²)" },
    { codigo: "areaCobrancaM2", label: "área cobrada da peça (m²)" },
  ];

  /** Atributos do template selecionado em PER_SPECIFICATION. */
  const attrsForSpec = (
    specCodigo: string | null
  ): { codigo: string; label?: string }[] => {
    if (!specCodigo) return [];
    const tpl = form.specification_templates.find((t) => t.codigo === specCodigo);
    if (!tpl) return [];
    return Object.keys(tpl.schema_atributos).map((k) => ({
      codigo: k,
      label: "detalhe da especificação",
    }));
  };

  return (
    <div className="space-y-4">
      {/* ── Header da aba ── */}
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground">
            <Receipt className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">
              Como cobrar
            </h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Regras que somam o valor final. Avaliadas na ordem em que
              aparecem; regras desativadas ou com condição falsa não entram.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() =>
            update([
              ...form.pricing_rules,
              {
                ...blankPricingRule(form.modoDeProducao),
                ordem: form.pricing_rules.length + 1,
              },
            ])
          }
        >
          <Plus className="mr-1 size-4" />
          Nova regra
        </Button>
      </div>

      {/* ── Empty state ── */}
      {form.pricing_rules.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/10 p-10 text-center">
          <Receipt className="size-6 text-muted-foreground/60" />
          <p className="text-sm font-medium text-muted-foreground">
            Nenhuma regra de cobrança ainda
          </p>
          <p className="text-xs text-muted-foreground/70">
            Adicione regras para definir como esta tipologia é cobrada.
          </p>
        </div>
      )}

      {/* ── Cards de regras ── */}
      {form.pricing_rules.map((p, idx) => {
        const showAppliesValue =
          p.applies_to === "GROUP_CODE" ||
          p.applies_to === "ROLE_CODE" ||
          p.applies_to === "SPECIFICATION_TYPE";
        const isPerPiece =
          p.basis === "PER_PIECE" || p.basis === "PER_SPECIFICATION";
        const specAttrs =
          p.basis === "PER_SPECIFICATION"
            ? attrsForSpec(p.applies_to_value ?? null)
            : [];
        const exprAvailable = isPerPiece
          ? [...baseTokens, ...pieceTokens, ...specAttrs]
          : baseTokens;

        const hint = formulaHelpText(p.basis);
        const aviso = detectarMultiplicacaoDupla(p);

        return (
          <div
            key={p._id}
            className={`overflow-hidden rounded-xl border border-border/60 bg-card/40 shadow-sm transition-all hover:shadow-md ${
              !p.ativo ? "opacity-60" : ""
            }`}
          >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-border/40 bg-muted/20 px-4 py-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/60 font-mono text-[11px] font-medium text-muted-foreground">
                {idx + 1}
              </span>
              <ComponentBadge kind={p.component_kind} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {p.label || p.codigo || (
                    <span className="text-muted-foreground">(sem nome)</span>
                  )}
                </p>
                {p.codigo && p.label && (
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {p.codigo}
                  </p>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border/50 bg-background/40 px-2 py-1 transition-colors hover:bg-muted/40">
                <span
                  className={`size-1.5 rounded-full ${
                    p.ativo ? "bg-emerald-500" : "bg-zinc-500"
                  }`}
                />
                <span className="text-[11px] font-medium">
                  {p.ativo ? "ativa" : "inativa"}
                </span>
                <Switch
                  checked={p.ativo}
                  onCheckedChange={(b) => patch(p._id, { ativo: b })}
                  className="scale-75"
                />
              </label>

              <div className="flex items-center gap-0.5">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  disabled={idx === 0}
                  onClick={() =>
                    update(moveItem(form.pricing_rules, p._id, "up"))
                  }
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  disabled={idx === form.pricing_rules.length - 1}
                  onClick={() =>
                    update(moveItem(form.pricing_rules, p._id, "down"))
                  }
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-rose-400/70 hover:bg-rose-500/10 hover:text-rose-400"
                  onClick={() =>
                    update(removeItem(form.pricing_rules, p._id))
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Body */}
            <div className="space-y-4 p-4">
              {/* Linha 1: identificação */}
              <div className="grid gap-3 md:grid-cols-[160px_1fr_180px]">
                <div className="space-y-1.5">
                  <FieldLabel>Código</FieldLabel>
                  <Input
                    value={p.codigo}
                    onChange={(e) => patch(p._id, { codigo: e.target.value })}
                    className="h-9 font-mono"
                    placeholder="VIDRO_M2"
                    spellCheck={false}
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Nome exibido</FieldLabel>
                  <Input
                    value={p.label ?? ""}
                    onChange={(e) =>
                      patch(p._id, {
                        label: e.target.value === "" ? null : e.target.value,
                      })
                    }
                    className="h-9"
                    placeholder="(opcional)"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Tipo de cobrança</FieldLabel>
                  <Select
                    value={p.component_kind}
                    onValueChange={(v) =>
                      patch(p._id, { component_kind: v as ComponentKind })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMPONENT_KINDS.map((k) => {
                        const KIcon = KIND_STYLES[k].icon;
                        return (
                          <SelectItem key={k} value={k}>
                            <span className="inline-flex items-center gap-2">
                              <KIcon
                                className={`size-3.5 ${KIND_STYLES[k].text}`}
                              />
                              {KIND_LABEL[k]}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Linha 2: base de cobrança & escopo (bloco destacado) */}
              <div className="grid gap-3 rounded-lg border border-border/40 bg-muted/10 p-3 md:grid-cols-[1fr_1fr_1fr]">
                <div className="space-y-1.5">
                  <FieldLabel>Como calcular?</FieldLabel>
                  <Select
                    value={p.basis}
                    onValueChange={(v) =>
                      patch(p._id, { basis: v as Basis })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BASIS.map((b) => (
                        <SelectItem key={b} value={b}>
                          {BASIS_LABEL[b]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Onde aplicar?</FieldLabel>
                  <Select
                    value={p.applies_to}
                    onValueChange={(v) =>
                      patch(p._id, {
                        applies_to: v as AppliesTo,
                        applies_to_value: null,
                      })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {APPLIES_TO.map((a) => (
                        <SelectItem key={a} value={a}>
                          {APPLIES_TO_LABEL[a]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>
                    {p.applies_to === "GROUP_CODE"
                      ? "Qual grupo?"
                      : p.applies_to === "ROLE_CODE"
                        ? "Qual tipo de peça?"
                        : p.applies_to === "SPECIFICATION_TYPE"
                          ? "Qual especificação?"
                          : "Alvo"}
                  </FieldLabel>
                  {p.applies_to === "SPECIFICATION_TYPE" ? (
                    <Select
                      value={p.applies_to_value ?? ""}
                      onValueChange={(v) =>
                        patch(p._id, {
                          applies_to_value: v === "__none" ? null : v,
                        })
                      }
                    >
                      <SelectTrigger className="h-9 font-mono">
                        <SelectValue placeholder="(escolha)" />
                      </SelectTrigger>
                      <SelectContent>
                        {specCodes.length === 0 ? (
                          <SelectItem value="__none" disabled>
                            nenhuma especificação
                          </SelectItem>
                        ) : (
                          specCodes.map((c) => (
                            <SelectItem key={c} value={c}>
                              <span className="inline-flex items-center gap-2">
                                <ClipboardList className="size-3 text-cyan-400" />
                                {c}
                              </span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  ) : p.applies_to === "GROUP_CODE" ? (
                    <Select
                      value={p.applies_to_value ?? ""}
                      onValueChange={(v) =>
                        patch(p._id, {
                          applies_to_value: v === "__none" ? null : v,
                        })
                      }
                    >
                      <SelectTrigger className="h-9 font-mono">
                        <SelectValue placeholder="(escolha)" />
                      </SelectTrigger>
                      <SelectContent>
                        {groupCodes.length === 0 ? (
                          <SelectItem value="__none" disabled>
                            nenhum grupo cadastrado
                          </SelectItem>
                        ) : (
                          groupCodes.map((c) => (
                            <SelectItem key={c} value={c}>
                              <span className="inline-flex items-center gap-2">
                                <Package className="size-3 text-amber-400" />
                                {c}
                              </span>
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  ) : showAppliesValue ? (
                    <Input
                      value={p.applies_to_value ?? ""}
                      onChange={(e) =>
                        patch(p._id, {
                          applies_to_value:
                            e.target.value === "" ? null : e.target.value,
                        })
                      }
                      placeholder={`ex.: ${roleCodes[0] ?? "CANTO_ESQ"}${
                        roleCodes[1] ? `,${roleCodes[1]}` : ""
                      }`}
                      className="h-9 font-mono"
                      spellCheck={false}
                    />
                  ) : (
                    <div className="flex h-9 items-center rounded-md border border-border/50 bg-background/40 px-3 font-mono text-xs text-muted-foreground">
                      toda a tipologia
                    </div>
                  )}
                </div>
              </div>

              {/* Expressão */}
              <div className="space-y-1.5">
                <FieldLabel>{formulaFieldLabel(p.basis)}</FieldLabel>
                <FormulaInput
                  value={p.expression}
                  onChange={(s) => patch(p._id, { expression: s })}
                  available={exprAvailable}
                  placeholder={formulaPlaceholder(p.basis)}
                />
                {aviso && (
                  <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[11px] leading-relaxed text-amber-200">
                    <span aria-hidden className="mt-0.5">⚠️</span>
                    <p>{aviso}</p>
                  </div>
                )}
              </div>

              {/* Condição (quando não é role) */}
              {!showAppliesValue && (
                <div className="space-y-1.5">
                  <FieldLabel>Quando aplicar? (opcional)</FieldLabel>
                  <FormulaInput
                    value={p.condition ?? ""}
                    onChange={(s) =>
                      patch(p._id, { condition: s === "" ? null : s })
                    }
                    available={baseTokens}
                    allowEmpty
                    placeholder="ex.: Nfolhas > 3"
                  />
                </div>
              )}

              {/* Hint contextual */}
              {hint && (
                <div className="flex items-start gap-2 rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
                  <span className="mt-0.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/60" />
                  <p className="leading-relaxed">{hint}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
