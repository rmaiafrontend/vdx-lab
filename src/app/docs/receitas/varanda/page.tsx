import { Callout } from "@/components/docs/callout";
import { CodeBlock } from "@/components/docs/code-block";
import { InlineCode } from "@/components/docs/inline-code";
import { PageNav } from "@/components/docs/page-nav";
import { H1, H2, Lead, LI, P, Prose, UL } from "@/components/docs/prose";

export default function ReceitaVarandaPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Receitas
        </p>
        <H1>Varanda 4 cantos</H1>
        <Lead>
          A receita mais rica do lab. Demonstra <strong>COUNT</strong>{" "}
          (quantidade dinâmica de folhas), <strong>valores derivados</strong>,{" "}
          <strong>3 papéis com seletores diferentes</strong> e{" "}
          <strong>3 tipos de regras de preço</strong>. Boa base para qualquer
          tipologia que mude com a contagem.
        </Lead>
      </header>

      <Prose>
        <H2 id="conceito">O conceito</H2>
        <P>
          Uma varanda de 4 cantos com quantidade variável de folhas. As duas
          folhas das pontas (esquerda e direita) ganham um reforço de canto e
          ficam um pouco mais largas. As folhas centrais são todas iguais.
          Conforme o vendedor mexe no slider de quantidade, o diagrama no
          wizard se reorganiza dinamicamente.
        </P>

        <H2 id="variaveis">Variáveis (5)</H2>
        <P>O vendedor preenche os 3 primeiros; os 2 últimos ficam em Avançado:</P>
        <CodeBlock label="JSON · variables">{`[
  { codigo: "Lvao",    kind: "DIMENSION",       unit: "mm", minValue: "2000", maxValue: "8000" },
  { codigo: "Avao",    kind: "DIMENSION",       unit: "mm", minValue: "1800", maxValue: "2800" },
  { codigo: "Nfolhas", kind: "COUNT",           unit: "un", minValue: "3",    maxValue: "10", defaultValue: "5" },
  { codigo: "Pperfil", kind: "TECHNICAL_PARAM", unit: "mm", defaultValue: "50" },
  { codigo: "Pcanto",  kind: "TECHNICAL_PARAM", unit: "mm", defaultValue: "75" }
]`}</CodeBlock>
        <UL>
          <LI>
            <InlineCode>Lvao</InlineCode> e <InlineCode>Avao</InlineCode> — as
            medidas do vão. Faixa razoável: 2 a 8 metros de largura, 1.8 a
            2.8 metros de altura.
          </LI>
          <LI>
            <InlineCode>Nfolhas</InlineCode> — slider de 3 a 10. É o que torna
            a tipologia <strong>dinâmica</strong>: o diagrama muda quando o
            vendedor arrasta.
          </LI>
          <LI>
            <InlineCode>Pperfil</InlineCode> e <InlineCode>Pcanto</InlineCode>{" "}
            — perfil entre folhas (50 mm) e reforço de canto (75 mm). Em
            Avançado, raramente são alterados.
          </LI>
        </UL>

        <H2 id="derivados">Valores derivados (3, escopo VAO)</H2>
        <P>
          Em vez de repetir cálculos, três derivados encapsulam a aritmética do
          vão:
        </P>
        <CodeBlock label="JSON · computedValues">{`[
  { codigo: "Lutil",  expression: "Lvao - 2*Pcanto - (Nfolhas - 1)*Pperfil", scope: "VAO", orderInScope: 1 },
  { codigo: "Lfolha", expression: "Lutil / Nfolhas",                         scope: "VAO", orderInScope: 2 },
  { codigo: "Afolha", expression: "Avao - 100",                              scope: "VAO", orderInScope: 3 }
]`}</CodeBlock>
        <UL>
          <LI>
            <InlineCode>Lutil</InlineCode> — largura útil. Tira os dois cantos
            (<InlineCode>2*Pcanto</InlineCode>) e os perfis entre folhas (
            <InlineCode>(Nfolhas-1)*Pperfil</InlineCode>).
          </LI>
          <LI>
            <InlineCode>Lfolha</InlineCode> — largura por folha (
            <InlineCode>Lutil / Nfolhas</InlineCode>). Reusa{" "}
            <InlineCode>Lutil</InlineCode>, por isso ordem 2.
          </LI>
          <LI>
            <InlineCode>Afolha</InlineCode> — altura útil da folha; tira 100 mm
            do vão para folga superior + inferior.
          </LI>
        </UL>

        <Callout variant="tip" title="Por que 3 derivados em vez de 1 fórmula gigante?">
          Cada derivado tem um nome legível. Quando der erro,{" "}
          <InlineCode>Lutil</InlineCode> aparecendo na mensagem ajuda a
          identificar o problema. Se você juntasse tudo numa única expressão
          dentro de <InlineCode>widthExpression</InlineCode>, a mensagem seria
          ilegível.
        </Callout>

        <H2 id="grupo">Grupo & papéis (1 grupo, 3 papéis)</H2>
        <P>
          Um único grupo (<InlineCode>FOLHAS</InlineCode>), com{" "}
          <InlineCode>quantityExpression = "Nfolhas"</InlineCode>. Três
          papéis cobrem os índices:
        </P>
        <CodeBlock label="JSON · pieceRoles">{`[
  { codigo: "CANTO_ESQ", selectorKind: "FIRST",             widthExpression: "Lfolha + Pcanto", heightExpression: "Afolha" },
  { codigo: "CENTRAL",   selectorKind: "EXCEPT_FIRST_LAST", widthExpression: "Lfolha",          heightExpression: "Afolha" },
  { codigo: "CANTO_DIR", selectorKind: "LAST",              widthExpression: "Lfolha + Pcanto", heightExpression: "Afolha" }
]`}</CodeBlock>
        <UL>
          <LI>
            <strong>FIRST</strong> cobre o índice 1, <strong>LAST</strong>{" "}
            cobre o índice TOTAL, <strong>EXCEPT_FIRST_LAST</strong> cobre o
            miolo (2 a TOTAL-1).
          </LI>
          <LI>
            Cantos têm{" "}
            <InlineCode>{`Lfolha + Pcanto`}</InlineCode> (ganham o reforço);
            centrais ficam apenas com <InlineCode>Lfolha</InlineCode>.
          </LI>
          <LI>
            A altura é a mesma para todos os papéis (
            <InlineCode>Afolha</InlineCode>).
          </LI>
        </UL>

        <H2 id="precos">Regras de preço (3)</H2>

        <CodeBlock label="JSON · pricingRules">{`[
  {
    codigo:         "VIDRO_M2",
    componentKind:  "VIDRO",
    basis:          "PER_M2",
    appliesTo:      "TIPOLOGIA",
    expression:     "precoVidro(VidroId)"
  },
  {
    codigo:         "FERRAGEM_CANTO",
    componentKind:  "FERRAGEM",
    basis:          "PER_PIECE",
    appliesTo:      "ROLE_CODE",
    appliesToValue: "CANTO_ESQ,CANTO_DIR",
    expression:     "180.00"
  },
  {
    codigo:         "INSTALACAO_VAO",
    componentKind:  "INSTALACAO",
    basis:          "PER_VAO",
    appliesTo:      "TIPOLOGIA",
    expression:     "350 + 80 * Nfolhas"
  }
]`}</CodeBlock>

        <UL>
          <LI>
            <strong>VIDRO_M2</strong> — vidro cobrado pela área total da
            tipologia. <InlineCode>precoVidro(VidroId)</InlineCode> retorna
            o preço por m² do vidro que o vendedor escolher entre os
            elegíveis (cor e espessura já são intrínsecas ao vidro).
          </LI>
          <LI>
            <strong>FERRAGEM_CANTO</strong> — R$ 180 por peça nos papéis de
            canto (sempre 2 peças, qualquer que seja{" "}
            <InlineCode>Nfolhas</InlineCode>).
          </LI>
          <LI>
            <strong>INSTALACAO_VAO</strong> — instalação cobrada{" "}
            <strong>uma vez</strong> pelo vão; cresce R$ 80 por folha
            adicional.
          </LI>
        </UL>

        <H2 id="resultado">Resultado para Lvao=4000, Avao=2200, Nfolhas=5</H2>
        <UL>
          <LI>
            <InlineCode>Lutil</InlineCode> = 4000 − 2·75 − 4·50 ={" "}
            <strong>3650 mm</strong>
          </LI>
          <LI>
            <InlineCode>Lfolha</InlineCode> = 3650 / 5 = <strong>730 mm</strong>
          </LI>
          <LI>
            <InlineCode>Afolha</InlineCode> = 2200 − 100 ={" "}
            <strong>2100 mm</strong>
          </LI>
          <LI>
            5 peças: 1× <InlineCode>CANTO_ESQ</InlineCode> (805×2100), 3×{" "}
            <InlineCode>CENTRAL</InlineCode> (730×2100), 1×{" "}
            <InlineCode>CANTO_DIR</InlineCode> (805×2100).
          </LI>
          <LI>
            Área de cobrança ≈ 8.29 m² (depois do arredondamento para 50 mm).
          </LI>
          <LI>
            Preço aproximado: vidro (~R$ 2.300) + 2× ferragem (R$ 360) +
            instalação (350 + 80·5 = R$ 750) ≈ <strong>R$ 3.410</strong>.
          </LI>
        </UL>

        <H2 id="variantes">O que mudar para variar</H2>
        <UL>
          <LI>
            <strong>Cantos com altura diferente.</strong> Crie um derivado
            PIECE-scope <InlineCode>alturaCanto</InlineCode>{" "}
            condicionado a <InlineCode>IS_FIRST || IS_LAST</InlineCode>.
          </LI>
          <LI>
            <strong>Limite mínimo de folhas dependente da largura.</strong>{" "}
            Mude <InlineCode>Nfolhas.minValue</InlineCode> de{" "}
            <InlineCode>"3"</InlineCode> para{" "}
            <InlineCode>{`"ceil(Lvao/1200)"`}</InlineCode>.
          </LI>
          <LI>
            <strong>Trinco em uma folha específica.</strong> Adicione papel
            extra <InlineCode>COM_TRINCO</InlineCode> com{" "}
            <InlineCode>{`selectorKind="EXPRESSION"`}</InlineCode> e{" "}
            <InlineCode>{`selectorValue="INDEX == 2"`}</InlineCode>. Lembre de
            retirar o índice 2 do papel <InlineCode>CENTRAL</InlineCode> para
            evitar overlap.
          </LI>
        </UL>
      </Prose>

      <PageNav href="/docs/receitas/varanda" />
    </article>
  );
}
