# vdx lab

Laboratório para modelar **tipologias de vidraçaria** — varandas, portas, janelas, boxes, guarda-corpos — e transformar cada modelo em um simulador de orçamento usável pelo vendedor.

O nome interno do pacote é `tipologia-lab`. O projeto é a base sobre a qual a engine de cálculo e o cadastro de produtos da vidraçaria são desenhados, testados e iterados.

---

## Para que serve

A vidraçaria precisa orçar peças de vidro com regras que mudam por produto: número de folhas variável, fórmula de largura diferente conforme tipo de instalação, peças com furação especial, preço composto de vidro + ferragem + mão de obra etc.

O vdx lab resolve isso oferecendo:

1. **Um modelo de dados** que descreve uma tipologia como um conjunto de variáveis, valores derivados, grupos de peças, papéis, especificações técnicas e regras de preço.
2. **Uma engine de cálculo** que, dado um cadastro e os inputs do vendedor, deriva as peças, agrega áreas e monta o preço final.
3. **Um admin** para cadastrar tipologias.
4. **Um wizard** para o vendedor cotar uma peça concreta a partir de uma tipologia cadastrada.
5. **Documentação** dos conceitos centrais e receitas de tipologias reais.

---

## Conceitos centrais

Toda tipologia é descrita por cinco entidades principais (spec v3):

| Entidade | O que é |
|---|---|
| **Variable** | Dado que o vendedor preenche no wizard. Tipos: `DIMENSION`, `COUNT`, `TECHNICAL_PARAM`, `BOOLEAN`, `OPTION_LIST`. Cada variável tem um `nivel` (`ORCAMENTO` \| `VAO` \| `PECA`). |
| **ComputedValue** | Cálculo intermediário derivado de variáveis. Tem `scope` (`VAO` \| `GROUP` \| `PIECE` \| `ORCAMENTO_PECA`) e não aparece como input. |
| **PieceGroup** | Agrupador semântico de peças (ex.: folhas, bandeira, fixos). Tem uma `quantityExpression` que define quantas peças o grupo gera em runtime. |
| **PieceRole** | Define como um subconjunto das peças do grupo é calculado. Tem um `selector` (ALL, FIRST, LAST, INDEX, RANGE, ODD, EVEN, EXPRESSION etc.), uma `condition` opcional e expressões para `width` e `height`. |
| **PricingRule** | Componente do orçamento. Tem `componentKind` (`VIDRO`, `FERRAGEM`, `INSTALACAO`, `MAO_OBRA`, `BENEFICIAMENTO`, `OUTRO`), `basis` (`PER_M2`, `PER_PIECE`, `PER_GROUP`, `PER_VAO`, `PER_ORCAMENTO`, `PER_SPECIFICATION`, `FIXED`) e `appliesTo`. O total é a soma das regras ativas. |

Há ainda o **SpecificationTemplate**, que descreve atributos técnicos extras de uma peça (furação, recortes, etc.) — usado apenas no modo `MEDIDA_DE_PRODUCAO`.

### Modos de produção

Toda tipologia tem um `modoDeProducao` imutável após criação:

- **VAO** — o vendedor informa medidas de um vão (ex.: largura e altura totais) e a engine deriva as peças a partir das fórmulas.
- **MEDIDA_DE_PRODUCAO** — o vendedor informa peça por peça (medidas próprias por peça). Útil para guarda-corpos, espelhos avulsos, recortes em massa.

Cada modo tem pipeline e UI próprios.

---

## Como a engine avalia uma tipologia

Quando o vendedor preenche os inputs no wizard, a engine percorre as seguintes etapas:

```
1. Conversão de unidade   →  todas DIMENSION viram mm
2. Validação              →  required, type, min/max
3. VAO scope              →  variáveis + valores derivados (escopo VAO)
4. Loop por grupo         →  quantity → roles → peças
5. Agregação              →  área total, contagem por papel
6. Preço                  →  regras ativas (filtradas por condition)
```

A engine vive em [src/lib/engine/](src/lib/engine/), com pipelines separados em [pipeline-vao.ts](src/lib/engine/pipeline-vao.ts) e [pipeline-medida.ts](src/lib/engine/pipeline-medida.ts), evaluator de fórmulas em [evaluator.ts](src/lib/engine/evaluator.ts), resolução de seletores em [selector.ts](src/lib/engine/selector.ts), pricing em [pricing.ts](src/lib/engine/pricing.ts) e validação em [validation.ts](src/lib/engine/validation.ts).

---

## Do que o lab é capaz hoje

### Modelagem
- Suporta tipologias com **número dinâmico de peças** (ex.: varanda com N folhas).
- Suporta **papéis distintos no mesmo grupo** (canto vs central, fixa vs móvel) via seletores.
- Suporta **fórmulas variantes por escolha de instalação** (ex.: instalação no U vs. ferragem) via `condition` em PieceRole.
- Suporta **especificações técnicas adicionais por peça** (furação, recortes) via SpecificationTemplate.
- Suporta **preço por componente** (vidro + ferragem + instalação) e **preço por papel** (ferragem só nos cantos, p. ex.).
- Suporta dois **modos de entrada**: vão único (engine deriva peças) ou lista de peças (vendedor informa cada peça).

### Catálogos auxiliares
Há tabelas auxiliares para alimentar builtins do evaluator:
- **CorVidro / CorVidroPreco** — preço por m² indexado por (cor, espessura), via `precoM2(cor, espessura)`.
- **ModeloTorre** — preço de torre de furação para guarda-corpos, via `precoTorre(modelo)`.

### Tipologias já modeladas (seeds)
- **003 — Varanda dinâmica** (modo VAO, composição dinâmica, papéis distintos).
- **005 — Porta de giro com fixo** (modo VAO, múltiplos grupos, fórmulas variantes por instalação).
- **006 — Guarda-corpo com peças heterogêneas** (modo MEDIDA_DE_PRODUCAO, com SpecificationTemplate de furação).

Os seeds vivem em [seed/](seed/) e cada um tem teste em [tests/](tests/). O catálogo conceitual com todos os casos (modelados ou ainda em backlog) está em [tipologias-docs/INDEX.md](tipologias-docs/INDEX.md).

### Áreas da aplicação
- [/admin](src/app/admin) — listagem, criação e edição de tipologias.
- [/wizard/[tipologiaId]](src/app/wizard) — vendedor cota uma peça preenchendo as variáveis e vendo o resultado em tempo real.
- [/docs](src/app/docs) — documentação interativa dos cinco conceitos centrais (variáveis, derivados, grupos de peças, seletores, fórmulas, preços, pipeline) e receitas comentadas.
- [/api](src/app/api) — endpoints REST para tipologias, categorias e cálculo.

---

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**.
- **Prisma** sobre **SQLite** ([prisma/schema.prisma](prisma/schema.prisma)).
- **Tailwind CSS** + **Radix UI** (via shadcn/ui) + **lucide-react**.
- **mathjs** como base para o evaluator de fórmulas (extendido com builtins próprios e funções de unidade).
- **Zod** para schemas de validação em runtime ([src/lib/schemas.ts](src/lib/schemas.ts)).
- **dnd-kit** para reordenação no admin.
- **Vitest** + **Testing Library** para testes da engine.

---

## Como rodar

```bash
npm install
npm run db:migrate   # aplica migrations e cria dev.db
npm run db:seed      # popula tipologias-exemplo + catálogos
npm run dev          # http://localhost:3000  (redireciona para /admin)
```

Outros scripts úteis:

| Script | O que faz |
|---|---|
| `npm run test` | Roda a suíte do Vitest |
| `npm run test:watch` | Vitest em modo watch |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | Reseta o banco e re-seeda |
| `npm run build` / `npm run start` | Build de produção e start |

---

## Estrutura do projeto

```
src/
  app/
    admin/           painel de cadastro de tipologias
    wizard/          simulador para o vendedor
    docs/            documentação interativa dos conceitos
    api/             endpoints REST (calcular, tipologias, categorias)
  components/        UI (admin, wizard, docs, ui base)
  lib/
    engine/          pipeline de cálculo, evaluator, selector, pricing, validação
    db.ts            cliente Prisma
    schemas.ts       schemas Zod
    snapshot.ts      snapshot serializável de uma tipologia para a engine
    tipologia-write.ts  persistência transacional do cadastro

prisma/
  schema.prisma      modelo de dados
  migrations/        histórico de migrations
  seed.ts            popula seeds e catálogos

seed/                JSONs das tipologias-exemplo
tipologias-docs/     catálogo conceitual de casos (e gaps do modelo)
tests/               testes da engine
```

---

## Filosofia

O lab é **um laboratório**, não o produto final. A ideia é validar o modelo contra casos reais — cada tipologia que aparece é uma sonda contra a spec. Se o modelo cobre, vira seed + teste; se não cobre, vira gap documentado em [tipologias-docs/INDEX.md](tipologias-docs/INDEX.md) e motiva uma evolução da spec.

A v3 atual já fechou os três gaps que motivaram sua criação (fórmulas variantes por instalação, modos de entrada, especificação técnica adicional). Novos gaps só são abertos quando vários casos confirmam o mesmo padrão.
