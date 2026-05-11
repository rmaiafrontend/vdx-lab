import { Callout } from "@/components/docs/callout";
import { CodeBlock } from "@/components/docs/code-block";
import { InlineCode } from "@/components/docs/inline-code";
import { PageNav } from "@/components/docs/page-nav";
import { H1, H2, Lead, LI, P, Prose, UL } from "@/components/docs/prose";

export default function ReceitaPortaBandeiraPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Receitas
        </p>
        <H1>Porta com bandeira</H1>
        <Lead>
          Tipologia fixa com <strong>dois grupos no mesmo vão</strong>: duas
          folhas embaixo e uma bandeira no topo. Bom exemplo de quando usar
          múltiplos grupos e como compor altura via derivado.
        </Lead>
      </header>

      <Prose>
        <H2 id="conceito">O conceito</H2>
        <P>
          Uma porta de vidro com bandeira fixa acima. A bandeira não é uma
          folha — é uma chapa única que ocupa toda a largura do vão. Por isso
          ela vive em um grupo <strong>separado</strong>, com sua própria
          quantity e expressão de altura.
        </P>

        <H2 id="variaveis">Variáveis (3)</H2>
        <CodeBlock label="JSON · variables">{`[
  { codigo: "Lvao",  kind: "DIMENSION", minValue: "700",  maxValue: "1600" },
  { codigo: "Avao",  kind: "DIMENSION", minValue: "2100", maxValue: "3000" },
  { codigo: "Aband", kind: "DIMENSION", minValue: "200",  maxValue: "800",  defaultValue: "400" }
]`}</CodeBlock>
        <UL>
          <LI>
            <InlineCode>Lvao</InlineCode> e <InlineCode>Avao</InlineCode> — a
            porta inteira (largura e altura totais incluindo a bandeira).
          </LI>
          <LI>
            <InlineCode>Aband</InlineCode> — altura da bandeira. Default 400 mm.
          </LI>
        </UL>

        <H2 id="derivados">Valores derivados (1, escopo VAO)</H2>
        <CodeBlock label="JSON · computedValues">{`[
  { codigo: "Apar", expression: "Avao - Aband", scope: "VAO", orderInScope: 1 }
]`}</CodeBlock>
        <P>
          <InlineCode>Apar</InlineCode> = altura da parte das folhas. É o que
          sobra do vão depois de tirar a bandeira. Reusado nas{" "}
          <InlineCode>heightExpression</InlineCode> das folhas.
        </P>

        <H2 id="grupos">Dois grupos</H2>

        <CodeBlock label="JSON · pieceGroups">{`[
  {
    codigo: "FOLHAS",
    quantityExpression: "2",
    ordem: 1,
    pieceRoles: [
      { codigo: "PADRAO", selectorKind: "ALL", widthExpression: "Lvao/2 - 5", heightExpression: "Apar" }
    ]
  },
  {
    codigo: "BANDEIRA",
    quantityExpression: "1",
    ordem: 2,
    pieceRoles: [
      { codigo: "PADRAO", selectorKind: "ALL", widthExpression: "Lvao", heightExpression: "Aband" }
    ]
  }
]`}</CodeBlock>
        <UL>
          <LI>
            <strong>FOLHAS</strong> — duas peças (
            <InlineCode>quantityExpression: "2"</InlineCode>, literal). Um
            único papel <InlineCode>PADRAO</InlineCode> com seletor{" "}
            <InlineCode>ALL</InlineCode>. Cada folha tem largura{" "}
            <InlineCode>Lvao/2 - 5</InlineCode> (folga de 5 mm entre as folhas).
          </LI>
          <LI>
            <strong>BANDEIRA</strong> — uma peça (
            <InlineCode>quantityExpression: "1"</InlineCode>). Largura completa{" "}
            <InlineCode>Lvao</InlineCode>, altura{" "}
            <InlineCode>Aband</InlineCode>.
          </LI>
        </UL>

        <Callout variant="info" title="Quantity literal vs expressão">
          Quando a quantidade é fixa (não vai mudar com inputs), use literal:{" "}
          <InlineCode>"2"</InlineCode>, <InlineCode>"1"</InlineCode>. Quando
          depende de variáveis, use expressão:{" "}
          <InlineCode>"Nfolhas"</InlineCode>. Os dois são igualmente válidos.
        </Callout>

        <H2 id="precos">Regras de preço (1)</H2>
        <CodeBlock label="JSON · pricingRules">{`[
  {
    codigo: "VIDRO_M2",
    componentKind: "VIDRO",
    basis: "PER_M2",
    appliesTo: "TIPOLOGIA",
    expression: "precoVidro(VidroId)"
  }
]`}</CodeBlock>
        <P>
          Apenas vidro por m². <InlineCode>appliesTo: "TIPOLOGIA"</InlineCode>{" "}
          significa que a área cobre <strong>todos</strong> os grupos
          (folhas + bandeira). Sem ferragem ou instalação nesta receita
          mínima.
        </P>

        <H2 id="resultado">Resultado para Lvao=900, Avao=2400, Aband=400</H2>
        <UL>
          <LI>
            <InlineCode>Apar</InlineCode> = 2400 − 400 ={" "}
            <strong>2000 mm</strong> (altura das folhas).
          </LI>
          <LI>
            Folhas: 2 peças de (900/2 − 5 = 445) × 2000 mm.
          </LI>
          <LI>
            Bandeira: 1 peça de 900 × 400 mm.
          </LI>
          <LI>
            Área de cobrança ≈ 1.96 m² (folhas) + 0.40 m² (bandeira) ≈{" "}
            <strong>2.36 m²</strong>.
          </LI>
        </UL>

        <H2 id="variantes">O que mudar para variar</H2>
        <UL>
          <LI>
            <strong>Bandeira opcional.</strong> Adicione variável{" "}
            <InlineCode>temBandeira</InlineCode> (BOOLEAN) e mude a quantidade
            do grupo BANDEIRA para{" "}
            <InlineCode>{`temBandeira ? 1 : 0`}</InlineCode>. Quando o vendedor
            desligar o switch, a bandeira some do diagrama e do preço.
          </LI>
          <LI>
            <strong>Folha de canto + folha móvel.</strong> Adicione papéis ao
            grupo <InlineCode>FOLHAS</InlineCode>: troque seletor{" "}
            <InlineCode>ALL</InlineCode> por{" "}
            <InlineCode>FIRST</InlineCode> e{" "}
            <InlineCode>LAST</InlineCode>, com largura/altura distintas para
            cada uma.
          </LI>
        </UL>
      </Prose>

      <PageNav href="/docs/receitas/porta-bandeira" />
    </article>
  );
}
