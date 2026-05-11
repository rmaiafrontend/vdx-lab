import { Callout } from "@/components/docs/callout";
import { CodeBlock } from "@/components/docs/code-block";
import { InlineCode } from "@/components/docs/inline-code";
import { PageNav } from "@/components/docs/page-nav";
import { RefTable } from "@/components/docs/ref-table";
import { H1, H2, Lead, P, Prose, UL, LI } from "@/components/docs/prose";

export default function SeletoresPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Estrutura de uma tipologia
        </p>
        <H1>Seletores</H1>
        <Lead>
          Um seletor decide quais índices do grupo recebem um papel. A engine
          tem 11 tipos prontos — do mais simples (todas as peças) ao mais
          flexível (expressão arbitrária).
        </Lead>
      </header>

      <Prose>
        <H2 id="lista">Os 11 tipos</H2>
        <P>
          Cada papel tem dois campos relacionados:{" "}
          <InlineCode>selectorKind</InlineCode> (o tipo) e{" "}
          <InlineCode>selectorValue</InlineCode> (parâmetro, quando aplicável).
        </P>

        <RefTable
          headers={["Tipo", "Valor esperado", "Cobertura", "Exemplo"]}
          rows={[
            [
              "ALL",
              "—",
              "Todos os índices (1..TOTAL).",
              "Único papel do grupo.",
            ],
            ["FIRST", "—", "Apenas o índice 1.", "Canto esquerdo."],
            ["LAST", "—", "Apenas o índice TOTAL.", "Canto direito."],
            [
              "FIRST_AND_LAST",
              "—",
              "Índices 1 e TOTAL (se TOTAL ≥ 2).",
              "Borda esquerda + direita compartilham papel.",
            ],
            [
              "EXCEPT_FIRST_LAST",
              "—",
              "Índices 2 a TOTAL-1.",
              "Folhas centrais de uma varanda.",
            ],
            [
              "INDEX",
              <InlineCode key="i">"3"</InlineCode>,
              "Apenas o índice especificado.",
              "Posição fixa numa configuração específica.",
            ],
            [
              "INDEX_LIST",
              <InlineCode key="il">"1,3,5"</InlineCode>,
              "Vários índices listados, separados por vírgula.",
              "Folhas alternadas em posições conhecidas.",
            ],
            [
              "RANGE",
              <InlineCode key="r">"2..N-1"</InlineCode>,
              "Intervalo contínuo. Os dois lados são expressões.",
              "Cobre miolo do grupo até a penúltima.",
            ],
            ["ODD", "—", "Índices ímpares (1, 3, 5...).", "Painéis fixos alternados."],
            ["EVEN", "—", "Índices pares (2, 4, 6...).", "Painéis móveis alternados."],
            [
              "EXPRESSION",
              <InlineCode key="e">"INDEX % 2 == 0"</InlineCode>,
              "Expressão booleana avaliada para cada índice. Inclui se for true.",
              "Casos arbitrários que não cabem nos outros.",
            ],
          ]}
          monoColumns={[0, 1]}
        />

        <H2 id="expression">EXPRESSION em detalhe</H2>
        <P>
          O escopo da expressão dentro de <InlineCode>EXPRESSION</InlineCode> é
          limitado a quatro símbolos:
        </P>
        <UL>
          <LI>
            <InlineCode>INDEX</InlineCode> — posição da peça (1 a TOTAL).
          </LI>
          <LI>
            <InlineCode>TOTAL</InlineCode> — quantidade total do grupo.
          </LI>
          <LI>
            <InlineCode>IS_FIRST</InlineCode> — booleano, INDEX === 1.
          </LI>
          <LI>
            <InlineCode>IS_LAST</InlineCode> — booleano, INDEX === TOTAL.
          </LI>
        </UL>
        <P>
          A engine avalia a expressão para cada índice; se o resultado for{" "}
          <InlineCode>true</InlineCode>, aquele índice entra no papel.
        </P>

        <CodeBlock label="exemplos EXPRESSION">{`INDEX > 2 && INDEX < TOTAL    →  miolo (excluindo as duas primeiras e a última)
INDEX % 3 == 0                →  cada terceira peça
IS_FIRST || IS_LAST           →  bordas (equivale a FIRST_AND_LAST)
INDEX <= floor(TOTAL / 2)     →  primeira metade do grupo`}</CodeBlock>

        <H2 id="range">RANGE em detalhe</H2>
        <P>
          O <InlineCode>selectorValue</InlineCode> de RANGE usa{" "}
          <InlineCode>..</InlineCode> como separador. Os dois lados são
          expressões com acesso a <InlineCode>N</InlineCode> e{" "}
          <InlineCode>TOTAL</InlineCode>:
        </P>
        <CodeBlock label="exemplos RANGE">{`"2..TOTAL-1"             →  do 2 ao penúltimo (= EXCEPT_FIRST_LAST)
"1..ceil(TOTAL/2)"       →  primeira metade
"floor(TOTAL/2)+1..TOTAL"→  segunda metade`}</CodeBlock>

        <H2 id="cobertura">Validação de cobertura</H2>
        <P>
          A regra crítica: cada índice de 1 a TOTAL precisa estar coberto por{" "}
          <strong>exatamente um papel</strong>. A engine valida isso ao salvar
          a tipologia, simulando valores plausíveis de TOTAL (min, max,
          default das variáveis referenciadas).
        </P>

        <RefTable
          headers={["Erro", "Significa", "Como resolver"]}
          rows={[
            [
              "SELECTOR_GAP",
              "Algum índice não foi coberto por nenhum papel.",
              "Adicione papel para o índice faltante ou ajuste seletores existentes.",
            ],
            [
              "SELECTOR_OVERLAP",
              "Dois ou mais papéis cobrem o mesmo índice.",
              "Refine os seletores para que sejam mutuamente exclusivos.",
            ],
            [
              "SELECTOR_OUT_OF_RANGE",
              "Um seletor referencia índice fora de [1, TOTAL] (ex.: INDEX=10 num grupo com 5 peças).",
              "Use seletores relativos (LAST, EXCEPT_FIRST_LAST) em vez de índices fixos.",
            ],
          ]}
          monoColumns={[0]}
        />

        <Callout variant="tip" title="Prefira seletores semânticos">
          Use <InlineCode>FIRST</InlineCode>, <InlineCode>LAST</InlineCode> e{" "}
          <InlineCode>EXCEPT_FIRST_LAST</InlineCode> sempre que possível. Eles
          se adaptam quando a quantidade de peças muda; índices fixos como{" "}
          <InlineCode>INDEX 3</InlineCode> quebram em configurações com poucas
          peças.
        </Callout>
      </Prose>

      <PageNav href="/docs/seletores" />
    </article>
  );
}
