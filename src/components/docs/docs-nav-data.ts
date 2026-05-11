/**
 * Fonte da verdade da navegação do /docs.
 * Ordem definida aqui = ordem na sidebar = ordem do <PageNav> (anterior/próximo).
 */

export type DocsPage = {
  href: string;
  label: string;
  /** Resumo curto exibido no /docs landing. */
  blurb?: string;
};

export type DocsGroup = {
  title: string;
  pages: DocsPage[];
};

export const DOCS_NAV: DocsGroup[] = [
  {
    title: "Introdução",
    pages: [
      {
        href: "/docs",
        label: "Visão geral",
        blurb: "Conceitos centrais e como a documentação está organizada.",
      },
    ],
  },
  {
    title: "Conceitos",
    pages: [
      {
        href: "/docs/pipeline",
        label: "Pipeline",
        blurb: "Como a engine avalia uma tipologia, etapa por etapa.",
      },
      {
        href: "/docs/formulas",
        label: "Linguagem de fórmula",
        blurb: "Operadores, funções built-in e regras de sintaxe.",
      },
    ],
  },
  {
    title: "Estrutura de uma tipologia",
    pages: [
      {
        href: "/docs/variaveis",
        label: "Variáveis",
        blurb: "Os 4 tipos de input que o vendedor preenche.",
      },
      {
        href: "/docs/derivados",
        label: "Valores derivados",
        blurb: "Cálculos intermediários reutilizáveis.",
      },
      {
        href: "/docs/grupos-pecas",
        label: "Grupos & peças",
        blurb: "Como o vão se divide em grupos e papéis.",
      },
      {
        href: "/docs/seletores",
        label: "Seletores",
        blurb: "11 formas de mapear índices a papéis.",
      },
      {
        href: "/docs/precos",
        label: "Preço",
        blurb: "Componentes, bases de cobrança e condições.",
      },
    ],
  },
  {
    title: "Receitas",
    pages: [
      {
        href: "/docs/receitas/varanda",
        label: "Varanda 4 cantos",
        blurb: "Tipologia dinâmica com COUNT, derivados e múltiplos papéis.",
      },
      {
        href: "/docs/receitas/porta-bandeira",
        label: "Porta com bandeira",
        blurb: "Dois grupos no mesmo vão (folhas + bandeira).",
      },
      {
        href: "/docs/receitas/box-frontal",
        label: "Box frontal",
        blurb: "Split fixo 40/60 e cobrança por grupo.",
      },
    ],
  },
];

/** Lista plana na ordem da sidebar — útil para anterior/próximo. */
export const DOCS_PAGES_FLAT: DocsPage[] = DOCS_NAV.flatMap((g) => g.pages);

/** Resolve a página atual e suas vizinhas. */
export function getPageNav(currentHref: string): {
  current: DocsPage | null;
  prev: DocsPage | null;
  next: DocsPage | null;
} {
  const idx = DOCS_PAGES_FLAT.findIndex((p) => p.href === currentHref);
  if (idx === -1) return { current: null, prev: null, next: null };
  return {
    current: DOCS_PAGES_FLAT[idx],
    prev: idx > 0 ? DOCS_PAGES_FLAT[idx - 1] : null,
    next: idx < DOCS_PAGES_FLAT.length - 1 ? DOCS_PAGES_FLAT[idx + 1] : null,
  };
}

/** Busca o grupo ao qual uma página pertence. */
export function getGroupOf(currentHref: string): DocsGroup | null {
  return (
    DOCS_NAV.find((g) => g.pages.some((p) => p.href === currentHref)) ?? null
  );
}
