import { Callout } from "@/components/docs/callout";
import { CodeBlock } from "@/components/docs/code-block";
import { InlineCode } from "@/components/docs/inline-code";
import { PageNav } from "@/components/docs/page-nav";
import { H1, H2, Lead, LI, P, Prose, UL } from "@/components/docs/prose";

export default function ReceitaBoxFrontalPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Receitas
        </p>
        <H1>Box frontal</H1>
        <Lead>
          Box de banheiro com folha fixa (40%) e móvel (60%). Demonstra{" "}
          <strong>split fixo</strong> via expressão e cobrança{" "}
          <strong>PER_GROUP</strong> (ferragem cobrada uma vez pelo conjunto,
          não por peça).
        </Lead>
      </header>

      <Prose>
        <H2 id="conceito">O conceito</H2>
        <P>
          Um box de banheiro tem duas chapas: uma fixa (geralmente menor) e
          uma móvel (maior, é a porta). A proporção é fixa (40/60) — o
          vendedor não escolhe, faz parte da definição da tipologia. Esta
          receita mostra como capturar essa rigidez em fórmulas.
        </P>

        <H2 id="variaveis">Variáveis (2)</H2>
        <CodeBlock label="JSON · variables">{`[
  { codigo: "Lvao", kind: "DIMENSION", minValue: "800",  maxValue: "2000" },
  { codigo: "Avao", kind: "DIMENSION", minValue: "1700", maxValue: "2200" }
]`}</CodeBlock>
        <P>
          Apenas largura e altura do vão. Sem COUNT, sem TECHNICAL_PARAM, sem
          BOOLEAN — a tipologia inteira é determinada por essas duas medidas.
        </P>

        <H2 id="derivados">Valores derivados (nenhum)</H2>
        <P>
          Sem derivados nessa receita; as fórmulas inline já são suficientemente
          curtas. Essa decisão é estética: para tipologias simples, não vale
          quebrar em derivados.
        </P>

        <H2 id="grupo">Grupo & papéis (1 grupo, 2 papéis)</H2>
        <CodeBlock label="JSON · pieceGroups">{`[
  {
    codigo: "FOLHAS",
    quantityExpression: "2",
    ordem: 1,
    pieceRoles: [
      { codigo: "FIXA",  selectorKind: "FIRST", widthExpression: "Lvao*0.4 - 5", heightExpression: "Avao" },
      { codigo: "MOVEL", selectorKind: "LAST",  widthExpression: "Lvao*0.6 - 5", heightExpression: "Avao" }
    ]
  }
]`}</CodeBlock>
        <UL>
          <LI>
            <strong>2 peças</strong> no grupo (
            <InlineCode>quantityExpression: "2"</InlineCode>).
          </LI>
          <LI>
            <strong>FIXA</strong> cobre o índice 1 (
            <InlineCode>FIRST</InlineCode>); largura ={" "}
            <InlineCode>Lvao*0.4 - 5</InlineCode> (40% menos folga).
          </LI>
          <LI>
            <strong>MOVEL</strong> cobre o índice 2 (
            <InlineCode>LAST</InlineCode>); largura ={" "}
            <InlineCode>Lvao*0.6 - 5</InlineCode> (60% menos folga).
          </LI>
          <LI>
            Cobertura: 2 papéis cobrindo 2 índices, exatos. Sem buracos, sem
            sobreposição.
          </LI>
        </UL>

        <Callout variant="tip" title="Por que -5?">
          As duas folhas precisam de uma folga entre elas para o trilho. 5 mm
          em cada lateral (lado da fixa + lado da móvel) garante que somem 10
          mm no centro. Sem essa folga, as chapas se encostariam.
        </Callout>

        <H2 id="precos">Regras de preço (2)</H2>

        <CodeBlock label="JSON · pricingRules">{`[
  {
    codigo:        "VIDRO_M2",
    componentKind: "VIDRO",
    basis:         "PER_M2",
    appliesTo:     "TIPOLOGIA",
    expression:    "precoVidro(VidroId)"
  },
  {
    codigo:         "FERRAGEM_BOX",
    componentKind:  "FERRAGEM",
    basis:          "PER_GROUP",
    appliesTo:      "GROUP_CODE",
    appliesToValue: "FOLHAS",
    expression:     "420.00"
  }
]`}</CodeBlock>

        <UL>
          <LI>
            <strong>VIDRO_M2</strong> — vidro pela área total do vão. Padrão.
          </LI>
          <LI>
            <strong>FERRAGEM_BOX</strong> — R$ 420 cobrados <strong>uma vez</strong>{" "}
            pelo grupo, independente da quantidade de peças. Como o grupo
            sempre tem 2 peças, isso seria equivalente a R$ 210 por peça —
            mas a semântica fica mais clara com{" "}
            <InlineCode>PER_GROUP</InlineCode>: "ferragem do conjunto box".
          </LI>
        </UL>

        <Callout variant="info" title="PER_GROUP × PER_PIECE">
          <UL>
            <LI>
              Use <strong>PER_GROUP</strong> quando o custo é do conjunto (ex.:
              um kit de ferragens que sempre vem completo).
            </LI>
            <LI>
              Use <strong>PER_PIECE</strong> quando o custo escala com peças
              (ex.: dobradiça que cada folha ganha uma).
            </LI>
          </UL>
        </Callout>

        <H2 id="resultado">Resultado para Lvao=1000, Avao=2000</H2>
        <UL>
          <LI>
            <strong>FIXA:</strong> 1000·0.4 − 5 = <strong>395 mm</strong> ×
            2000 mm.
          </LI>
          <LI>
            <strong>MOVEL:</strong> 1000·0.6 − 5 = <strong>595 mm</strong> ×
            2000 mm.
          </LI>
          <LI>
            Área total ≈ 0.79 + 1.19 ≈ <strong>1.98 m²</strong> (após
            arredondamento de cobrança).
          </LI>
          <LI>
            Preço: vidro por m² + R$ 420 fixos da ferragem.
          </LI>
        </UL>

        <H2 id="variantes">O que mudar para variar</H2>
        <UL>
          <LI>
            <strong>Box de canto (3 chapas).</strong> Mude{" "}
            <InlineCode>quantityExpression</InlineCode> para 3, adicione papel{" "}
            <InlineCode>LATERAL</InlineCode> com seletor{" "}
            <InlineCode>FIRST</InlineCode>, mantenha FIXA com{" "}
            <InlineCode>INDEX 2</InlineCode>, MOVEL com{" "}
            <InlineCode>LAST</InlineCode>. Recalcule a aritmética da largura.
          </LI>
          <LI>
            <strong>Proporção configurável.</strong> Adicione variável{" "}
            <InlineCode>percentualFixa</InlineCode> (TECHNICAL_PARAM, default
            40), e troque <InlineCode>0.4</InlineCode> por{" "}
            <InlineCode>percentualFixa/100</InlineCode>. Vendedor pode ajustar
            em casos especiais.
          </LI>
          <LI>
            <strong>Ferragem cobrada por peça (não por grupo).</strong> Troque
            basis para <InlineCode>PER_PIECE</InlineCode> e appliesTo para{" "}
            <InlineCode>ROLE_CODE</InlineCode> com{" "}
            <InlineCode>"MOVEL"</InlineCode> — só a folha móvel paga
            ferragem.
          </LI>
        </UL>
      </Prose>

      <PageNav href="/docs/receitas/box-frontal" />
    </article>
  );
}
