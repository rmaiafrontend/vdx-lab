import { Callout } from "@/components/docs/callout";
import { CodeBlock } from "@/components/docs/code-block";
import { InlineCode } from "@/components/docs/inline-code";
import { PageNav } from "@/components/docs/page-nav";
import { RefTable } from "@/components/docs/ref-table";
import { H1, H2, Lead, LI, P, Prose, UL } from "@/components/docs/prose";

export default function GruposPecasPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Estrutura de uma tipologia
        </p>
        <H1>Grupos & peças</H1>
        <Lead>
          Toda tipologia precisa pelo menos um grupo de peças. Grupos definem{" "}
          <strong>quantas</strong> peças existem; papéis definem{" "}
          <strong>como</strong> cada peça é calculada.
        </Lead>
      </header>

      <Prose>
        <H2 id="hierarquia">A hierarquia</H2>
        <CodeBlock label="estrutura">{`Tipologia
  ├─ PieceGroup (FOLHAS)
  │    ├─ quantityExpression: "Nfolhas"
  │    ├─ PieceRole (CANTO_ESQ)  →  selectorKind=FIRST,             widthExpression=...,  heightExpression=...
  │    ├─ PieceRole (CENTRAL)    →  selectorKind=EXCEPT_FIRST_LAST, widthExpression=...,  heightExpression=...
  │    └─ PieceRole (CANTO_DIR)  →  selectorKind=LAST,              widthExpression=...,  heightExpression=...
  └─ PieceGroup (BANDEIRA)
       ├─ quantityExpression: "1"
       └─ PieceRole (PADRAO)     →  selectorKind=ALL,               widthExpression=...,  heightExpression=...`}</CodeBlock>

        <UL>
          <LI>
            <strong>PieceGroup</strong> agrupa peças que compartilham
            comportamento (folhas de uma varanda, bandeira no topo, fixadores).
          </LI>
          <LI>
            <strong>PieceRole</strong> define como uma fatia das peças do grupo
            é calculada — o seletor decide quais índices do grupo recebem
            aquele papel.
          </LI>
        </UL>

        <H2 id="campos-grupo">Campos de um grupo</H2>
        <RefTable
          headers={["Campo", "Tipo", "Descrição"]}
          rows={[
            ["codigo", "texto", "Identificador único na tipologia (ex.: FOLHAS, BANDEIRA)."],
            ["label", "texto", "Nome amigável; aparece no diagrama do wizard."],
            [
              "quantityExpression",
              "expressão (VAO scope)",
              "Quantas peças o grupo gera. Pode ser literal ('2') ou expressão ('Nfolhas').",
            ],
            ["ordem", "número", "Posição entre grupos da mesma tipologia."],
            ["pieceRoles", "lista", "Os papéis do grupo (≥ 1)."],
          ]}
          monoColumns={[0, 1]}
        />

        <H2 id="campos-papel">Campos de um papel</H2>
        <RefTable
          headers={["Campo", "Tipo", "Descrição"]}
          rows={[
            ["codigo", "texto", "Identificador único dentro do grupo (ex.: CANTO_ESQ, FIXA, MOVEL)."],
            ["label", "texto", "Nome amigável."],
            [
              "selectorKind + selectorValue",
              "ver Seletores",
              "Quais índices do grupo este papel cobre.",
            ],
            [
              "condition",
              "expressão (VAO scope) | null",
              "Opcional. Se avaliar como falso, o papel não gera peças (útil com IS_FIRST/IS_LAST do grupo pai).",
            ],
            [
              "widthExpression",
              "expressão (PIECE scope)",
              "Largura da peça em mm (antes do arredondamento).",
            ],
            [
              "heightExpression",
              "expressão (PIECE scope)",
              "Altura da peça em mm (antes do arredondamento).",
            ],
            ["ordem", "número", "Posição entre papéis do mesmo grupo."],
          ]}
          monoColumns={[0, 1]}
        />

        <H2 id="exemplo">Exemplo: varanda com 3 papéis</H2>
        <CodeBlock label="JSON">{`{
  "codigo": "FOLHAS",
  "label": "Folhas da varanda",
  "quantityExpression": "Nfolhas",
  "ordem": 1,
  "pieceRoles": [
    {
      "codigo": "CANTO_ESQ",
      "label": "Canto esquerdo",
      "selectorKind": "FIRST",
      "selectorValue": null,
      "condition": null,
      "widthExpression": "Lfolha + Pcanto",
      "heightExpression": "Afolha",
      "ordem": 1
    },
    {
      "codigo": "CENTRAL",
      "label": "Folha central",
      "selectorKind": "EXCEPT_FIRST_LAST",
      "selectorValue": null,
      "condition": null,
      "widthExpression": "Lfolha",
      "heightExpression": "Afolha",
      "ordem": 2
    },
    {
      "codigo": "CANTO_DIR",
      "label": "Canto direito",
      "selectorKind": "LAST",
      "selectorValue": null,
      "condition": null,
      "widthExpression": "Lfolha + Pcanto",
      "heightExpression": "Afolha",
      "ordem": 3
    }
  ]
}`}</CodeBlock>
        <P>
          Com <InlineCode>Nfolhas = 5</InlineCode>, a engine gera 5 peças: a
          peça #1 cai no papel <InlineCode>CANTO_ESQ</InlineCode>, as #2-#4 em{" "}
          <InlineCode>CENTRAL</InlineCode>, a #5 em{" "}
          <InlineCode>CANTO_DIR</InlineCode>. As peças de canto têm largura{" "}
          <InlineCode>Lfolha + Pcanto</InlineCode>; as centrais, apenas{" "}
          <InlineCode>Lfolha</InlineCode>.
        </P>

        <H2 id="cobertura">Cobertura de seletores</H2>
        <P>
          A regra de ouro: <strong>cada índice de 1 a GROUP_TOTAL precisa
          estar coberto por exatamente um papel</strong>. Se sobrar índice sem
          cobertura, a engine retorna <InlineCode>SELECTOR_GAP</InlineCode>. Se
          dois papéis cobrirem o mesmo índice, retorna{" "}
          <InlineCode>SELECTOR_OVERLAP</InlineCode>.
        </P>

        <Callout variant="info" title="A validação testa quantidades plausíveis">
          Quando você salva uma tipologia, a engine roda a validação simulando
          alguns valores de <InlineCode>GROUP_TOTAL</InlineCode> (mínimo,
          máximo, default). Se algum desses valores expor um buraco ou uma
          sobreposição, o admin bloqueia o save e mostra qual papel quebrou.
          Veja <strong>Seletores</strong> para a lista completa de tipos.
        </Callout>

        <H2 id="multiplos-grupos">Múltiplos grupos no mesmo vão</H2>
        <P>
          Use múltiplos grupos quando o vão tem peças que se comportam de
          formas independentes. Exemplos:
        </P>
        <UL>
          <LI>
            <strong>Porta com bandeira:</strong> grupo <InlineCode>FOLHAS</InlineCode> embaixo (2 folhas) +
            grupo <InlineCode>BANDEIRA</InlineCode> em cima (1 peça).
          </LI>
          <LI>
            <strong>Box com tampa:</strong> grupo das chapas verticais + grupo
            das tampas horizontais.
          </LI>
        </UL>
        <P>
          O wizard renderiza um strip por grupo, empilhados verticalmente
          (ordem segue o campo <InlineCode>ordem</InlineCode>).
        </P>
      </Prose>

      <PageNav href="/docs/grupos-pecas" />
    </article>
  );
}
