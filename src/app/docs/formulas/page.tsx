import { Callout } from "@/components/docs/callout";
import { CodeBlock } from "@/components/docs/code-block";
import { InlineCode } from "@/components/docs/inline-code";
import { PageNav } from "@/components/docs/page-nav";
import { RefTable } from "@/components/docs/ref-table";
import { H1, H2, Lead, LI, P, Prose, UL } from "@/components/docs/prose";

export default function FormulasPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Conceitos
        </p>
        <H1>Linguagem de fórmula</H1>
        <Lead>
          Toda expressão (largura de peça, quantidade, valor de regra de preço,
          condição) é avaliada pela mesma engine. Aqui está o que ela aceita.
        </Lead>
      </header>

      <Prose>
        <H2 id="operadores">Operadores</H2>
        <RefTable
          headers={["Categoria", "Operadores", "Exemplo"]}
          rows={[
            [
              "Aritméticos",
              <span key="ar">
                <InlineCode>+</InlineCode> <InlineCode>-</InlineCode>{" "}
                <InlineCode>*</InlineCode> <InlineCode>/</InlineCode>{" "}
                <InlineCode>%</InlineCode> <InlineCode>^</InlineCode>
              </span>,
              <InlineCode key="ar-ex">{`(Lvao - 100) / Nfolhas`}</InlineCode>,
            ],
            [
              "Comparação",
              <span key="cp">
                <InlineCode>{`==`}</InlineCode>{" "}
                <InlineCode>{`!=`}</InlineCode>{" "}
                <InlineCode>{`<`}</InlineCode>{" "}
                <InlineCode>{`<=`}</InlineCode>{" "}
                <InlineCode>{`>`}</InlineCode>{" "}
                <InlineCode>{`>=`}</InlineCode>
              </span>,
              <InlineCode key="cp-ex">{`Nfolhas > 3`}</InlineCode>,
            ],
            [
              "Lógicos",
              <span key="lg">
                <InlineCode>{`&&`}</InlineCode>{" "}
                <InlineCode>{`||`}</InlineCode>{" "}
                <InlineCode>{`!`}</InlineCode>
              </span>,
              <InlineCode key="lg-ex">{`temBandeira && Avao > 2200`}</InlineCode>,
            ],
            [
              "Ternário",
              <InlineCode key="ter">{`a ? b : c`}</InlineCode>,
              <InlineCode key="ter-ex">{`IS_FIRST ? Lfolha + Pcanto : Lfolha`}</InlineCode>,
            ],
          ]}
        />

        <H2 id="funcoes">Funções built-in</H2>
        <P>
          A engine expõe um conjunto reduzido e auditado de funções. Tudo é
          case-sensitive — <InlineCode>min</InlineCode> funciona,{" "}
          <InlineCode>MIN</InlineCode> não.
        </P>

        <RefTable
          headers={["Função", "Assinatura", "Descrição"]}
          rows={[
            [
              "min",
              <InlineCode key="mn">min(a, b, ...)</InlineCode>,
              "Menor valor entre os argumentos.",
            ],
            [
              "max",
              <InlineCode key="mx">max(a, b, ...)</InlineCode>,
              "Maior valor entre os argumentos.",
            ],
            [
              "floor",
              <InlineCode key="fl">floor(x)</InlineCode>,
              "Arredonda para baixo (corta casas decimais).",
            ],
            [
              "ceil",
              <InlineCode key="cl">ceil(x)</InlineCode>,
              "Arredonda para cima.",
            ],
            [
              "round",
              <InlineCode key="rd">round(x, casas?)</InlineCode>,
              "Arredondamento padrão; opcionalmente N casas decimais.",
            ],
            [
              "abs",
              <InlineCode key="ab">abs(x)</InlineCode>,
              "Valor absoluto (descarta sinal).",
            ],
            [
              "sqrt",
              <InlineCode key="sq">sqrt(x)</InlineCode>,
              "Raiz quadrada.",
            ],
            [
              "if",
              <InlineCode key="if">if(cond, a, b)</InlineCode>,
              "Versão funcional do ternário; útil para legibilidade.",
            ],
            [
              "count",
              <InlineCode key="ct">count(arr)</InlineCode>,
              <span key="ct-d">
                Comprimento de uma lista. Útil em regras de preço para
                contar peças/especificações disponíveis no escopo (ex.:{" "}
                <InlineCode>count(pecas)</InlineCode>).
              </span>,
            ],
            [
              "precoVidro",
              <InlineCode key="pv">precoVidro(vidroId)</InlineCode>,
              <span key="pv-d">
                Helper de domínio: retorna o preço por m² do vidro selecionado
                (cor e espessura já intrínsecas). Use só em regras de preço.
              </span>,
            ],
            [
              "precoTorre",
              <InlineCode key="pt">precoTorre(modelo)</InlineCode>,
              <span key="pt-d">
                Helper de domínio: retorna o preço de uma torre/ferragem por
                modelo. Use só em regras de preço.
              </span>,
            ],
          ]}
          monoColumns={[0]}
        />

        <H2 id="literais">Literais e símbolos</H2>
        <UL>
          <LI>
            <strong>Números.</strong> Decimais com ponto:{" "}
            <InlineCode>123.45</InlineCode>. Notação científica funciona:{" "}
            <InlineCode>1e3</InlineCode> = 1000.
          </LI>
          <LI>
            <strong>Booleanos.</strong> <InlineCode>true</InlineCode> e{" "}
            <InlineCode>false</InlineCode>.
          </LI>
          <LI>
            <strong>Textos.</strong> Strings literais{" "}
            <strong>não são suportadas</strong>. Comparações como{" "}
            <InlineCode>{`ROLE == "CANTO"`}</InlineCode> usam{" "}
            <InlineCode>ROLE</InlineCode> como símbolo, não a string. Para
            comparar papéis, use o seletor diretamente em vez de comparar texto.
          </LI>
          <LI>
            <strong>Comentários.</strong> Não são suportados. Mantenha as
            fórmulas curtas; quebre cálculos longos em valores derivados com
            códigos descritivos.
          </LI>
        </UL>

        <H2 id="exemplos">Exemplos lado a lado</H2>

        <CodeBlock label="largura útil de uma varanda">{`Lvao - 2*Pcanto - (Nfolhas - 1)*Pperfil`}</CodeBlock>
        <P>
          Tira a borda de canto dos dois lados e os perfis entre as folhas.
          Usável em escopo VAO porque referencia apenas variáveis e outros
          derivados VAO.
        </P>

        <CodeBlock label="largura por folha (depende do grupo)">{`Lutil / Nfolhas`}</CodeBlock>
        <P>
          Reusa <InlineCode>Lutil</InlineCode> definido acima. Como{" "}
          <InlineCode>Nfolhas</InlineCode> é uma variável de entrada, esse
          derivado fica em escopo VAO também.
        </P>

        <CodeBlock label="reforço só nas folhas de canto (escopo PIECE)">{`(IS_FIRST || IS_LAST) ? Lfolha + Pcanto : Lfolha`}</CodeBlock>
        <P>
          Acrescenta o reforço de canto na primeira e na última peça, mantendo
          as do meio sem o acréscimo.
        </P>

        <CodeBlock label="condição de uma regra de preço">{`Nfolhas > 3 && Avao > 2200`}</CodeBlock>
        <P>
          Regras com condição falsa são puladas. Aqui a regra só fica ativa em
          varandas grandes.
        </P>

        <H2 id="erros">Erros comuns</H2>
        <RefTable
          headers={["Código", "Quando ocorre", "Como resolver"]}
          rows={[
            [
              "FORMULA_PARSE_ERROR",
              "A fórmula tem sintaxe inválida (parêntese aberto, operador solto).",
              "Reveja a expressão. Cada parêntese precisa fechar.",
            ],
            [
              "FORMULA_REFERENCE_ERROR",
              "A fórmula usa um símbolo que não existe (variável apagada, escopo errado).",
              "Confira o código exato. Lembre que VAO não enxerga GROUP_TOTAL etc.",
            ],
            [
              "FORMULA_DIVISION_BY_ZERO",
              "Alguma divisão dividiu por zero em runtime.",
              "Adicione condição ou ajuste limites de variáveis para evitar zero.",
            ],
            [
              "FORMULA_TYPE_ERROR",
              "A fórmula recebeu um booleano onde esperava número (ou vice-versa).",
              "Verifique se está usando IS_FIRST/IS_LAST com ternário, não com aritmética.",
            ],
            [
              "FORMULA_RUNTIME_ERROR",
              "Erro genérico de runtime que não cai nas categorias acima.",
              "Olhe a mensagem; em geral é um overflow ou função recebendo NaN.",
            ],
          ]}
          monoColumns={[0]}
        />

        <Callout variant="tip" title="Quebre cálculos longos em derivados">
          Em vez de uma fórmula gigante na largura da peça, defina vários
          valores derivados com nomes descritivos (
          <InlineCode>Lutil</InlineCode>, <InlineCode>Lfolha</InlineCode>,{" "}
          <InlineCode>Afolha</InlineCode>) e use eles na fórmula final. Fica
          mais fácil de revisar e debugar quando der erro.
        </Callout>
      </Prose>

      <PageNav href="/docs/formulas" />
    </article>
  );
}
