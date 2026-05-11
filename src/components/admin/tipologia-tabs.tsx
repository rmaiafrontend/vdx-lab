"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  emptyForm,
  formToPayload,
  snapshotToForm,
  type FormState,
} from "./form-state";
import { TabBasicas } from "./tab-basicas";
import { TabVariaveis } from "./tab-variaveis";
import { TabDerivados } from "./tab-derivados";
import { TabGruposPecas } from "./tab-grupos-pecas";
import { TabEspecificacoes } from "./tab-especificacoes";
import { TabPreco } from "./tab-preco";
import { TabVidros } from "./tab-vidros";
import { Simulador } from "./simulador";
import type { TipologiaSnapshot, ValidationIssue } from "@/lib/engine";

type Categoria = { id: number; nome: string };

type Props = {
  tipologiaId?: number;
  initial?: {
    snapshot: TipologiaSnapshot;
    categoriaId: number;
    ordem: number;
    ativo: boolean;
    descricao: string | null;
  };
  categorias: Categoria[];
};

export function TipologiaTabs({ tipologiaId, initial, categorias }: Props) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(() =>
    initial
      ? snapshotToForm(
          initial.snapshot,
          initial.categoriaId,
          initial.ordem,
          initial.ativo,
          initial.descricao
        )
      : emptyForm(categorias[0]?.id ?? 1)
  );
  const [tab, setTab] = useState("basicas");
  const [saving, setSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState<ValidationIssue[] | null>(
    null
  );

  // limpa erros servidor quando o form muda
  useEffect(() => {
    setServerErrors(null);
  }, [form]);

  const isVao = form.modoDeProducao === "VAO";

  const save = async () => {
    setSaving(true);
    setServerErrors(null);
    const payload = formToPayload(form);
    try {
      const url = tipologiaId
        ? `/api/tipologias/${tipologiaId}`
        : "/api/tipologias";
      const method = tipologiaId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setServerErrors(body.errors ?? [
          { code: "UNKNOWN", field: "(root)", message: `${res.status}` },
        ]);
        return;
      }
      const body = await res.json();
      if (!tipologiaId && body.id) {
        router.push(`/admin/tipologias/${body.id}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      setServerErrors([
        {
          code: "FORMULA_RUNTIME_ERROR",
          field: "(root)",
          message: err instanceof Error ? err.message : String(err),
        },
      ]);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!tipologiaId) return;
    if (!confirm(`Excluir "${form.nome}"?`)) return;
    const res = await fetch(`/api/tipologias/${tipologiaId}`, {
      method: "DELETE",
    });
    if (res.ok) router.push("/admin");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {tipologiaId
              ? `Editando #${tipologiaId} — ${form.nome || "(sem nome)"}`
              : "Nova tipologia"}
          </h2>
          <div className="flex gap-2">
            {tipologiaId && (
              <Button variant="outline" size="sm" onClick={remove}>
                <Trash2 className="mr-1 size-4" />
                Excluir
              </Button>
            )}
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-1 size-4 animate-spin" />
              ) : (
                <Save className="mr-1 size-4" />
              )}
              Salvar
            </Button>
          </div>
        </div>

        {serverErrors && serverErrors.length > 0 && (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm">
            <p className="font-semibold text-destructive">
              {serverErrors.length} erro
              {serverErrors.length > 1 ? "s" : ""} ao salvar:
            </p>
            <ul className="mt-1 space-y-1 text-xs text-destructive">
              {serverErrors.slice(0, 8).map((e, i) => (
                <li key={i} className="font-mono">
                  [{e.code}] {e.field}: {e.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="basicas">Básicas</TabsTrigger>
            <TabsTrigger value="variaveis">
              Variáveis ({form.variables.length})
            </TabsTrigger>
            {isVao ? (
              <>
                <TabsTrigger value="grupos">
                  Grupos &amp; peças ({form.piece_groups.length})
                </TabsTrigger>
                <TabsTrigger value="derivados">
                  Cálculos ({form.computed_values.length})
                </TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="derivados">
                  Cálculos ({form.computed_values.length})
                </TabsTrigger>
                <TabsTrigger value="especificacoes">
                  Especificações ({form.specification_templates.length})
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="preco">
              Cobrança ({form.pricing_rules.length})
            </TabsTrigger>
            <TabsTrigger value="vidros">
              Vidros ({form.vidros_elegiveis.length})
            </TabsTrigger>
            <TabsTrigger value="acessorios">Acessórios</TabsTrigger>
          </TabsList>
          <TabsContent value="basicas" className="mt-4">
            <TabBasicas
              form={form}
              setForm={setForm}
              categorias={categorias}
              modoLocked={Boolean(tipologiaId)}
            />
          </TabsContent>
          <TabsContent value="variaveis" className="mt-4">
            <TabVariaveis form={form} setForm={setForm} />
          </TabsContent>
          <TabsContent value="derivados" className="mt-4">
            <TabDerivados form={form} setForm={setForm} />
          </TabsContent>
          {isVao ? (
            <TabsContent value="grupos" className="mt-4">
              <TabGruposPecas form={form} setForm={setForm} />
            </TabsContent>
          ) : (
            <TabsContent value="especificacoes" className="mt-4">
              <TabEspecificacoes form={form} setForm={setForm} />
            </TabsContent>
          )}
          <TabsContent value="preco" className="mt-4">
            <TabPreco form={form} setForm={setForm} />
          </TabsContent>
          <TabsContent value="vidros" className="mt-4">
            <TabVidros form={form} setForm={setForm} />
          </TabsContent>
          <TabsContent value="acessorios" className="mt-4">
            <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
              Catálogo de acessórios — em breve
            </p>
          </TabsContent>
        </Tabs>
      </div>

      <div className="min-w-0">
        <Simulador form={form} />
      </div>
    </div>
  );
}
