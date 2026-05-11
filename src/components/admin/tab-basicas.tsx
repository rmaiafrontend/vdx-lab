"use client";

import {
  Hash,
  ImageIcon,
  ImageOff,
  Tag,
  Settings2,
  Layers,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RENDER_KEYS } from "@/lib/render-mapping";
import type { FormState } from "./form-state";

// "none" sentinela porque <Select> do radix não aceita value="" — evita
// confundir "sem render" com "ainda não selecionado".
const NO_RENDER = "__none__";

type Categoria = { id: number; nome: string };

type Props = {
  form: FormState;
  setForm: (next: FormState) => void;
  categorias: Categoria[];
  /** True quando estamos editando uma tipologia existente — bloqueia troca de modo. */
  modoLocked?: boolean;
};

function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={htmlFor}
        className="flex items-baseline gap-1 text-xs font-medium uppercase tracking-wide text-muted-foreground"
      >
        {label}
        {required && (
          <span className="text-[10px] font-normal normal-case text-destructive/80">
            obrigatório
          </span>
        )}
      </Label>
      {children}
      {hint && (
        <p className="text-[11px] leading-relaxed text-muted-foreground/80">
          {hint}
        </p>
      )}
    </div>
  );
}

function ImagePreview({ url }: { url: string | null }) {
  const valid = !!url && /^https?:\/\//.test(url);
  return (
    <div className="flex h-full min-h-[160px] flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-muted/20 p-3 text-center">
      {valid ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url!}
          alt="Pré-visualização"
          className="max-h-[180px] w-full rounded-lg object-contain"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
      ) : (
        <>
          <ImageOff className="mb-2 size-6 text-muted-foreground/60" />
          <p className="text-xs text-muted-foreground">
            Sem imagem
          </p>
          <p className="text-[10px] text-muted-foreground/70">
            cole uma URL https:// ao lado
          </p>
        </>
      )}
    </div>
  );
}

export function TabBasicas({ form, setForm, categorias, modoLocked }: Props) {
  const update = <K extends keyof FormState>(field: K, value: FormState[K]) =>
    setForm({ ...form, [field]: value });

  return (
    <div className="space-y-8">
      {/* ── Identidade ── */}
      <section className="rounded-xl border border-border/60 bg-card/40 p-5">
        <SectionHeader
          icon={Tag}
          title="Identidade"
          description="Como esta tipologia é reconhecida internamente e pelo vendedor."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            htmlFor="nome"
            label="Nome da tipologia"
            required
            hint="Aparece no catálogo e no orçamento."
          >
            <Input
              id="nome"
              value={form.nome}
              onChange={(e) => update("nome", e.target.value)}
              placeholder="ex.: Varanda 4 cantos"
              className="h-10"
            />
          </Field>

          <Field
            htmlFor="categoria"
            label="Categoria"
            required
            hint="Agrupa tipologias semelhantes no fluxo de cotação."
          >
            <Select
              value={String(form.categoria_id)}
              onValueChange={(v) => update("categoria_id", Number(v))}
            >
              <SelectTrigger id="categoria" className="h-10">
                <SelectValue placeholder="selecione…" />
              </SelectTrigger>
              <SelectContent>
                {categorias.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      </section>

      {/* ── Modo de produção ── */}
      <section className="rounded-xl border border-border/60 bg-card/40 p-5">
        <SectionHeader
          icon={Layers}
          title="Modo de produção"
          description="Como o produto é orçado. Não pode ser alterado depois de salvo."
        />
        <Field
          htmlFor="modo"
          label="Como o produto é orçado?"
          required
          hint={
            modoLocked
              ? "Modo bloqueado em edição. Para mudar, crie uma nova tipologia."
              : "Pelo vão: o vendedor informa as medidas da abertura e o sistema calcula as peças. Peça a peça: o vendedor informa cada peça (guarda-corpos, espelhos sob medida)."
          }
        >
          <Select
            value={form.modoDeProducao}
            onValueChange={(v) =>
              update("modoDeProducao", v as FormState["modoDeProducao"])
            }
            disabled={modoLocked}
          >
            <SelectTrigger id="modo" className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="VAO">
                Pelo vão (medidas da abertura)
              </SelectItem>
              <SelectItem value="MEDIDA_DE_PRODUCAO">
                Peça a peça (medidas individuais)
              </SelectItem>
            </SelectContent>
          </Select>
        </Field>
      </section>

      {/* ── Apresentação ── */}
      <section className="rounded-xl border border-border/60 bg-card/40 p-5">
        <SectionHeader
          icon={ImageIcon}
          title="Apresentação"
          description="O que o vendedor vê ao escolher esta tipologia."
        />
        <div className="grid gap-4 md:grid-cols-[1fr_240px]">
          <div className="space-y-4">
            <Field
              htmlFor="descricao"
              label="Descrição"
              hint="Texto curto que ajuda o vendedor a identificar a tipologia."
            >
              <Textarea
                id="descricao"
                value={form.descricao ?? ""}
                onChange={(e) =>
                  update(
                    "descricao",
                    e.target.value === "" ? null : e.target.value
                  )
                }
                rows={3}
                placeholder="Breve descrição da tipologia, materiais, aplicação típica…"
              />
            </Field>

            <Field
              htmlFor="imagem"
              label="URL da imagem"
              hint="Link público para uma imagem de referência (https://…)."
            >
              <Input
                id="imagem"
                value={form.imagem_url ?? ""}
                onChange={(e) =>
                  update(
                    "imagem_url",
                    e.target.value === "" ? null : e.target.value
                  )
                }
                placeholder="https://exemplo.com/imagem.jpg"
                className="h-10 font-mono text-xs"
                spellCheck={false}
              />
            </Field>

            <Field
              htmlFor="render-key"
              label="Pré-visualização vetorial"
              hint="Template do vdx-render-embed. Quando definido, substitui o diagrama por um render fiel reativo às variáveis (Lvao→largura, Avao→altura, Nfolhas→folhas)."
            >
              <Select
                value={form.render_key ?? NO_RENDER}
                onValueChange={(v) =>
                  update("render_key", v === NO_RENDER ? null : v)
                }
              >
                <SelectTrigger id="render-key" className="h-10">
                  <SelectValue placeholder="selecione um template…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_RENDER}>Sem render (diagrama)</SelectItem>
                  {RENDER_KEYS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <ImagePreview url={form.imagem_url} />
        </div>
      </section>

      {/* ── Publicação ── */}
      <section className="rounded-xl border border-border/60 bg-card/40 p-5">
        <SectionHeader
          icon={Settings2}
          title="Publicação"
          description="Quando e em que posição esta tipologia aparece no catálogo."
        />
        <div className="grid gap-4 md:grid-cols-2">
          <Field
            htmlFor="ordem"
            label="Ordem de exibição"
            hint="Menor número aparece primeiro na lista."
          >
            <div className="relative">
              <Hash className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="ordem"
                type="number"
                value={form.ordem}
                onChange={(e) => update("ordem", Number(e.target.value))}
                className="h-10 pl-9 font-mono"
              />
            </div>
          </Field>

          <Field label="Status" hint="Tipologias inativas ficam ocultas para o vendedor.">
            <label
              htmlFor="ativo"
              className="flex h-10 cursor-pointer items-center justify-between gap-3 rounded-md border border-border/70 bg-background/50 px-3 transition-colors hover:bg-muted/40"
            >
              <span className="flex items-center gap-2">
                <span
                  className={`size-2 rounded-full ${
                    form.ativo ? "bg-emerald-500" : "bg-zinc-500"
                  }`}
                  aria-hidden
                />
                <span className="text-sm font-medium">
                  {form.ativo ? "Ativa" : "Inativa"}
                </span>
              </span>
              <Switch
                id="ativo"
                checked={form.ativo}
                onCheckedChange={(b) => update("ativo", b)}
              />
            </label>
          </Field>
        </div>
      </section>
    </div>
  );
}
