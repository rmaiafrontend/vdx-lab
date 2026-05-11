"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, GripVertical, X } from "lucide-react";
import type { FormState } from "./form-state";
import type { VidroSnapshot } from "@/lib/engine";

type Props = {
  form: FormState;
  setForm: (f: FormState) => void;
};

/**
 * Cor + espessura nunca são variáveis de tipologia — elas pertencem ao
 * vidro selecionado a partir do catálogo. Esta aba lista o catálogo
 * (`/api/vidros`) e marca quais vidros são elegíveis para a tipologia.
 * O usuário do orçamento escolherá um único vidro entre os elegíveis.
 */
export function TabVidros({ form, setForm }: Props) {
  const [catalog, setCatalog] = useState<VidroSnapshot[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/vidros")
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as VidroSnapshot[];
      })
      .then((data) => {
        if (!cancelled) setCatalog(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const elegibilidade = useMemo(
    () => new Set(form.vidros_elegiveis.map((v) => v.id)),
    [form.vidros_elegiveis]
  );

  // Catálogo agrupado por cor para exibir mais legível
  const porCor = useMemo(() => {
    if (!catalog) return new Map<string, VidroSnapshot[]>();
    const map = new Map<string, VidroSnapshot[]>();
    for (const v of catalog) {
      const arr = map.get(v.corCodigo) ?? [];
      arr.push(v);
      map.set(v.corCodigo, arr);
    }
    return map;
  }, [catalog]);

  const toggle = (vidro: VidroSnapshot) => {
    if (elegibilidade.has(vidro.id)) {
      setForm({
        ...form,
        vidros_elegiveis: form.vidros_elegiveis.filter((v) => v.id !== vidro.id),
      });
    } else {
      setForm({
        ...form,
        vidros_elegiveis: [...form.vidros_elegiveis, vidro],
      });
    }
  };

  const remove = (id: number) => {
    setForm({
      ...form,
      vidros_elegiveis: form.vidros_elegiveis.filter((v) => v.id !== id),
    });
  };

  const move = (id: number, direction: "up" | "down") => {
    const idx = form.vidros_elegiveis.findIndex((v) => v.id === id);
    if (idx === -1) return;
    const newIdx = direction === "up" ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= form.vidros_elegiveis.length) return;
    const next = [...form.vidros_elegiveis];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setForm({ ...form, vidros_elegiveis: next });
  };

  if (error) {
    return (
      <div className="rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-400">
        Erro carregando catálogo de vidros: {error}
      </div>
    );
  }
  if (!catalog) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
        <Loader2 className="size-4 animate-spin" />
        Carregando catálogo…
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="rounded-md border border-border/60 bg-card">
        <header className="border-b border-border/60 px-4 py-3">
          <h3 className="text-sm font-semibold">Catálogo de vidros</h3>
          <p className="text-[11px] text-muted-foreground/80">
            Marque os vidros elegíveis para esta tipologia. Cor e espessura são
            atributos do vidro — nunca variáveis.
          </p>
        </header>
        <div className="space-y-3 px-4 py-3 text-sm">
          {Array.from(porCor.entries()).map(([corCodigo, vidros]) => (
            <div key={corCodigo}>
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/80">
                {vidros[0]?.corLabel ?? corCodigo}
              </p>
              <div className="space-y-1">
                {vidros.map((v) => {
                  const checked = elegibilidade.has(v.id);
                  return (
                    <label
                      key={v.id}
                      className={`flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 transition-colors ${
                        checked
                          ? "border-blue-500/40 bg-blue-500/5"
                          : "border-border/40 hover:bg-background/60"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(v)}
                      />
                      <span className="font-mono text-xs">{v.codigo}</span>
                      <span className="text-xs text-muted-foreground">
                        {v.espessura} mm · R$ {v.precoM2.toFixed(2)}/m²
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-border/60 bg-card">
        <header className="border-b border-border/60 px-4 py-3">
          <h3 className="text-sm font-semibold">
            Elegíveis ({form.vidros_elegiveis.length})
          </h3>
          <p className="text-[11px] text-muted-foreground/80">
            Ordem aparece no orçamento e o primeiro é o padrão.
          </p>
        </header>
        <div className="space-y-1 px-4 py-3 text-sm">
          {form.vidros_elegiveis.length === 0 ? (
            <p className="text-xs text-muted-foreground/80">
              nenhum vidro selecionado — marque ao menos um para que a tipologia
              possa ser orçada.
            </p>
          ) : (
            form.vidros_elegiveis.map((v, i) => (
              <div
                key={v.id}
                className="flex items-center gap-2 rounded-md border border-border/40 bg-background/40 px-2 py-1.5"
              >
                <span className="font-mono text-[10px] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-mono text-xs">{v.codigo}</span>
                <span className="text-xs text-muted-foreground">
                  {v.corLabel} · {v.espessura} mm
                </span>
                <span className="ml-auto text-xs tabular-nums text-muted-foreground">
                  R$ {v.precoM2.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => move(v.id, "up")}
                  disabled={i === 0}
                  className="ml-1 text-muted-foreground/60 hover:text-foreground disabled:opacity-30"
                  title="Subir"
                >
                  <GripVertical className="size-3.5 rotate-90" />
                </button>
                <button
                  type="button"
                  onClick={() => move(v.id, "down")}
                  disabled={i === form.vidros_elegiveis.length - 1}
                  className="text-muted-foreground/60 hover:text-foreground disabled:opacity-30"
                  title="Descer"
                >
                  <GripVertical className="size-3.5 -rotate-90" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(v.id)}
                  className="text-rose-400/70 hover:text-rose-400"
                  title="Remover"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
