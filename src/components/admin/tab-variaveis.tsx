"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  Hash,
  List,
  Plus,
  Ruler,
  Sparkles,
  ToggleRight,
  Trash2,
  Variable as VariableIcon,
  Wrench,
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
  blankVariable,
  moveItem,
  patchItem,
  removeItem,
  type FormState,
  type FormVariable,
} from "./form-state";
import { FormulaInput } from "./formula-input";
import { OptionListEditor } from "./option-list-editor";
import type { VariableNivel } from "@/lib/engine";
import {
  EMBED_KEY_LABELS,
  EMBED_VAR_PRESETS,
  getEmbedKeyForCodigo,
  type EmbedVarPreset,
} from "@/lib/render-mapping";

type Props = {
  form: FormState;
  setForm: (next: FormState) => void;
};

type Kind = FormVariable["kind"];

const KIND_OPTIONS: Kind[] = [
  "DIMENSION",
  "COUNT",
  "TECHNICAL_PARAM",
  "BOOLEAN",
  "OPTION_LIST",
];

const KIND_LABELS: Record<Kind, string> = {
  DIMENSION: "Medida",
  COUNT: "Quantidade",
  TECHNICAL_PARAM: "Configuração técnica",
  BOOLEAN: "Sim / Não",
  OPTION_LIST: "Escolha entre opções",
};

const KIND_STYLES: Record<
  Kind,
  {
    icon: React.ComponentType<{ className?: string }>;
    bg: string;
    text: string;
    border: string;
    ring: string;
  }
> = {
  DIMENSION: {
    icon: Ruler,
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/30",
    ring: "ring-blue-500/20",
  },
  COUNT: {
    icon: Hash,
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
    ring: "ring-amber-500/20",
  },
  TECHNICAL_PARAM: {
    icon: Wrench,
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-violet-500/30",
    ring: "ring-violet-500/20",
  },
  BOOLEAN: {
    icon: ToggleRight,
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    ring: "ring-emerald-500/20",
  },
  OPTION_LIST: {
    icon: List,
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
    ring: "ring-cyan-500/20",
  },
};

const UNIT_OPTIONS: Record<Kind, string[]> = {
  DIMENSION: ["mm", "cm", "m"],
  COUNT: ["un"],
  TECHNICAL_PARAM: ["mm", "cm", "m", "un", "%"],
  BOOLEAN: [],
  OPTION_LIST: [],
};

const NIVEL_LABELS: Record<VariableNivel, string> = {
  ORCAMENTO: "Uma vez por orçamento",
  VAO: "Uma vez por vão",
  PECA: "Em cada peça",
};

function nivelOptionsForMode(modo: FormState["modoDeProducao"]): VariableNivel[] {
  if (modo === "VAO") return ["ORCAMENTO", "VAO"];
  return ["ORCAMENTO", "PECA"];
}

function KindBadge({ kind }: { kind: Kind }) {
  const s = KIND_STYLES[kind];
  const Icon = s.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${s.bg} ${s.text} ${s.border}`}
    >
      <Icon className="size-3" />
      {KIND_LABELS[kind]}
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

export function TabVariaveis({ form, setForm }: Props) {
  const updateVars = (next: FormVariable[]) =>
    setForm({ ...form, variables: next });
  const patch = (id: string, p: Partial<FormVariable>) =>
    updateVars(patchItem(form.variables, id, p));

  const otherVars = (id: string) =>
    form.variables
      .filter((v) => v._id !== id)
      .map((v) => ({ codigo: v.codigo, label: v.label }));

  const niveisDisponiveis = nivelOptionsForMode(form.modoDeProducao);

  const addPreset = (p: EmbedVarPreset) => {
    if (form.variables.some((v) => v.codigo === p.codigo)) return;
    const base = blankVariable(form.modoDeProducao);
    updateVars([
      ...form.variables,
      {
        ...base,
        codigo: p.codigo,
        label: p.label,
        kind: p.kind,
        nivel: p.nivel,
        unit: p.unit,
        required: p.required,
        default_value: p.defaultValue,
        min_value: p.minValue,
        max_value: p.maxValue,
        options: p.options ?? null,
        ordem: form.variables.length + 1,
      },
    ]);
  };

  return (
    <div className="space-y-4">
      {/* ── Banner de presets do render — só quando a tipologia tem render_key ── */}
      {form.render_key && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Sparkles className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold tracking-tight">
                Variáveis reconhecidas pelo render{" "}
                <code className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[11px] text-amber-300">
                  {form.render_key}
                </code>
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                Use estes códigos exatos para que o valor digitado pelo vendedor
                chegue na pré-visualização vetorial. Clique em uma para
                adicionar já configurada.
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {EMBED_VAR_PRESETS.map((p) => {
              const exists = form.variables.some((v) => v.codigo === p.codigo);
              return (
                <button
                  key={p.codigo}
                  type="button"
                  disabled={exists}
                  onClick={() => addPreset(p)}
                  title={p.description}
                  className={`group inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors ${
                    exists
                      ? "cursor-not-allowed border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-300 hover:border-amber-500/60 hover:bg-amber-500/20"
                  }`}
                >
                  {exists ? (
                    <Check className="size-3" />
                  ) : (
                    <Plus className="size-3" />
                  )}
                  <span className="font-mono">{p.codigo}</span>
                  <span className="text-muted-foreground/80">→</span>
                  <span>{EMBED_KEY_LABELS[p.embedKey]}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Header da aba ── */}
      <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-card/40 p-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground">
            <VariableIcon className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold tracking-tight">Variáveis</h3>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Dados que o vendedor preenche ao cotar. A ordem define a sequência
              de campos no wizard.
            </p>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() =>
            updateVars([
              ...form.variables,
              {
                ...blankVariable(form.modoDeProducao),
                ordem: form.variables.length + 1,
              },
            ])
          }
        >
          <Plus className="mr-1 size-4" />
          Nova variável
        </Button>
      </div>

      {/* ── Empty state ── */}
      {form.variables.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/10 p-10 text-center">
          <VariableIcon className="size-6 text-muted-foreground/60" />
          <p className="text-sm font-medium text-muted-foreground">
            Nenhuma variável ainda
          </p>
          <p className="text-xs text-muted-foreground/70">
            Adicione a primeira variável para começar a montar a tipologia.
          </p>
        </div>
      )}

      {/* ── Cards de variáveis ── */}
      {form.variables.map((v, idx) => {
        const units = UNIT_OPTIONS[v.kind];
        const embedKey = form.render_key
          ? getEmbedKeyForCodigo(v.codigo)
          : null;

        return (
          <div
            key={v._id}
            className="group overflow-hidden rounded-xl border border-border/60 bg-card/40 shadow-sm transition-shadow hover:shadow-md"
          >
            {/* Header do card */}
            <div className="flex items-center gap-3 border-b border-border/40 bg-muted/20 px-4 py-2.5">
              <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-muted/60 font-mono text-[11px] font-medium text-muted-foreground">
                {idx + 1}
              </span>
              <KindBadge kind={v.kind} />
              <span className="rounded-md border border-border/60 bg-background/40 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {v.nivel}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {v.label || (
                    <span className="text-muted-foreground">(sem nome)</span>
                  )}
                </p>
                {v.codigo && (
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {v.codigo}
                  </p>
                )}
              </div>
              {embedKey && (
                <span
                  className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-300"
                  title={`Esta variável alimenta a ${EMBED_KEY_LABELS[embedKey]} no render`}
                >
                  <Sparkles className="size-3" />
                  render: {EMBED_KEY_LABELS[embedKey]}
                </span>
              )}
              {v.required && (
                <span className="rounded-md border border-rose-500/30 bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-400">
                  obrigatório
                </span>
              )}
              <div className="flex items-center gap-0.5">
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  disabled={idx === 0}
                  onClick={() =>
                    updateVars(moveItem(form.variables, v._id, "up"))
                  }
                >
                  <ArrowUp className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-muted-foreground hover:text-foreground"
                  disabled={idx === form.variables.length - 1}
                  onClick={() =>
                    updateVars(moveItem(form.variables, v._id, "down"))
                  }
                >
                  <ArrowDown className="size-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-7 text-rose-400/70 hover:bg-rose-500/10 hover:text-rose-400"
                  onClick={() =>
                    updateVars(removeItem(form.variables, v._id))
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Body do card */}
            <div className="space-y-4 p-4">
              {/* Linha 1: identificação */}
              <div className="grid gap-3 md:grid-cols-[160px_1fr_160px_140px_120px]">
                <div className="space-y-1.5">
                  <FieldLabel>Código</FieldLabel>
                  <Input
                    value={v.codigo}
                    onChange={(e) => patch(v._id, { codigo: e.target.value })}
                    className="h-9 font-mono"
                    placeholder="Lvao"
                    spellCheck={false}
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Nome de exibição</FieldLabel>
                  <Input
                    value={v.label}
                    onChange={(e) => patch(v._id, { label: e.target.value })}
                    className="h-9"
                    placeholder="Largura do vão"
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Tipo</FieldLabel>
                  <Select
                    value={v.kind}
                    onValueChange={(k) => {
                      const newKind = k as Kind;
                      patch(v._id, {
                        kind: newKind,
                        unit: UNIT_OPTIONS[newKind][0] ?? null,
                        options:
                          newKind === "OPTION_LIST"
                            ? v.options ?? []
                            : null,
                      });
                    }}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KIND_OPTIONS.map((k) => {
                        const KIcon = KIND_STYLES[k].icon;
                        return (
                          <SelectItem key={k} value={k}>
                            <span className="inline-flex items-center gap-2">
                              <KIcon
                                className={`size-3.5 ${KIND_STYLES[k].text}`}
                              />
                              {KIND_LABELS[k]}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Quando informar?</FieldLabel>
                  <Select
                    value={v.nivel}
                    onValueChange={(n) =>
                      patch(v._id, { nivel: n as VariableNivel })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {niveisDisponiveis.map((n) => (
                        <SelectItem key={n} value={n}>
                          {NIVEL_LABELS[n]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Unidade</FieldLabel>
                  {units.length === 0 ? (
                    <Input
                      value="—"
                      disabled
                      className="h-9 text-center text-muted-foreground"
                    />
                  ) : (
                    <Select
                      value={v.unit ?? units[0]}
                      onValueChange={(u) => patch(v._id, { unit: u })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {units.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              {/* OPTION_LIST: editor de opções */}
              {v.kind === "OPTION_LIST" && (
                <OptionListEditor
                  value={v.options}
                  onChange={(opts) => patch(v._id, { options: opts })}
                />
              )}

              {/* Linha 2: configuração avançada */}
              <div className="grid gap-3 rounded-lg border border-border/40 bg-muted/10 p-3 md:grid-cols-[auto_1fr_1fr_1fr]">
                <label
                  htmlFor={`req-${v._id}`}
                  className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border/50 bg-background/40 px-3 transition-colors hover:bg-muted/40"
                >
                  <span
                    className={`size-1.5 rounded-full ${
                      v.required ? "bg-rose-400" : "bg-zinc-500"
                    }`}
                  />
                  <span className="text-xs font-medium">
                    {v.required ? "Obrigatório" : "Opcional"}
                  </span>
                  <Switch
                    id={`req-${v._id}`}
                    checked={v.required}
                    onCheckedChange={(b) => patch(v._id, { required: b })}
                    className="ml-1 scale-90"
                  />
                </label>
                <div className="space-y-1.5">
                  <FieldLabel>Valor padrão</FieldLabel>
                  {v.kind === "OPTION_LIST" ? (
                    <Input
                      value={v.default_value ?? ""}
                      onChange={(e) =>
                        patch(v._id, {
                          default_value:
                            e.target.value === "" ? null : e.target.value,
                        })
                      }
                      placeholder="(uma das opções acima)"
                      className="h-9 font-mono text-xs"
                    />
                  ) : (
                    <FormulaInput
                      value={v.default_value ?? ""}
                      onChange={(s) =>
                        patch(v._id, { default_value: s === "" ? null : s })
                      }
                      available={otherVars(v._id)}
                      allowEmpty
                      placeholder="(opcional)"
                    />
                  )}
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Mínimo</FieldLabel>
                  <FormulaInput
                    value={v.min_value ?? ""}
                    onChange={(s) =>
                      patch(v._id, { min_value: s === "" ? null : s })
                    }
                    available={otherVars(v._id)}
                    allowEmpty
                    placeholder={
                      v.kind === "OPTION_LIST" || v.kind === "BOOLEAN"
                        ? "n/a"
                        : "(opcional)"
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <FieldLabel>Máximo</FieldLabel>
                  <FormulaInput
                    value={v.max_value ?? ""}
                    onChange={(s) =>
                      patch(v._id, { max_value: s === "" ? null : s })
                    }
                    available={otherVars(v._id)}
                    allowEmpty
                    placeholder={
                      v.kind === "OPTION_LIST" || v.kind === "BOOLEAN"
                        ? "n/a"
                        : "(opcional)"
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
