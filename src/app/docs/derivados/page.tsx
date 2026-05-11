import { Box, Layers, Maximize2 } from "lucide-react";
import { Callout } from "@/components/docs/callout";
import { CodeBlock } from "@/components/docs/code-block";
import { InlineCode } from "@/components/docs/inline-code";
import { PageNav } from "@/components/docs/page-nav";
import { H1, H2, H3, Lead, LI, P, Prose, UL } from "@/components/docs/prose";

export default function DerivadosPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          Estrutura de uma tipologia
        </p>
        <H1>Valores derivados</H1>
        <Lead>
          Cálculos intermediários que reaproveitam variáveis e outros derivados.
          Não aparecem como input no wizard — são avaliados pela engine antes
          das fórmulas que dependem deles.
        </Lead>
      </header>

      <Prose>
        <H2 id="por-que">Por que existem</H2>
        <P>
          Sem derivados, fórmulas longas se repetem em vários lugares. Imagine
          a largura útil de uma varanda — você precisa dela para calcular
          largura por folha, largura do canto e talvez para uma regra de preço.
          Em vez de duplicar a expressão, você cria um derivado{" "}
          <InlineCode>Lutil</InlineCode> uma vez e reutiliza.
        </P>

        <Callout variant="tip" title="Use derivados liberalmente">
          Não há custo: a engine avalia derivados em ordem topológica e cacheia
          os valores. Cada derivado é um nome legível para um cálculo —
          mantenha as fórmulas de peça e preço curtas.
        </Callout>

        <H2 id="campos">Campos de um derivado</H2>
        <CodeBlock label="JSON">{`{
  "codigo": "Lutil",
  "expression": "Lvao - 2*Pcanto - (Nfolhas - 1)*Pperfil",
  "scope": "VAO",
  "pieceGroupCodigo": null,
  "orderInScope": 1
}`}</CodeBlock>
        <UL>
          <LI>
            <strong>codigo</strong> — identificador usado em outras fórmulas.
          </LI>
          <LI>
            <strong>expression</strong> — a fórmula em si.
          </LI>
          <LI>
            <strong>scope</strong> — em qual escopo o derivado vive (
            <InlineCode>VAO</InlineCode>, <InlineCode>GROUP</InlineCode>,{" "}
            <InlineCode>PIECE</InlineCode> ou{" "}
            <InlineCode>ORCAMENTO_PECA</InlineCode>).
          </LI>
          <LI>
            <strong>pieceGroupCodigo</strong> — obrigatório para escopo GROUP
            ou PIECE; identifica de qual grupo o derivado pertence.
          </LI>
          <LI>
            <strong>orderInScope</strong> — ordem de avaliação dentro do
            escopo. Use 1, 2, 3… na ordem das dependências.
          </LI>
        </UL>

        <H2 id="escopos">Os três escopos</H2>

        <H3 id="vao">VAO</H3>
        <ScopeCard
          icon={Maximize2}
          color="blue"
          when="Cálculo vale para o vão inteiro, antes de qualquer grupo ser processado."
          available={[
            <span key="v1">Variáveis de entrada</span>,
            <span key="v2">Outros derivados VAO (em ordem)</span>,
          ]}
        />
        <CodeBlock label="exemplo VAO">{`Lutil = Lvao - 2*Pcanto - (Nfolhas - 1)*Pperfil
Lfolha = Lutil / Nfolhas
Afolha = Avao - 100`}</CodeBlock>

        <H3 id="group">GROUP</H3>
        <ScopeCard
          icon={Layers}
          color="amber"
          when="Cálculo depende da quantidade de peças do grupo, mas não de uma peça específica."
          available={[
            <span key="g1">Tudo do escopo VAO</span>,
            <span key="g2">
              <InlineCode>GROUP_TOTAL</InlineCode> (quantidade do grupo atual)
            </span>,
            <span key="g3">Outros derivados GROUP do mesmo grupo</span>,
          ]}
        />
        <CodeBlock label="exemplo GROUP">{`larguraEntreFolhas = (Lvao - 2*Pcanto) / GROUP_TOTAL`}</CodeBlock>

        <H3 id="piece">PIECE</H3>
        <ScopeCard
          icon={Box}
          color="emerald"
          when="Cálculo depende da posição da peça dentro do grupo."
          available={[
            <span key="p1">Tudo do escopo GROUP</span>,
            <span key="p2">
              <InlineCode>INDEX</InlineCode>, <InlineCode>TOTAL</InlineCode>,{" "}
              <InlineCode>IS_FIRST</InlineCode>,{" "}
              <InlineCode>IS_LAST</InlineCode>, <InlineCode>ROLE</InlineCode>
            </span>,
            <span key="p3">Outros derivados PIECE do mesmo grupo</span>,
          ]}
        />
        <CodeBlock label="exemplo PIECE">{`alturaCompensada = IS_LAST ? Afolha - 5 : Afolha`}</CodeBlock>

        <H2 id="ordem">Ordem e dependências</H2>
        <P>
          Dentro de um escopo, derivados são avaliados na ordem de{" "}
          <InlineCode>orderInScope</InlineCode>. Se{" "}
          <InlineCode>Lfolha</InlineCode> referencia{" "}
          <InlineCode>Lutil</InlineCode>, então <InlineCode>Lutil</InlineCode>{" "}
          deve ter <InlineCode>orderInScope</InlineCode> menor.
        </P>

        <Callout variant="warning" title="Ciclos não são permitidos">
          Se <InlineCode>A</InlineCode> usa <InlineCode>B</InlineCode> e{" "}
          <InlineCode>B</InlineCode> usa <InlineCode>A</InlineCode>, a engine
          retorna <InlineCode>COMPUTED_VALUE_CYCLE</InlineCode>. A validação no
          save detecta isso antes de permitir gravar.
        </Callout>

        <H2 id="boas-praticas">Boas práticas</H2>
        <UL>
          <LI>
            <strong>Nomes legíveis.</strong> Prefira{" "}
            <InlineCode>Lfolha</InlineCode> a{" "}
            <InlineCode>tmp1</InlineCode>. O nome aparece em mensagens de erro
            e no admin.
          </LI>
          <LI>
            <strong>Escopo mais alto possível.</strong> Se um cálculo não
            depende do grupo, mantenha em VAO. Se não depende da peça, mantenha
            em GROUP. Isso economiza avaliações e deixa a fórmula reutilizável.
          </LI>
          <LI>
            <strong>Uma responsabilidade por derivado.</strong> Em vez de uma
            expressão gigante, quebre em vários derivados com nomes que
            descrevem cada etapa.
          </LI>
        </UL>
      </Prose>

      <PageNav href="/docs/derivados" />
    </article>
  );
}

function ScopeCard({
  icon: Icon,
  color,
  when,
  available,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "amber" | "emerald";
  when: string;
  available: React.ReactNode[];
}) {
  const styles: Record<typeof color, { bg: string; text: string; border: string }> = {
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
    emerald: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-300",
      border: "border-emerald-500/30",
    },
  };
  const c = styles[color];
  return (
    <div className="flex gap-3 rounded-lg border border-border/60 bg-card/40 p-4">
      <div
        className={`flex size-9 shrink-0 items-center justify-center rounded-md border ${c.bg} ${c.border} ${c.text}`}
      >
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 space-y-2 text-sm">
        <p className="leading-relaxed text-foreground/90">{when}</p>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Disponível
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-foreground/80">
            {available.map((a, i) => (
              <li key={i}>• {a}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
