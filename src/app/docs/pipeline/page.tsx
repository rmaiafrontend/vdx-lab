import { Callout } from "@/components/docs/callout";
import { CodeBlock } from "@/components/docs/code-block";
import { InlineCode } from "@/components/docs/inline-code";
import { PageNav } from "@/components/docs/page-nav";
import { RefTable } from "@/components/docs/ref-table";
import {
  H1,
  H2,
  Lead,
  LI,
  OL,
  P,
  Prose,
  UL,
} from "@/components/docs/prose";

export default function PipelinePage() {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Conceitos
        </p>
        <H1>Pipeline</H1>
        <Lead>
          A engine avalia uma tipologia em seis etapas determinísticas. Entender
          a ordem ajuda a saber o que está disponível em cada fórmula.
        </Lead>
      </header>

      <Prose>
        <H2 id="etapas">As 6 etapas em ordem</H2>
        <P>
          Toda chamada da engine (seja o wizard ao vivo ou o simulador no
          admin) segue exatamente estes passos:
        </P>
        <OL>
          <LI>
            <strong>Conversão de unidade.</strong> Todas as variáveis{" "}
            <InlineCode>DIMENSION</InlineCode> são convertidas para mm. A unidade
            global do request (mm/cm/m) controla esse fator de conversão. A
            partir daqui tudo internamente está em mm.
          </LI>
          <LI>
            <strong>Validação de variáveis.</strong> Required, type checks
            (número/booleano), faixa min/max. Se algo falha, a engine para e
            retorna um <InlineCode>ValidationError</InlineCode>.
          </LI>
          <LI>
            <strong>Escopo VAO.</strong> Carrega todas as variáveis e avalia os
            valores derivados de escopo VAO em ordem de{" "}
            <InlineCode>orderInScope</InlineCode>. Tudo que sobreviver fica
            visível para os passos seguintes.
          </LI>
          <LI>
            <strong>Loop por grupo.</strong> Para cada{" "}
            <InlineCode>PieceGroup</InlineCode> em ordem de{" "}
            <InlineCode>ordem</InlineCode>: avalia{" "}
            <InlineCode>quantityExpression</InlineCode>, em seguida os
            derivados de escopo GROUP, e depois itera de{" "}
            <InlineCode>1</InlineCode> a <InlineCode>GROUP_TOTAL</InlineCode>{" "}
            criando peças. A cada peça resolve o papel via seletor e avalia
            largura/altura.
          </LI>
          <LI>
            <strong>Agregação.</strong> Soma área real, área de cobrança e
            quantidade total. Também agrega contagem por grupo e por papel.
          </LI>
          <LI>
            <strong>Preço.</strong> Itera as <InlineCode>PricingRules</InlineCode>{" "}
            ativas em ordem; cada regra é descartada se a condição (opcional) é
            falsa. O total é a soma dos componentes.
          </LI>
        </OL>

        <H2 id="escopos">Os 3 escopos</H2>
        <P>
          A engine tem três escopos de avaliação. Cada escopo herda o anterior,
          mas adiciona variáveis especiais. Escolher o escopo certo é a
          decisão mais importante ao criar uma tipologia.
        </P>

        <RefTable
          headers={["Escopo", "Disponível", "Quando usar"]}
          rows={[
            [
              <strong key="vao">VAO</strong>,
              <span key="vao-d">
                Variáveis +{" "}
                <InlineCode>ComputedValue</InlineCode>{" "}
                (escopo=VAO)
              </span>,
              "Cálculos que valem para o vão inteiro: largura útil, altura útil, espessura média.",
            ],
            [
              <strong key="grp">GROUP</strong>,
              <span key="grp-d">
                Tudo do VAO + <InlineCode>GROUP_TOTAL</InlineCode> +{" "}
                <InlineCode>ComputedValue</InlineCode> (escopo=GROUP)
              </span>,
              "Cálculos que dependem da quantidade de peças do grupo (ex.: largura por folha).",
            ],
            [
              <strong key="pc">PIECE</strong>,
              <span key="pc-d">
                Tudo do GROUP +{" "}
                <InlineCode>INDEX</InlineCode>,{" "}
                <InlineCode>TOTAL</InlineCode>,{" "}
                <InlineCode>IS_FIRST</InlineCode>,{" "}
                <InlineCode>IS_LAST</InlineCode>,{" "}
                <InlineCode>ROLE</InlineCode>
              </span>,
              "Cálculos que dependem da posição da peça no grupo (ex.: borda esquerda paga reforço).",
            ],
          ]}
          monoColumns={[]}
        />

        <H2 id="variaveis-especiais">Variáveis especiais</H2>
        <P>
          Algumas variáveis são injetadas pela engine — você não as cadastra,
          elas aparecem automaticamente nos escopos certos.
        </P>

        <RefTable
          headers={["Nome", "Tipo", "Onde", "Descrição"]}
          rows={[
            [
              "GROUP_TOTAL",
              "número",
              "GROUP, PIECE",
              "Quantidade total de peças do grupo atual.",
            ],
            [
              "INDEX",
              "número",
              "PIECE",
              "Posição 1-baseada da peça dentro do grupo (1, 2, 3...).",
            ],
            [
              "TOTAL",
              "número",
              "PIECE",
              <span key="t">
                Alias para <InlineCode>GROUP_TOTAL</InlineCode> (mais legível em fórmulas de seletor).
              </span>,
            ],
            [
              "IS_FIRST",
              "booleano",
              "PIECE",
              <span key="f">
                Verdadeiro quando <InlineCode>INDEX === 1</InlineCode>.
              </span>,
            ],
            [
              "IS_LAST",
              "booleano",
              "PIECE",
              <span key="l">
                Verdadeiro quando <InlineCode>INDEX === TOTAL</InlineCode>.
              </span>,
            ],
            [
              "ROLE",
              "texto",
              "PIECE",
              "Código do papel atribuído à peça pelo seletor.",
            ],
          ]}
          monoColumns={[0, 1]}
        />

        <H2 id="arredondamento">Regras de arredondamento</H2>
        <P>
          Depois que a engine avalia largura e altura de cada peça, aplica
          arredondamento em duas camadas:
        </P>
        <UL>
          <LI>
            <strong>Real (corte da peça).</strong>{" "}
            <InlineCode>{`wReal = floor(largura)`}</InlineCode> e{" "}
            <InlineCode>{`hReal = floor(altura)`}</InlineCode>. Sempre arredonda
            para baixo, em mm.
          </LI>
          <LI>
            <strong>Cobrança (área que entra no preço).</strong>{" "}
            <InlineCode>{`wCobranca = ceil(wReal/50) * 50`}</InlineCode> e
            mesmo para altura. Sobe para o múltiplo de 50 mm mais próximo, que
            é o padrão da indústria.
          </LI>
        </UL>

        <Callout variant="info" title="Por que duas medidas?">
          O <strong>real</strong> é o que vai para a fábrica cortar. A{" "}
          <strong>cobrança</strong> é o que aparece no orçamento. A diferença
          existe porque o vidro só é vendido em frações de 50 mm — uma peça
          de 1.234 mm é cobrada como 1.250 mm.
        </Callout>

        <H2 id="conversao-unidade">Conversão de unidade</H2>
        <P>
          A conversão de unidade acontece <strong>uma única vez</strong> no
          início do pipeline. O wizard envia os valores na unidade que o
          vendedor escolheu, junto com a unidade global (
          <InlineCode>mm</InlineCode>, <InlineCode>cm</InlineCode> ou{" "}
          <InlineCode>m</InlineCode>). A engine multiplica todas as variáveis{" "}
          <InlineCode>DIMENSION</InlineCode> pelo fator correspondente:
        </P>

        <CodeBlock label="fatores">{`mm → ×1
cm → ×10
m  → ×1000`}</CodeBlock>

        <P>
          Depois disso, todas as fórmulas operam em mm. Variáveis{" "}
          <InlineCode>COUNT</InlineCode>, <InlineCode>BOOLEAN</InlineCode> e{" "}
          <InlineCode>TECHNICAL_PARAM</InlineCode> não são convertidas — só
          dimensões.
        </P>

        <Callout variant="warning" title="Erros mudam a tipologia">
          Se uma fórmula falha (divisão por zero, referência inexistente,
          tipologia inválida), a engine para no ponto do erro e retorna o
          código + a mensagem. O wizard mostra a mensagem traduzida ao
          vendedor; o admin vê o código técnico no simulador.
        </Callout>
      </Prose>

      <PageNav href="/docs/pipeline" />
    </article>
  );
}
