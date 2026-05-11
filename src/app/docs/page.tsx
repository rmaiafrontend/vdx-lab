import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Callout } from "@/components/docs/callout";
import { CodeBlock } from "@/components/docs/code-block";
import { InlineCode } from "@/components/docs/inline-code";
import { PageNav } from "@/components/docs/page-nav";
import {
  H1,
  H2,
  Lead,
  P,
  Prose,
  UL,
  LI,
} from "@/components/docs/prose";

export default function DocsLandingPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Introdução
        </p>
        <H1>Documentação do lab</H1>
        <Lead>
          Como funciona a engine de tipologias e como cadastrar configurações
          que o vendedor vai usar no simulador.
        </Lead>
      </header>

      <Prose>
        <P>
          Esta documentação é dirigida a quem cadastra tipologias no admin. Ela
          explica os conceitos centrais (variáveis, valores derivados, grupos
          de peças, papéis, regras de preço), a sintaxe das fórmulas e três
          receitas comentadas que servem de molde para tipologias novas.
        </P>

        <Callout variant="info" title="Para quem é esta documentação">
          Você precisa criar uma tipologia nova ou entender por que uma
          existente comporta-se de determinada forma no wizard. Aqui estão os
          conceitos e exemplos. Se você é o vendedor que apenas cota peças,
          o wizard já cuida disso por você.
        </Callout>

        <H2 id="conceitos-centrais">Os 5 conceitos centrais</H2>
        <P>
          Toda tipologia é descrita por cinco entidades. Domine essas cinco e
          tudo o mais decorre delas:
        </P>

        <div className="grid gap-3 sm:grid-cols-2">
          <ConceptCard
            title="Variável"
            description="Dado que o vendedor preenche no wizard. Pode ser dimensão, contagem, parâmetro técnico ou sim/não."
            href="/docs/variaveis"
          />
          <ConceptCard
            title="Valor derivado"
            description="Cálculo intermediário que reaproveita variáveis. Não aparece como input — é avaliado pela engine."
            href="/docs/derivados"
          />
          <ConceptCard
            title="Grupo de peças"
            description="Agrupa peças semelhantes. Tem um quantity expression que define quantas peças o grupo gera."
            href="/docs/grupos-pecas"
          />
          <ConceptCard
            title="Papel"
            description="Define como uma ou mais peças do grupo são calculadas. Cada papel tem seletor + largura + altura."
            href="/docs/grupos-pecas"
          />
          <ConceptCard
            title="Regra de preço"
            description="Como o orçamento é montado. Tem base de cobrança, alvo e expressão. O total é a soma das regras ativas."
            href="/docs/precos"
          />
        </div>

        <H2 id="fluxo">Como a engine avalia uma tipologia</H2>
        <P>
          Quando o vendedor preenche os inputs no wizard, a engine percorre seis
          etapas em ordem:
        </P>
        <CodeBlock label="pipeline">{`1. Conversão de unidade   →  todas DIMENSION viram mm
2. Validação              →  required, type, min/max
3. VAO scope              →  variáveis + valores derivados (escopo VAO)
4. Loop por grupo         →  quantity → roles → peças
5. Agregação              →  área total, contagem por papel
6. Preço                  →  regras ativas (filtradas por condition)`}</CodeBlock>
        <P>
          Cada etapa é detalhada em{" "}
          <Link
            href="/docs/pipeline"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Pipeline
          </Link>
          .
        </P>

        <H2 id="por-onde-comecar">Por onde começar</H2>
        <P>
          Três caminhos, dependendo do que você precisa:
        </P>
        <UL>
          <LI>
            <strong>Quero entender os conceitos.</strong> Comece em{" "}
            <Link
              href="/docs/pipeline"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Pipeline
            </Link>{" "}
            e siga a sidebar até{" "}
            <Link
              href="/docs/precos"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Preço
            </Link>
            .
          </LI>
          <LI>
            <strong>Quero copiar uma receita.</strong> Vá direto para uma das{" "}
            <Link
              href="/docs/receitas/varanda"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Receitas
            </Link>{" "}
            — três tipologias reais, com cada decisão comentada.
          </LI>
          <LI>
            <strong>Tenho uma dúvida pontual.</strong> Use a sidebar para pular
            direto para o tópico (seletor, função de fórmula, base de
            cobrança). Cada página é independente.
          </LI>
        </UL>

        <H2 id="convencoes">Convenções desta documentação</H2>
        <UL>
          <LI>
            Códigos de variáveis e fórmulas em <InlineCode>fonte mono</InlineCode>.
          </LI>
          <LI>
            Tabelas de referência aparecem nas páginas{" "}
            <Link
              href="/docs/seletores"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Seletores
            </Link>
            ,{" "}
            <Link
              href="/docs/precos"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Preço
            </Link>{" "}
            e{" "}
            <Link
              href="/docs/formulas"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Linguagem de fórmula
            </Link>
            .
          </LI>
          <LI>
            Caixas coloridas marcam{" "}
            <span className="font-semibold text-blue-300">informações</span>,{" "}
            <span className="font-semibold text-amber-300">avisos</span> e{" "}
            <span className="font-semibold text-emerald-300">dicas</span>.
          </LI>
        </UL>
      </Prose>

      <PageNav href="/docs" />
    </article>
  );
}

function ConceptCard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col gap-1 rounded-lg border border-border/60 bg-card/40 p-4 transition-colors hover:border-primary/40 hover:bg-card/60"
    >
      <p className="text-sm font-semibold tracking-tight text-foreground">
        {title}
      </p>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {description}
      </p>
      <span className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        ler mais
        <ArrowRight className="size-3" />
      </span>
    </Link>
  );
}
