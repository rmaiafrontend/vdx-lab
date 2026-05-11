import { Hash, List, Ruler, ToggleRight, Wrench } from "lucide-react";
import { Callout } from "@/components/docs/callout";
import { CodeBlock } from "@/components/docs/code-block";
import { InlineCode } from "@/components/docs/inline-code";
import { PageNav } from "@/components/docs/page-nav";
import { RefTable } from "@/components/docs/ref-table";
import { H1, H2, H3, Lead, LI, P, Prose, UL } from "@/components/docs/prose";

export default function VariaveisPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Estrutura de uma tipologia
        </p>
        <H1>Variáveis</H1>
        <Lead>
          Toda tipologia começa com variáveis: os dados que o vendedor preenche
          no wizard. Existem 5 tipos, e cada um tem um comportamento distinto
          de UI e validação.
        </Lead>
      </header>

      <Prose>
        <H2 id="tipos">Os 5 tipos</H2>

        <div className="grid gap-3 sm:grid-cols-2">
          <KindCard
            icon={Ruler}
            color="blue"
            title="DIMENSION"
            subtitle="Largura, altura, espessura"
            blurb="Dimensões físicas em mm/cm/m. O wizard mostra um input numérico com seletor de unidade."
          />
          <KindCard
            icon={Hash}
            color="amber"
            title="COUNT"
            subtitle="Quantidade de folhas, de divisões"
            blurb="Inteiro positivo. O wizard mostra um slider com mínimo e máximo."
          />
          <KindCard
            icon={List}
            color="rose"
            title="OPTION_LIST"
            subtitle="Modelo da torre, acabamento"
            blurb="Escolha entre opções pré-cadastradas (codigo + label). Renderiza como Select."
          />
          <KindCard
            icon={Wrench}
            color="violet"
            title="TECHNICAL_PARAM"
            subtitle="Espessura do perfil, folga"
            blurb="Parâmetro numérico técnico. Aparece em uma seção 'Avançado' colapsável."
          />
          <KindCard
            icon={ToggleRight}
            color="emerald"
            title="BOOLEAN"
            subtitle="Tem bandeira? Tem trinco?"
            blurb="Liga/desliga. Aparece como switch na seção 'Avançado'."
          />
        </div>

        <H2 id="campos">Campos da variável</H2>
        <P>Toda variável compartilha estes campos:</P>

        <RefTable
          headers={["Campo", "Tipo", "Obrigatório", "O que faz"]}
          rows={[
            [
              "codigo",
              "texto",
              "sim",
              "Identificador usado nas fórmulas. Use camelCase (Lvao, Nfolhas).",
            ],
            [
              "label",
              "texto",
              "sim",
              "Nome amigável exibido no wizard.",
            ],
            [
              "kind",
              "enum",
              "sim",
              "DIMENSION | COUNT | OPTION_LIST | TECHNICAL_PARAM | BOOLEAN.",
            ],
            [
              "nivel",
              "enum",
              "sim",
              "ORCAMENTO | VAO | PECA — em qual nível o valor é coletado.",
            ],
            [
              "unit",
              "texto",
              "depende",
              "Unidade exibida ao lado do valor (mm, un, %). Para BOOLEAN/OPTION_LIST fica em branco.",
            ],
            [
              "options",
              "lista",
              "OPTION_LIST",
              "Lista de { codigo, label } exibida no select. Ignorado para os outros kinds.",
            ],
            [
              "required",
              "booleano",
              "sim",
              "Se obrigatório, o vendedor não consegue avançar sem preencher.",
            ],
            [
              "defaultValue",
              "expressão",
              "não",
              "Valor inicial. Pode ser número literal ou expressão (avaliada em escopo VAO).",
            ],
            [
              "minValue",
              "expressão",
              "não",
              "Limite mínimo. Pode ser expressão (ex.: ceil(Lvao/1200)).",
            ],
            [
              "maxValue",
              "expressão",
              "não",
              "Limite máximo. Mesma regra do mínimo.",
            ],
            [
              "ordem",
              "número",
              "sim",
              "Posição na lista de inputs (dentro do mesmo kind).",
            ],
          ]}
          monoColumns={[0, 1]}
        />

        <Callout variant="info" title="min/max podem ser expressões">
          Em vez de um número fixo, você pode escrever{" "}
          <InlineCode>{`ceil(Lvao / 1200)`}</InlineCode> em{" "}
          <InlineCode>minValue</InlineCode>. A engine reavalia o limite quando
          outras variáveis mudam — útil em varandas onde o número mínimo de
          folhas depende da largura do vão.
        </Callout>

        <H2 id="exemplos">Exemplos por tipo</H2>

        <H3 id="ex-dimension">DIMENSION — Largura do vão</H3>
        <CodeBlock label="JSON">{`{
  "codigo": "Lvao",
  "label": "Largura do vão",
  "kind": "DIMENSION",
  "nivel": "VAO",
  "unit": "mm",
  "required": true,
  "minValue": "2000",
  "maxValue": "8000",
  "ordem": 1
}`}</CodeBlock>
        <P>
          O wizard mostra um input numérico grande com seletor de unidade
          (mm/cm/m). Internamente, a engine recebe o valor em mm sempre.
        </P>

        <H3 id="ex-count">COUNT — Quantidade de folhas</H3>
        <CodeBlock label="JSON">{`{
  "codigo": "Nfolhas",
  "label": "Quantidade de folhas",
  "kind": "COUNT",
  "nivel": "VAO",
  "unit": "un",
  "required": true,
  "minValue": "3",
  "maxValue": "10",
  "defaultValue": "5",
  "ordem": 3
}`}</CodeBlock>
        <P>
          O wizard mostra um slider de 3 a 10 com valor inicial 5. O vendedor
          arrasta e o diagrama atualiza ao vivo.
        </P>

        <H3 id="ex-option-list">OPTION_LIST — Modelo da torre</H3>
        <CodeBlock label="JSON">{`{
  "codigo": "ModeloTorre",
  "label": "Modelo da torre",
  "kind": "OPTION_LIST",
  "nivel": "PECA",
  "unit": null,
  "required": true,
  "defaultValue": "T01",
  "options": [
    { "codigo": "T01", "label": "Torre padrão 8mm" },
    { "codigo": "T02", "label": "Torre reforçada 10mm" }
  ],
  "ordem": 1
}`}</CodeBlock>
        <P>
          O wizard mostra um select com as opções definidas em{" "}
          <InlineCode>options</InlineCode>. O valor salvo é o{" "}
          <InlineCode>codigo</InlineCode>, que fica disponível nas fórmulas
          (ex.: <InlineCode>precoTorre(ModeloTorre)</InlineCode>).
        </P>

        <H3 id="ex-tech">TECHNICAL_PARAM — Espessura do perfil</H3>
        <CodeBlock label="JSON">{`{
  "codigo": "Pperfil",
  "label": "Espessura do perfil",
  "kind": "TECHNICAL_PARAM",
  "nivel": "VAO",
  "unit": "mm",
  "required": false,
  "defaultValue": "50",
  "ordem": 4
}`}</CodeBlock>
        <P>
          Vai para a seção <strong>Avançado</strong> do wizard, colapsada por
          padrão. O vendedor raramente mexe — o valor padrão (50 mm) já cobre
          a maior parte dos casos.
        </P>

        <H3 id="ex-bool">BOOLEAN — Tem bandeira?</H3>
        <CodeBlock label="JSON">{`{
  "codigo": "temBandeira",
  "label": "Tem bandeira?",
  "kind": "BOOLEAN",
  "nivel": "VAO",
  "unit": null,
  "required": false,
  "defaultValue": "false",
  "ordem": 5
}`}</CodeBlock>
        <P>
          Aparece como switch na seção Avançado. Útil para acionar regras de
          preço condicionais ou ativar grupos extras.
        </P>

        <H2 id="ordem-ui">Ordem na UI</H2>
        <P>
          O wizard agrupa os inputs por <strong>kind</strong>, não pelo campo{" "}
          <InlineCode>ordem</InlineCode>:
        </P>
        <UL>
          <LI>
            <strong>COUNT</strong> primeiro — porque mexer na contagem
            reorganiza o diagrama, e o vendedor precisa fixar isso antes.
          </LI>
          <LI>
            <strong>DIMENSION</strong> em seguida — input principal de medidas.
          </LI>
          <LI>
            <strong>OPTION_LIST</strong> depois das medidas — escolhas
            categóricas (modelo, acabamento).
          </LI>
          <LI>
            <strong>TECHNICAL_PARAM</strong> e <strong>BOOLEAN</strong> dentro
            de <strong>Avançado</strong> (colapsado por padrão).
          </LI>
        </UL>
        <P>
          Dentro de cada faixa, a ordem secundária respeita o campo{" "}
          <InlineCode>ordem</InlineCode>.
        </P>
      </Prose>

      <PageNav href="/docs/variaveis" />
    </article>
  );
}

function KindCard({
  icon: Icon,
  color,
  title,
  subtitle,
  blurb,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "amber" | "violet" | "emerald" | "rose";
  title: string;
  subtitle: string;
  blurb: string;
}) {
  const colorClasses: Record<typeof color, { bg: string; text: string; border: string }> = {
    blue: {
      bg: "bg-blue-500/10",
      text: "text-blue-300",
      border: "border-blue-500/30",
    },
    amber: {
      bg: "bg-amber-500/10",
      text: "text-amber-300",
      border: "border-amber-500/30",
    },
    violet: {
      bg: "bg-violet-500/10",
      text: "text-violet-300",
      border: "border-violet-500/30",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-300",
      border: "border-emerald-500/30",
    },
    rose: {
      bg: "bg-rose-500/10",
      text: "text-rose-300",
      border: "border-rose-500/30",
    },
  };
  const c = colorClasses[color];
  return (
    <div className="flex gap-3 rounded-lg border border-border/60 bg-card/40 p-4">
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-md border ${c.bg} ${c.border} ${c.text}`}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 space-y-1">
        <p className={`font-mono text-xs font-semibold uppercase ${c.text}`}>
          {title}
        </p>
        <p className="text-sm font-semibold text-foreground">{subtitle}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{blurb}</p>
      </div>
    </div>
  );
}
