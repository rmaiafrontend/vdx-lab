import { Callout } from "@/components/docs/callout";
import { CodeBlock } from "@/components/docs/code-block";
import { InlineCode } from "@/components/docs/inline-code";
import { PageNav } from "@/components/docs/page-nav";
import { RefTable } from "@/components/docs/ref-table";
import { H1, H2, H3, Lead, LI, P, Prose, UL } from "@/components/docs/prose";

export default function PrecosPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Estrutura de uma tipologia
        </p>
        <H1>Preço</H1>
        <Lead>
          Cada componente do orçamento (vidro, ferragem, instalação, mão de
          obra, beneficiamento, outros) é uma regra com base de cobrança e
          expressão. O total é a soma das regras ativas que passam na condição.
        </Lead>
      </header>

      <Prose>
        <H2 id="anatomia">Anatomia de uma regra</H2>
        <CodeBlock label="JSON">{`{
  "codigo": "VIDRO_M2",
  "label": "Vidro por m²",
  "componentKind": "VIDRO",
  "basis": "PER_M2",
  "appliesTo": "TIPOLOGIA",
  "appliesToValue": null,
  "expression": "precoVidro(VidroId)",
  "condition": null,
  "ordem": 1,
  "ativo": true
}`}</CodeBlock>
        <UL>
          <LI>
            <strong>componentKind</strong> — categoria semântica (6 opções fixas).
          </LI>
          <LI>
            <strong>basis</strong> — como o valor é multiplicado (por m², por peça, fixo, etc.).
          </LI>
          <LI>
            <strong>appliesTo</strong> + <strong>appliesToValue</strong> — em
            quais peças/grupos/specs a regra incide.
          </LI>
          <LI>
            <strong>expression</strong> — fórmula que produz o valor unitário.
          </LI>
          <LI>
            <strong>condition</strong> — opcional. Regra é pulada se a condição
            avaliar como falsa.
          </LI>
        </UL>

        <H2 id="kinds">Tipos de componente</H2>
        <RefTable
          headers={["Kind", "Categoria", "Cor no breakdown"]}
          rows={[
            ["VIDRO", "Vidro (cobrança por m²).", <span key="b" className="text-blue-300">azul</span>],
            ["FERRAGEM", "Ferragens, suportes, fechaduras.", <span key="a" className="text-amber-300">âmbar</span>],
            ["INSTALACAO", "Custo de instalação no local.", <span key="e" className="text-emerald-300">esmeralda</span>],
            ["MAO_OBRA", "Mão de obra direta.", <span key="v" className="text-violet-300">violeta</span>],
            ["BENEFICIAMENTO", "Beneficiamentos do vidro (tempera, lapidação, furos, etc.).", <span key="r" className="text-rose-300">rosa</span>],
            ["OUTRO", "Despesas que não cabem nas anteriores.", <span key="z" className="text-zinc-300">zinc</span>],
          ]}
          monoColumns={[0]}
        />
        <P>
          O kind é apenas semântico — define a cor no breakdown do simulador
          admin e ajuda a categorizar. O cálculo em si depende de{" "}
          <InlineCode>basis</InlineCode>.
        </P>

        <H2 id="bases">Bases de cobrança</H2>
        <RefTable
          headers={["Basis", "Escopo da expressão", "Quando dispara", "Multiplicação"]}
          rows={[
            [
              "PER_M2",
              "VAO",
              "Sempre (se condition true).",
              "Resultado × área de cobrança do alvo (em m²).",
            ],
            [
              "PER_PIECE",
              "PIECE",
              "Para cada peça do alvo.",
              "Soma do resultado avaliado em cada peça.",
            ],
            [
              "PER_GROUP",
              "GROUP",
              "Uma vez por grupo do alvo (se tem peça).",
              "Resultado × 1 (por grupo). Não escala com peças.",
            ],
            [
              "PER_VAO",
              "VAO",
              "Uma vez por vão.",
              "Resultado direto, sem multiplicação.",
            ],
            [
              "PER_ORCAMENTO",
              "VAO",
              "Uma vez por orçamento (independe de vão/peça).",
              "Resultado direto. Útil para taxas globais do orçamento.",
            ],
            [
              "PER_SPECIFICATION",
              "PIECE",
              "Para cada especificação que casa com o filtro (modo MEDIDA).",
              "Soma do resultado avaliado em cada especificação, com seus atributos no escopo.",
            ],
            [
              "FIXED",
              "VAO",
              "Sempre (se condition true).",
              "Resultado direto, geralmente um número literal.",
            ],
          ]}
          monoColumns={[0, 1]}
        />

        <H2 id="applies-to">Aplica em</H2>
        <RefTable
          headers={["appliesTo", "Valor esperado em appliesToValue", "Efeito"]}
          rows={[
            ["TIPOLOGIA", "(null)", "Regra incide sobre o vão inteiro."],
            [
              "GROUP_CODE",
              <InlineCode key="g">&quot;FOLHAS&quot;</InlineCode>,
              "Apenas peças do grupo informado.",
            ],
            [
              "ROLE_CODE",
              <InlineCode key="r">&quot;CANTO_ESQ,CANTO_DIR&quot;</InlineCode>,
              "Apenas peças com algum dos papéis listados (separados por vírgula).",
            ],
            [
              "SPECIFICATION_TYPE",
              <InlineCode key="s">&quot;FURO&quot;</InlineCode>,
              "Modo MEDIDA: apenas especificações cujo tipo case com o valor (use junto com basis PER_SPECIFICATION).",
            ],
          ]}
          monoColumns={[0, 1]}
        />

        <H2 id="exemplos">Exemplos por basis</H2>

        <H3 id="ex-per-m2">PER_M2 + TIPOLOGIA — vidro do vão</H3>
        <CodeBlock label="JSON">{`{
  "componentKind": "VIDRO",
  "basis": "PER_M2",
  "appliesTo": "TIPOLOGIA",
  "expression": "precoVidro(VidroId)"
}`}</CodeBlock>
        <P>
          A engine multiplica o resultado de{" "}
          <InlineCode>precoVidro(VidroId)</InlineCode> pela área de cobrança
          total. Se o vidro escolhido custa R$ 280/m² e a tipologia tem 8 m²,
          a regra contribui R$ 2.240.
        </P>

        <H3 id="ex-per-piece">PER_PIECE + ROLE_CODE — ferragem só nos cantos</H3>
        <CodeBlock label="JSON">{`{
  "componentKind": "FERRAGEM",
  "basis": "PER_PIECE",
  "appliesTo": "ROLE_CODE",
  "appliesToValue": "CANTO_ESQ,CANTO_DIR",
  "expression": "180.00"
}`}</CodeBlock>
        <P>
          Para cada peça com papel <InlineCode>CANTO_ESQ</InlineCode> ou{" "}
          <InlineCode>CANTO_DIR</InlineCode>, soma R$ 180. Numa varanda
          padrão são exatamente 2 peças → R$ 360.
        </P>

        <H3 id="ex-per-vao">PER_VAO — instalação proporcional</H3>
        <CodeBlock label="JSON">{`{
  "componentKind": "INSTALACAO",
  "basis": "PER_VAO",
  "appliesTo": "TIPOLOGIA",
  "expression": "350 + 80 * Nfolhas"
}`}</CodeBlock>
        <P>
          Avaliada uma vez por vão. Pode usar variáveis VAO. Aqui: R$ 350 fixo
          + R$ 80 por folha.
        </P>

        <H3 id="ex-per-group">PER_GROUP — ferragem do box</H3>
        <CodeBlock label="JSON">{`{
  "componentKind": "FERRAGEM",
  "basis": "PER_GROUP",
  "appliesTo": "GROUP_CODE",
  "appliesToValue": "FOLHAS",
  "expression": "420.00"
}`}</CodeBlock>
        <P>
          R$ 420 cobrados <strong>uma vez</strong> pelo grupo, independente da
          quantidade de peças dele.
        </P>

        <H3 id="ex-per-orcamento">PER_ORCAMENTO — taxa do orçamento</H3>
        <CodeBlock label="JSON">{`{
  "componentKind": "OUTRO",
  "basis": "PER_ORCAMENTO",
  "appliesTo": "TIPOLOGIA",
  "expression": "120"
}`}</CodeBlock>
        <P>
          R$ 120 aplicados <strong>uma vez por orçamento</strong>, independente
          de quantos vãos/peças ele tenha. Útil para taxas globais (frete, ART,
          deslocamento) que não escalam com a tipologia.
        </P>

        <H3 id="ex-per-specification">
          PER_SPECIFICATION + SPECIFICATION_TYPE — beneficiamento por furo
        </H3>
        <CodeBlock label="JSON">{`{
  "componentKind": "BENEFICIAMENTO",
  "basis": "PER_SPECIFICATION",
  "appliesTo": "SPECIFICATION_TYPE",
  "appliesToValue": "FURO",
  "expression": "25 + diametro * 0.5"
}`}</CodeBlock>
        <P>
          Só existe no modo <strong>MEDIDA_DE_PRODUCAO</strong>. Para cada
          especificação cujo <InlineCode>tipo</InlineCode> seja{" "}
          <InlineCode>FURO</InlineCode>, a expressão é avaliada com os
          atributos da spec disponíveis no escopo (ex.:{" "}
          <InlineCode>diametro</InlineCode>). Sem o filtro{" "}
          <InlineCode>appliesToValue</InlineCode>, todas as especificações da
          peça entram.
        </P>

        <H3 id="ex-fixed">FIXED — taxa fixa</H3>
        <CodeBlock label="JSON">{`{
  "componentKind": "OUTRO",
  "basis": "FIXED",
  "appliesTo": "TIPOLOGIA",
  "expression": "150"
}`}</CodeBlock>
        <P>R$ 150 fixos, sem dependência de medidas.</P>

        <H2 id="condition">Condições</H2>
        <P>
          O campo <InlineCode>condition</InlineCode> permite ligar/desligar uma
          regra com base em outras variáveis. Avaliada em escopo VAO. Se ela
          retorna falso, a regra é pulada.
        </P>
        <CodeBlock label="exemplo">{`{
  "expression": "180.00",
  "condition": "Nfolhas > 4"
}`}</CodeBlock>
        <P>
          Esta regra só aplica em vãos com mais de 4 folhas. Em configurações
          menores, é como se a regra não existisse.
        </P>

        <Callout variant="info" title="O vendedor vê só o total">
          Por design, o wizard mostra apenas o <strong>total estimado</strong>{" "}
          ao vendedor — a quebra por componente fica restrita ao admin. Isso
          impede que o cliente final saiba a margem por categoria. O simulador
          admin mostra o breakdown completo para conferência.
        </Callout>

        <H2 id="precoVidro">A função <InlineCode>precoVidro</InlineCode></H2>
        <P>
          Função built-in de domínio. Recebe o ID do vidro selecionado
          (variável especial <InlineCode>VidroId</InlineCode> disponível no
          escopo de pricing) e retorna o preço por m². Cor e espessura nunca
          são variáveis — ambas são intrínsecas ao vidro escolhido a partir
          dos vidros elegíveis para a tipologia.
        </P>
        <CodeBlock label="uso típico">{`precoVidro(VidroId)   →  preço/m² do vidro escolhido pelo orçamento
precoVidro(7)         →  força um id de vidro específico do catálogo`}</CodeBlock>
        <P>
          O catálogo de vidros (cor + espessura + preço/m²) vive na tabela{" "}
          <InlineCode>Vidro</InlineCode>; cada tipologia define quais vidros
          são elegíveis na aba <strong>Vidros</strong>.
        </P>

        <H2 id="precoTorre">A função <InlineCode>precoTorre</InlineCode></H2>
        <P>
          Helper de domínio simétrico para preço de torres/ferragens por
          modelo. Recebe o código (ou número) do modelo e retorna o preço
          unitário. Disponível em qualquer escopo de pricing.
        </P>
        <CodeBlock label="uso típico">{`precoTorre(ModeloTorre)         →  preço da torre escolhida na peça
QtdTorres * precoTorre(ModeloTorre)  →  multiplica pela quantidade variável`}</CodeBlock>
      </Prose>

      <PageNav href="/docs/precos" />
    </article>
  );
}
