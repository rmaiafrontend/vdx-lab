"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AlertCircle, Hash, HelpCircle, Variable as VariableIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FormulaError, parseExpression } from "@/lib/engine";
import { cn } from "@/lib/utils";

export type FormulaToken = string | { codigo: string; label?: string };

type Props = {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  /** Tokens (variáveis e ComputedValues) aceitos pela expressão. Aceita string[] ou {codigo,label}[]. */
  available?: FormulaToken[];
  className?: string;
  allowEmpty?: boolean;
};

const OPERATIONS = ["+", "-", "*", "/", "(", ")"] as const;

export function FormulaInput({
  value,
  onChange,
  placeholder,
  available,
  className,
  allowEmpty = false,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const [pos, setPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpPos, setHelpPos] = useState<{
    top?: number;
    bottom?: number;
    left: number;
    maxHeight: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const helpButtonRef = useRef<HTMLButtonElement>(null);
  const helpPopoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!touched) return;
    setError(checkExpression(value, allowEmpty));
  }, [value, touched, allowEmpty]);

  // Fecha a paleta ao clicar fora (considerando que o popover vive em portal)
  useEffect(() => {
    if (!focused) return;
    const onClickOutside = (e: MouseEvent) => {
      const wrap = wrapperRef.current;
      const pop = popoverRef.current;
      const target = e.target as Node;
      if (wrap?.contains(target)) return;
      if (pop?.contains(target)) return;
      setFocused(false);
      setTouched(true);
      setError(checkExpression(value, allowEmpty));
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [focused, value, allowEmpty]);

  // Fecha o popover de ajuda ao clicar fora
  useEffect(() => {
    if (!helpOpen) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (helpButtonRef.current?.contains(target)) return;
      if (helpPopoverRef.current?.contains(target)) return;
      setHelpOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [helpOpen]);

  // Posiciona o popover de ajuda
  useLayoutEffect(() => {
    if (!helpOpen) {
      setHelpPos(null);
      return;
    }
    const update = () => {
      const btn = helpButtonRef.current;
      if (!btn) return;
      const r = btn.getBoundingClientRect();
      const margin = 6;
      const viewport = window.innerHeight;
      const desired = Math.min(440, viewport * 0.7);
      const spaceBelow = viewport - r.bottom - margin;
      const spaceAbove = r.top - margin;
      const placeAbove = spaceBelow < desired && spaceAbove > spaceBelow;
      const maxHeight = placeAbove
        ? Math.min(desired, spaceAbove)
        : Math.min(desired, spaceBelow);
      const width = 320;
      const left = Math.max(8, Math.min(window.innerWidth - width - 8, r.right - width));
      setHelpPos({
        ...(placeAbove
          ? { bottom: viewport - r.top + margin }
          : { top: r.bottom + margin }),
        left,
        maxHeight,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [helpOpen]);

  // Posiciona o popover abaixo do input enquanto focado, reagindo a scroll/resize
  useLayoutEffect(() => {
    if (!focused) {
      setPos(null);
      return;
    }
    const update = () => {
      const el = inputRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const margin = 4;
      const viewport = window.innerHeight;
      const spaceBelow = viewport - r.bottom - margin;
      const spaceAbove = r.top - margin;
      const desired = Math.min(420, viewport * 0.6);
      const placeAbove = spaceBelow < desired && spaceAbove > spaceBelow;
      const maxHeight = placeAbove
        ? Math.min(desired, spaceAbove)
        : Math.min(desired, spaceBelow);
      setPos({
        ...(placeAbove
          ? { bottom: viewport - r.top + margin }
          : { top: r.bottom + margin }),
        left: r.left,
        width: r.width,
        maxHeight,
      });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [focused]);

  const showError = touched && error !== null;
  const tokens = (available ?? []).map(normalizeToken);
  const hasPalette = tokens.length > 0 || OPERATIONS.length > 0;

  /** Insere texto na posição do cursor (ou no fim) e mantém foco. */
  const insertAtCursor = (text: string) => {
    const el = inputRef.current;
    if (!el) {
      onChange((value ?? "") + text);
      return;
    }
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    // Espaçamento inteligente para legibilidade: " + ", " - " mas não em "(" / ")"
    const isOp = ["+", "-", "*", "/"].includes(text);
    const needsSpaceBefore =
      isOp && before.length > 0 && !before.endsWith(" ") && !before.endsWith("(");
    const needsSpaceAfter = isOp && !after.startsWith(" ") && !after.startsWith(")");
    const inserted =
      (needsSpaceBefore ? " " : "") + text + (needsSpaceAfter ? " " : "");
    const next = before + inserted + after;
    onChange(next);

    requestAnimationFrame(() => {
      const pos = before.length + inserted.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const tokenCodes = tokens.map((t) => t.codigo);
  const segments = highlightFormula(value ?? "", tokenCodes);

  return (
    <div ref={wrapperRef} className={cn("relative w-full", className)}>
      <Input
        ref={inputRef}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setTouched(true);
          setError(checkExpression(value, allowEmpty));
        }}
        placeholder={placeholder}
        className={cn(
          "pr-9 font-mono text-sm caret-foreground text-transparent selection:bg-primary/30 selection:text-foreground",
          showError && "border-destructive focus-visible:ring-destructive"
        )}
        spellCheck={false}
        autoComplete="off"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center overflow-hidden whitespace-pre pl-3 pr-9 font-mono text-sm leading-none text-foreground"
      >
        {value ? (
          segments.map((seg, i) => (
            <span key={i} className={SEGMENT_CLASS[seg.kind]}>
              {seg.text}
            </span>
          ))
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </div>

      <button
        ref={helpButtonRef}
        type="button"
        onMouseDown={(e) => e.preventDefault()}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setHelpOpen((o) => !o);
        }}
        className={cn(
          "absolute top-1/2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded transition-colors",
          helpOpen
            ? "bg-primary/15 text-primary"
            : "text-muted-foreground/70 hover:bg-muted/50 hover:text-foreground",
          "right-1.5"
        )}
        aria-label="Ajuda da fórmula"
        title="Ver funções e variáveis disponíveis"
      >
        <HelpCircle className="size-3.5" />
      </button>

      {showError && (
        <TooltipProvider delayDuration={100}>
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertCircle className="absolute right-8 top-1/2 size-4 -translate-y-1/2 text-destructive" />
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="max-w-xs text-xs">{error}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {helpOpen &&
        helpPos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={helpPopoverRef}
            style={{
              position: "fixed",
              ...(helpPos.top !== undefined ? { top: helpPos.top } : {}),
              ...(helpPos.bottom !== undefined ? { bottom: helpPos.bottom } : {}),
              left: helpPos.left,
              width: 320,
              maxHeight: helpPos.maxHeight,
              zIndex: 60,
            }}
            className="overflow-y-auto rounded-lg border border-border/60 bg-popover p-3 text-xs shadow-lg"
          >
            <FormulaHelpContent />
          </div>,
          document.body
        )}

      {focused &&
        hasPalette &&
        pos &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: "fixed",
              ...(pos.top !== undefined ? { top: pos.top } : {}),
              ...(pos.bottom !== undefined ? { bottom: pos.bottom } : {}),
              left: pos.left,
              width: Math.max(pos.width, 320),
              maxHeight: pos.maxHeight,
              zIndex: 50,
            }}
            className="flex flex-col overflow-hidden rounded-lg border border-border/60 bg-popover shadow-lg"
            onMouseDown={(e) => e.preventDefault()}
          >
            {tokens.length > 0 && (
              <div className="min-h-0 flex-1 overflow-y-auto border-b border-border/40 p-2">
                <div className="mb-1.5 flex items-center gap-1 px-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <VariableIcon className="size-2.5" />
                  Variáveis
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {tokens.map((t) => (
                    <button
                      key={t.codigo}
                      type="button"
                      onClick={() => insertAtCursor(t.codigo)}
                      className="inline-flex min-w-0 items-center gap-1 rounded border border-border/40 bg-card/40 px-1.5 py-1 text-left transition-colors hover:border-primary/50 hover:bg-primary/10"
                      title={t.label ? `${t.codigo} — ${t.label}` : t.codigo}
                    >
                      <span className="shrink-0 rounded bg-muted/60 px-1 font-mono text-[10px] font-semibold text-foreground">
                        {t.codigo}
                      </span>
                      {t.label && (
                        <span className="truncate text-[10px] text-muted-foreground/80">
                          {t.label}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="shrink-0 p-2">
              <div className="mb-1.5 flex items-center gap-1 px-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Hash className="size-2.5" />
                Operações
              </div>
              <div className="flex flex-wrap gap-1">
                {OPERATIONS.map((op) => (
                  <Button
                    key={op}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertAtCursor(op)}
                    className="h-7 min-w-7 px-2 font-mono text-xs"
                  >
                    {op}
                  </Button>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}

function normalizeToken(t: FormulaToken): { codigo: string; label?: string } {
  return typeof t === "string" ? { codigo: t } : t;
}

function FormulaHelpContent() {
  return (
    <div className="space-y-3">
      <section>
        <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-cyan-300/80">
          Funções built-in
        </div>
        <ul className="space-y-1 font-mono text-[11px] leading-relaxed">
          <li>
            <span className="text-cyan-300">precoVidro</span>
            <span className="text-muted-foreground/80">(</span>
            <span className="rounded-sm bg-primary/15 px-0.5 text-primary">VidroId</span>
            <span className="text-muted-foreground/80">)</span>
            <span className="text-muted-foreground"> — preço por m² do vidro</span>
          </li>
          <li>
            <span className="text-cyan-300">precoTorre</span>
            <span className="text-muted-foreground/80">(</span>
            <span className="text-emerald-300">{"'MODELO'"}</span>
            <span className="text-muted-foreground/80">)</span>
            <span className="text-muted-foreground"> — preço de torre</span>
          </li>
          <li>
            <span className="text-cyan-300">count</span>
            <span className="text-muted-foreground/80">(</span>
            <span className="rounded-sm bg-primary/15 px-0.5 text-primary">pecas</span>
            <span className="text-muted-foreground/80">)</span>
            <span className="text-muted-foreground"> — qtd. de peças</span>
          </li>
          <li>
            <span className="text-cyan-300">if</span>
            <span className="text-muted-foreground/80">(</span>
            cond, a, b
            <span className="text-muted-foreground/80">)</span>
            <span className="text-muted-foreground"> — condicional</span>
          </li>
          <li className="text-cyan-300">
            min · max · floor · ceil · round · abs · sqrt
          </li>
        </ul>
      </section>

      <section>
        <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-primary/80">
          Built-ins (cobrança)
        </div>
        <ul className="space-y-0.5 font-mono text-[11px] leading-relaxed">
          <HelpVar name="VidroId" desc="id do vidro selecionado" />
          <HelpVar name="areaCobrancaTotal" desc="m² cobrados (todas as peças)" />
          <HelpVar name="areaRealTotal" desc="m² reais" />
          <HelpVar name="quantidadePecas" desc="total de peças" />
          <HelpVar name="pecas" desc="lista (use com count)" />
        </ul>
      </section>

      <section>
        <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-primary/80">
          Por peça (PER_PIECE)
        </div>
        <ul className="space-y-0.5 font-mono text-[11px] leading-relaxed">
          <HelpVar name="INDEX" desc="posição (1, 2, …)" />
          <HelpVar name="ROLE" desc="código do papel" />
          <HelpVar name="wReal" desc="largura real" />
          <HelpVar name="hReal" desc="altura real" />
          <HelpVar name="wCobranca" desc="largura cobrada" />
          <HelpVar name="hCobranca" desc="altura cobrada" />
          <HelpVar name="areaRealM2" desc="m² real" />
          <HelpVar name="areaCobrancaM2" desc="m² cobrado" />
        </ul>
      </section>

      <section>
        <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
          Em peças (selectors / expressões)
        </div>
        <ul className="space-y-0.5 font-mono text-[11px] leading-relaxed">
          <HelpVar name="INDEX" desc="posição" />
          <HelpVar name="TOTAL" desc="total do grupo" />
          <HelpVar name="IS_FIRST" desc="é a primeira?" />
          <HelpVar name="IS_LAST" desc="é a última?" />
          <HelpVar name="ROLE" desc="código do papel" />
          <HelpVar name="GROUP_TOTAL" desc="(em derivados de grupo)" />
        </ul>
      </section>

      <section className="border-t border-border/40 pt-2">
        <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
          Legenda de cores
        </div>
        <ul className="space-y-1 text-[10px] leading-relaxed">
          <li className="flex items-center gap-2">
            <span className="rounded-sm bg-primary/15 px-1 font-mono text-primary">var</span>
            <span className="text-muted-foreground">variável conhecida</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="rounded-sm bg-cyan-500/15 px-1 font-mono text-cyan-300">fn</span>
            <span className="text-muted-foreground">função built-in</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="font-mono text-amber-300">123</span>
            <span className="text-muted-foreground">número</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="font-mono text-emerald-300">{"'str'"}</span>
            <span className="text-muted-foreground">string</span>
          </li>
          <li className="flex items-center gap-2">
            <span className="font-mono text-muted-foreground/80">+ − ( )</span>
            <span className="text-muted-foreground">operador / pontuação</span>
          </li>
        </ul>
      </section>
    </div>
  );
}

function HelpVar({ name, desc }: { name: string; desc: string }) {
  return (
    <li>
      <span className="rounded-sm bg-primary/15 px-0.5 text-primary">{name}</span>
      <span className="text-muted-foreground"> — {desc}</span>
    </li>
  );
}

type SegmentKind = "text" | "var" | "fn" | "num" | "punct" | "string";
type FormulaSegment = { kind: SegmentKind; text: string };

const BUILTIN_FUNCTIONS = new Set([
  "min",
  "max",
  "floor",
  "ceil",
  "round",
  "abs",
  "sqrt",
  "if",
  "precoVidro",
  "precoTorre",
  "count",
]);

const SEGMENT_CLASS: Record<SegmentKind, string> = {
  text: "",
  var: "rounded-sm bg-primary/15 text-primary",
  fn: "rounded-sm bg-cyan-500/15 text-cyan-300",
  num: "text-amber-300",
  punct: "text-muted-foreground/80",
  string: "text-emerald-300",
};

function highlightFormula(value: string, tokens: string[]): FormulaSegment[] {
  if (!value) return [];
  const varSet = new Set(tokens.filter(Boolean));
  const out: FormulaSegment[] = [];
  // Tokenizer: string literal | number | identifier | run of non-id chars
  const re = /'(?:[^'\\]|\\.)*'?|"(?:[^"\\]|\\.)*"?|\d+(?:\.\d+)?|[A-Za-z_][A-Za-z0-9_]*|[^A-Za-z0-9_'"]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value)) !== null) {
    const tok = m[0];
    const first = tok[0];
    if (first === "'" || first === '"') {
      out.push({ kind: "string", text: tok });
    } else if (/^\d/.test(tok)) {
      out.push({ kind: "num", text: tok });
    } else if (/^[A-Za-z_]/.test(tok)) {
      const next = value[m.index + tok.length];
      if (next === "(" && BUILTIN_FUNCTIONS.has(tok)) {
        out.push({ kind: "fn", text: tok });
      } else if (varSet.has(tok)) {
        out.push({ kind: "var", text: tok });
      } else {
        out.push({ kind: "text", text: tok });
      }
    } else {
      out.push({ kind: "punct", text: tok });
    }
  }
  return out;
}

function checkExpression(value: string, allowEmpty: boolean): string | null {
  const trimmed = (value ?? "").trim();
  if (trimmed === "") {
    return allowEmpty ? null : "expressão vazia";
  }
  try {
    parseExpression(trimmed);
    return null;
  } catch (err) {
    if (err instanceof FormulaError) return err.message;
    return err instanceof Error ? err.message : String(err);
  }
}
