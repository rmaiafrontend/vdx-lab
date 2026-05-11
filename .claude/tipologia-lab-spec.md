# Tipologia Lab — Especificação Técnica

> ⚠️ **Atualizada para v3 em 2026-04-29.** O lab agora implementa a Tipologia v3 (modos de produção VAO/MEDIDA_DE_PRODUCAO, nivel em variáveis, condition em PieceRole, SpecificationTemplate, novos basis de pricing). Esta spec descreve o lab como ele estava na v2 — algumas escolhas de stack, layout de pastas e roadmap citam entidades v2; o estado atual difere em:
>
> - **Schema Prisma:** modelos `SpecificationTemplate`, `CorVidro` + `CorVidroPreco`, `ModeloTorre` adicionados; `Tipologia.modoDeProducao`, `Variable.nivel/options`, `PieceRole.condition` adicionados como colunas. Ver [prisma/schema.prisma](../prisma/schema.prisma).
> - **Engine:** dispatcher [pipeline.ts](../src/lib/engine/pipeline.ts) + dois pipelines (`pipeline-vao.ts`, `pipeline-medida.ts`); evaluator com builtins `precoM2`/`precoTorre`/`count`; `validation.ts` com regras cruzadas modo↔entidade e cobertura com condition.
> - **Seeds:** três tipologias da spec v3 (`003-varanda-dinamica.json`, `005-porta-com-fixo.json`, `006-guarda-corpo.json`) substituem os antigos `varanda.json`/`porta-bandeira.json`/`box-frontal.json`. Catálogos auxiliares em `cor-vidro.json` e `modelo-torre.json`.
> - **UI:** admin com aba Especificações exclusiva de MEDIDA, simulador ramificado por modo; wizard com shells separados (`wizard-shell-vao.tsx`, `wizard-shell-medida.tsx`).
>
> Ver [.claude/tipologia-v2-spec.md](./tipologia-v2-spec.md) (com aviso de história) para o modelo v2 original e [tipologias-docs/INDEX.md](../tipologias-docs/INDEX.md) para o catálogo de casos com status atualizado e os 3 gaps fechados pela v3.

> Especificação do laboratório de validação do modelo Tipologia. Foco: validar o modelo de dados, o motor de cálculo e a UX antes de escrever a versão final em Java/Spring + React/Vite. Stack escolhida pelo critério de **velocidade de iteração**, não por paridade com produção.

Documento companheiro: `tipologia-v2-spec.md` (modelo conceitual histórico, anota a evolução para v3).

---

## 1. Objetivo do lab

Validar três hipóteses antes de comprometer com a stack final:

1. **O modelo de domínio das 5 entidades cobre os casos reais.** Varanda dinâmica funciona, porta com bandeira continua simples, e os casos que aparecerem nas próximas semanas encaixam sem inventar entidade nova.
2. **A UX do admin é viável.** Cadastrar uma tipologia complexa via UI (com simulador, validação ao vivo, fórmulas) não é tortura. Se for, o modelo precisa de ajuste.
3. **A vidraceira consegue usar o wizard.** Composição dinâmica não confunde. O slider de `Nfolhas` faz sentido. A pré-visualização ajuda em vez de atrapalhar.

Não-objetivos do lab: performance, segurança, multi-tenancy, autenticação, paridade visual com a stack final, validação ABNT real, snapshots de orçamento, persistência confiável.

### 1.1 O que sobrevive ao lab

Um único artefato: a pasta `src/lib/engine/` em TypeScript, e os testes em `tests/engine/`. Ela é a especificação executável que vai virar referência ao escrever o motor em Java. Tudo o mais (UI, schema Prisma, deploy) é descartável.

---

## 2. Stack

| Camada | Escolha | Versão alvo |
|---|---|---|
| Runtime | Node.js | 20 LTS |
| Framework | Next.js (App Router) | 15.x |
| Linguagem | TypeScript | 5.x, `strict: true` |
| Banco local | SQLite | via `better-sqlite3` |
| Banco remoto (deploy) | libSQL/Turso | mesmo Prisma client |
| ORM | Prisma | 5.x |
| Estilo | Tailwind CSS | 3.x |
| Componentes | shadcn/ui | última |
| Avaliador de fórmula | mathjs | 13.x (subset) |
| Validação | Zod | 3.x |
| Testes | Vitest | 2.x |
| Deploy | Vercel | — |
| Auth | nenhuma | — |

### 2.1 Justificativa por camada

**Next.js full-stack.** Server actions e route handlers eliminam a fronteira HTTP entre admin UI e motor. O motor é importado como módulo TS — sem REST de mentira no meio.

**SQLite + Prisma.** `prisma migrate dev` reseta o schema em segundos. O modelo vai mudar dezenas de vezes; Postgres + Flyway aqui seria peso morto. Turso aceita o mesmo cliente Prisma quando o lab for público.

**mathjs.** Decisão da spec v2 (§3.1): não escrever parser. Como o lab só roda em JS, não há problema de paridade — é uma implementação só. `mathjs` cobre tudo que a spec exige (`min`, `max`, `floor`, `ceil`, `if` via expressão, ternário) e tem evaluador `parse(expr).evaluate(scope)` direto.

**shadcn/ui.** Componentes ficam no repo, customizáveis. O admin precisa de inputs específicos (campo de fórmula, picker de selector) que se beneficiam de adaptação fácil. Tailwind é a base.

**Zod.** Os payloads das §5 e §8 da spec v2 ficam tipados em runtime, não só em TS. Validação de save (§7) tem shape consistente entre cliente e servidor.

**Vitest.** Mais rápido que Jest no setup. O `tests/engine/` precisa rodar em < 2s para não atrapalhar o ciclo.

**Sem auth.** Lab. Único usuário no admin é o desenvolvedor; vidraceira acessa wizard via link.

---

## 3. Arquitetura

```
tipologia-lab/
├── prisma/
│   ├── schema.prisma                ← Tipologia + 5 entidades + Categoria
│   └── migrations/
├── seed/
│   ├── varanda.json                 ← apêndice A da spec v2
│   ├── porta-bandeira.json
│   └── box-frontal.json
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                 ← redirect /admin
│   │   ├── admin/
│   │   │   ├── layout.tsx           ← chrome do admin
│   │   │   ├── page.tsx             ← lista de tipologias
│   │   │   └── tipologias/
│   │   │       ├── nova/page.tsx
│   │   │       └── [id]/page.tsx    ← editor com 5 abas
│   │   ├── wizard/
│   │   │   ├── page.tsx             ← seletor de tipologia
│   │   │   └── [tipologiaId]/page.tsx ← wizard com pré-visualização
│   │   └── api/
│   │       ├── tipologias/route.ts
│   │       ├── tipologias/[id]/route.ts
│   │       └── calcular/route.ts
│   ├── lib/
│   │   ├── engine/                  ← núcleo, sobrevive ao lab
│   │   │   ├── types.ts
│   │   │   ├── evaluator.ts         ← wrapper sobre mathjs
│   │   │   ├── selector.ts          ← gramática de selector
│   │   │   ├── pipeline.ts          ← algoritmo §5.2 da spec v2
│   │   │   ├── pricing.ts           ← avaliador de PricingRule
│   │   │   ├── validation.ts        ← §7 validações de save
│   │   │   └── errors.ts            ← códigos de erro estruturados
│   │   ├── db.ts                    ← Prisma singleton
│   │   ├── schemas.ts               ← Zod das requests
│   │   └── utils.ts
│   └── components/
│       ├── ui/                      ← shadcn/ui (gerados)
│       ├── admin/
│       │   ├── tipologia-tabs.tsx
│       │   ├── tab-basicas.tsx
│       │   ├── tab-variaveis.tsx
│       │   ├── tab-derivados.tsx
│       │   ├── tab-grupos-pecas.tsx
│       │   ├── tab-preco.tsx
│       │   ├── formula-input.tsx
│       │   ├── selector-picker.tsx
│       │   └── simulador.tsx
│       └── wizard/
│           ├── variable-input.tsx   ← roteia por kind
│           ├── diagrama.tsx         ← SVG da composição
│           └── resumo-composicao.tsx
└── tests/
    └── engine/
        ├── evaluator.test.ts
        ├── selector.test.ts
        ├── pipeline.test.ts
        ├── pricing.test.ts
        └── validation.test.ts
```

### 3.1 Princípios de organização

- **`src/lib/engine/` não importa nada de Next.js, Prisma, ou React.** Funções puras de TS sobre estruturas de dados. Testáveis isoladamente.
- **Server actions e route handlers consomem `engine/`.** O Prisma carrega a tipologia, transforma para a struct do `engine/`, chama o pipeline, devolve o resultado.
- **Componentes de UI consomem o resultado tipado.** Não fazem cálculo próprio.

---

## 4. Schema Prisma

Adaptação fiel do DDL da §6 da spec v2 para SQLite + Prisma. Notas:

- SQLite não tem ENUM nativo — vira string com check em runtime via Zod.
- SQLite não tem `JSONB` — strings JSON quando necessário, mas a spec não exige nesse nível.
- Cascade deletes mantidos.

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Categoria {
  id        Int        @id @default(autoincrement())
  nome      String
  ordem     Int        @default(0)
  ativo     Boolean    @default(true)
  tipologias Tipologia[]
}

model Tipologia {
  id                       Int      @id @default(autoincrement())
  categoriaId              Int
  categoria                Categoria @relation(fields: [categoriaId], references: [id])
  nome                     String
  descricao                String?
  imagemUrl                String?
  desenhoEsquematicoUrl    String?
  ordem                    Int      @default(0)
  ativo                    Boolean  @default(true)
  createdAt                DateTime @default(now())
  updatedAt                DateTime @updatedAt

  variables                Variable[]
  computedValues           ComputedValue[]
  pieceGroups              PieceGroup[]
  pricingRules             PricingRule[]
}

model Variable {
  id           Int       @id @default(autoincrement())
  tipologiaId  Int
  tipologia    Tipologia @relation(fields: [tipologiaId], references: [id], onDelete: Cascade)
  codigo       String
  label        String
  descricao    String?
  kind         String    // DIMENSION | COUNT | TECHNICAL_PARAM | BOOLEAN
  unit         String?
  required     Boolean   @default(true)
  defaultValue String?
  minValue     String?
  maxValue     String?
  ordem        Int       @default(0)

  @@unique([tipologiaId, codigo])
}

model ComputedValue {
  id            Int        @id @default(autoincrement())
  tipologiaId   Int
  tipologia     Tipologia  @relation(fields: [tipologiaId], references: [id], onDelete: Cascade)
  codigo        String
  expression    String
  scope         String     // VAO | GROUP | PIECE
  pieceGroupId  Int?
  pieceGroup    PieceGroup? @relation(fields: [pieceGroupId], references: [id], onDelete: Cascade)
  orderInScope  Int        @default(0)

  @@unique([tipologiaId, codigo, scope, pieceGroupId])
}

model PieceGroup {
  id                  Int      @id @default(autoincrement())
  tipologiaId         Int
  tipologia           Tipologia @relation(fields: [tipologiaId], references: [id], onDelete: Cascade)
  codigo              String
  label               String
  quantityExpression  String
  ordem               Int      @default(0)

  pieceRoles          PieceRole[]
  computedValues      ComputedValue[]

  @@unique([tipologiaId, codigo])
}

model PieceRole {
  id                Int      @id @default(autoincrement())
  pieceGroupId      Int
  pieceGroup        PieceGroup @relation(fields: [pieceGroupId], references: [id], onDelete: Cascade)
  codigo            String
  label             String
  selectorKind      String   // ALL | FIRST | LAST | FIRST_AND_LAST | EXCEPT_FIRST_LAST | INDEX | INDEX_LIST | RANGE | ODD | EVEN | EXPRESSION
  selectorValue     String?
  widthExpression   String
  heightExpression  String
  ordem             Int      @default(0)

  @@unique([pieceGroupId, codigo])
}

model PricingRule {
  id              Int      @id @default(autoincrement())
  tipologiaId     Int
  tipologia       Tipologia @relation(fields: [tipologiaId], references: [id], onDelete: Cascade)
  codigo          String
  label           String?
  componentKind   String   // VIDRO | FERRAGEM | INSTALACAO | MAO_OBRA | OUTRO
  basis           String   // PER_M2 | PER_PIECE | PER_GROUP | PER_VAO | FIXED
  appliesTo       String   // TIPOLOGIA | GROUP_CODE | ROLE_CODE
  appliesToValue  String?
  expression      String
  condition       String?
  ordem           Int      @default(0)
  ativo           Boolean  @default(true)

  @@unique([tipologiaId, codigo])
}
```

### 4.1 Connection string

```
# .env
DATABASE_URL="file:./dev.db"

# .env.production (Vercel + Turso)
DATABASE_URL="libsql://...turso.io"
DATABASE_AUTH_TOKEN="..."
```

---

## 5. Motor de cálculo (`src/lib/engine/`)

Implementação fiel ao algoritmo da §5.2 da spec v2. Cada arquivo tem responsabilidade isolada.

### 5.1 `types.ts`

Tipos da entrada/saída do pipeline. Espelho dos contratos da §8 da spec v2, sem dependência de Prisma — para que `engine/` possa ser portado para Java sem refactor.

```typescript
// resumo (a versão completa fica no projeto)
export type CalcInput = {
  tipologia: TipologiaSnapshot
  variables: Record<string, number | boolean>
  unit: 'mm' | 'cm' | 'm'
  vidro?: { tipoId: number; corId: number; precoM2?: number }
}

export type CalcOutput = {
  pecas: PecaCalculada[]
  variaveisCalculadas: Record<string, number>
  totais: Totais
  preco: { breakdown: BreakdownItem[]; total: number }
}

export type PecaCalculada = {
  groupCode: string
  roleCode: string
  index: number
  wReal: number; hReal: number
  wCobranca: number; hCobranca: number
  areaRealM2: number; areaCobrancaM2: number
}
```

### 5.2 `evaluator.ts`

Wrapper sobre `mathjs.parse(...).evaluate(scope)` com:

- Builtins explícitos (`min`, `max`, `floor`, `ceil`, `round`, `abs`, `sqrt`, `if`, `precoM2_cor`).
- Whitelist de funções expostas (impede acesso a `mathjs.import`, `eval` etc.).
- Erros estruturados (códigos da §3.5 da spec v2).

```typescript
export function evaluate(
  expression: string,
  scope: Record<string, unknown>,
  ctx: EvaluationContext
): number | boolean {
  try {
    const node = math.parse(expression)
    const result = node.evaluate(scope)
    return result
  } catch (err) {
    throw new FormulaError({
      code: classify(err),
      expression,
      scope: ctx.scope,
      context: ctx,
      cause: err,
    })
  }
}
```

### 5.3 `selector.ts`

Resolve `(SelectorKind, selectorValue, GROUP_TOTAL) → Set<number>` (índices do grupo que o papel reivindica).

Implementação direta dos 11 tipos da §4 da spec v2. `EXPRESSION` reusa `evaluator.ts` internamente.

### 5.4 `pipeline.ts`

O algoritmo §5.2 inteiro. Função pura: `(CalcInput) → CalcOutput`. Sem I/O, sem Prisma, sem console.log.

```typescript
export function runPipeline(input: CalcInput): CalcOutput {
  const ctx = converterUnidades(input)
  validarEntrada(ctx)               // throws com 422-shape
  const ctxVao = avaliarVAO(ctx)
  const pecas: PecaCalculada[] = []

  for (const group of ctx.tipologia.pieceGroups) {
    const groupTotal = avaliar(group.quantityExpression, ctxVao, ...)
    const ctxGroup = { ...ctxVao, GROUP_TOTAL: groupTotal }
    const ctxGroupComputed = avaliarGROUP(group, ctxGroup)

    for (let i = 1; i <= groupTotal; i++) {
      const role = resolverRole(group, i, groupTotal)
      const ctxPiece = { ...ctxGroupComputed, INDEX: i, TOTAL: groupTotal,
                         IS_FIRST: i === 1, IS_LAST: i === groupTotal,
                         ROLE: role.codigo }
      const ctxPieceComputed = avaliarPIECE(group, role, ctxPiece)
      const w = avaliar(role.widthExpression, ctxPieceComputed, ...)
      const h = avaliar(role.heightExpression, ctxPieceComputed, ...)
      pecas.push(montarPeca(group, role, i, w, h))
    }
  }

  const totais = agregar(pecas)
  const breakdown = avaliarPricing(input.tipologia.pricingRules, pecas, totais, ctxVao)
  return { pecas, variaveisCalculadas: ctxVao, totais, preco: { breakdown, total: sum(breakdown) } }
}
```

### 5.5 `pricing.ts`

Avalia `PricingRule[]` contra peças calculadas. Itera regras ativas, aplica `condition`, calcula valor por `basis × applies_to`. Devolve `BreakdownItem[]`.

### 5.6 `validation.ts`

Roda no `POST /tipologias` antes de persistir. Implementa §7 inteira:

- Sintaxe (parse de toda expressão).
- Referências (existência de variáveis citadas).
- DAG sem ciclo.
- Cobertura de selector (amostragem de `GROUP_TOTAL`).
- Sanidade dimensional (dimensões > 0 com defaults).

Retorna `ValidationError[]` (mesma shape do 422 da §8.3 da spec v2).

### 5.7 `errors.ts`

Códigos:

```typescript
export const ERROR_CODES = {
  // formula
  FORMULA_PARSE_ERROR: 'FORMULA_PARSE_ERROR',
  FORMULA_REFERENCE_ERROR: 'FORMULA_REFERENCE_ERROR',
  FORMULA_DIVISION_BY_ZERO: 'FORMULA_DIVISION_BY_ZERO',
  FORMULA_TYPE_ERROR: 'FORMULA_TYPE_ERROR',
  FORMULA_RUNTIME_ERROR: 'FORMULA_RUNTIME_ERROR',
  // selector
  SELECTOR_OVERLAP: 'SELECTOR_OVERLAP',
  SELECTOR_GAP: 'SELECTOR_GAP',
  SELECTOR_OUT_OF_RANGE: 'SELECTOR_OUT_OF_RANGE',
  // computed values
  COMPUTED_VALUE_CYCLE: 'COMPUTED_VALUE_CYCLE',
  // input
  REQUIRED_VARIABLE_MISSING: 'REQUIRED_VARIABLE_MISSING',
  VARIABLE_OUT_OF_RANGE: 'VARIABLE_OUT_OF_RANGE',
} as const
```

---

## 6. API (route handlers)

Apenas o necessário para o lab. Tudo sob `/api/`.

### 6.1 Endpoints

```
GET    /api/tipologias              ← lista (com count de pecas e roles)
POST   /api/tipologias              ← cria; valida via §7; 422 se inválido
GET    /api/tipologias/:id          ← detalhe completo
PUT    /api/tipologias/:id          ← atualiza; mesma validação
DELETE /api/tipologias/:id          ← hard delete (lab; em prod seria soft)

POST   /api/calcular                ← roda pipeline; modo público (sem breakdown)
POST   /api/admin/calcular          ← mesmo, com breakdown

GET    /api/categorias              ← lista (read-only, seedada)
```

### 6.2 Modo público vs admin

A diferença é só no shape da resposta. Se a request vier com header `x-admin: 1`, devolve `breakdown` completo; senão, só `preco.total`. **Isso não é segurança real** — é só para validar o contrato. Em produção a separação é JWT.

### 6.3 Erros

422 com lista de `ValidationError[]` (shape da §8.3 da spec v2). 400 para malformado, 404 para não encontrado, 500 para o resto.

---

## 7. UI Admin

Cinco abas, espelhando os mockups. Cada aba é um componente isolado em `src/components/admin/`.

### 7.1 Aba "Básicas"

- Nome (text)
- Categoria (select carregado de `/api/categorias`)
- Descrição (textarea)
- Imagem URL (text — sem upload no lab)
- Ordem (number)
- Ativo (switch)

### 7.2 Aba "Variáveis"

Lista editável de Variables. Cada linha:

- Código, label
- Kind (select com 4 opções)
- Unit (select condicional ao kind)
- Required (switch)
- Default, min, max (campos de fórmula — `formula-input.tsx`)

`+ Nova variável` adiciona linha. Drag-handle reordena (lib `@dnd-kit/sortable`).

### 7.3 Aba "Valores derivados"

Lista agrupada por escopo (VAO, GROUP, PIECE). Para escopos GROUP/PIECE, seletor de grupo.

Cada linha: código, expressão, ordem.

### 7.4 Aba "Grupos & peças" — a aba principal

**Layout split: editor à esquerda, simulador à direita.** Replica o mockup desktop.

Editor:
- Cards de PieceGroup (codigo, label, quantity_expression).
- Dentro de cada card, lista de PieceRole (codigo, label, selector_kind via `selector-picker`, expressões de width/height).
- Selo verde/vermelho de cobertura (resultado de `validation.checkCoverage()`).

Simulador (`simulador.tsx`):
- Inputs gerados dinamicamente a partir das Variables (slider para COUNT, input para DIMENSION).
- Diagrama esquemático SVG (mesma lógica do mockup).
- Tabela de peças geradas com largura×altura real e de cobrança.
- Totais de área.

O simulador chama `/api/admin/calcular` com debounce de 300ms (decisão da §11.5 da spec v2: online, não offline). Loading state discreto.

### 7.5 Aba "Preço"

Lista de PricingRule, cada uma como card:
- Toggle ativo/inativo
- Codigo, label, componentKind
- Basis (select), appliesTo (select), appliesToValue (campo condicional)
- Expression (formula-input)
- Condition (formula-input opcional)

Simulador de breakdown ao lado direito, idem mockup.

### 7.6 Componentes especiais

**`formula-input.tsx`** — input de texto com:
- Fonte monoespaçada
- Validação ao perder foco (parse via `engine.evaluator.parse`)
- Indicador visual de erro (borda vermelha + tooltip com mensagem)
- Lista de variáveis disponíveis no escopo (autocomplete simples)

**`selector-picker.tsx`** — duas linhas:
- Select com os 11 `selectorKind`
- Input condicional para `selectorValue` quando o kind exige (INDEX, INDEX_LIST, RANGE, EXPRESSION)

---

## 8. UI Wizard (vidraceiro)

### 8.1 Página `/wizard`

Lista de tipologias ativas em cards. Click → `/wizard/[id]`. Mobile-first.

### 8.2 Página `/wizard/[tipologiaId]`

Replica o mockup. Layout single-column em mobile, split em desktop.

**Etapa 1 — Variáveis** (única etapa do lab; etapas seguintes ficam para a v2 oficial):

- Inputs gerados a partir de `tipologia.variables`:
  - `COUNT` → slider com `min/max/default` da Variable
  - `DIMENSION` → input numérico + select de unidade
  - `BOOLEAN` → switch
  - `TECHNICAL_PARAM` → input numérico (ou select se tiver opções pré-definidas — escopo da v2)
- Ordem dos inputs: `COUNT` primeiro, depois `DIMENSION`, depois resto. Ajuda o vidraceiro porque a contagem reorganiza o diagrama.

**Pré-visualização**:

- Diagrama SVG da composição (proporcional, com cores por role).
- Resumo: contagem por papel, área de cobrança, total estimado.

Tudo recalcula em tempo real via `/api/calcular` (debounce 300ms).

### 8.3 Restrições

Sem auth, sem persistência de orçamento, sem fluxo de aprovação. O wizard é **uma calculadora** no lab. O propósito é ver se a vidraceira entende o modelo, não orçar de verdade.

---

## 9. Seed e dados de teste

```
seed/
├── categorias.json        ← 5 categorias (varandas, portas, janelas, boxes, outros)
├── varanda.json           ← apêndice A da spec v2
├── porta-bandeira.json    ← caso §9.2
└── box-frontal.json       ← caso §9.3
```

Script `prisma/seed.ts` carrega tudo. Roda em `prisma migrate reset --seed`.

---

## 10. Testes

Apenas o `engine/`. Vitest. Casos do apêndice B da spec v2 viram tests parametrizados.

```
tests/engine/
├── evaluator.test.ts        ← funções aritméticas, builtins, erros estruturados
├── selector.test.ts         ← os 11 kinds, casos de borda
├── pipeline.test.ts         ← varanda 5 folhas, varanda 3, porta com bandeira
├── pricing.test.ts          ← breakdown da varanda, condition false ignora regra
└── validation.test.ts       ← gap, overlap, ciclo, referência inexistente
```

Meta: todos os casos do apêndice B passam. CI roda em `npm test` antes de commit (lefthook ou husky — opcional).

---

## 11. Roadmap em dias

Estimativa para alguém com a stack na ponta da língua. Trabalho de noite/fim de semana, dias não são contínuos.

| Dia | Entrega |
|---|---|
| 1 | Bootstrap (Next, Prisma, shadcn, Tailwind, schema, seed). Lista de tipologias com JSON cru. |
| 2 | `engine/evaluator.ts` + `selector.ts` + testes. Sem API, sem UI. |
| 3 | `engine/pipeline.ts` (sem pricing) + testes. |
| 4 | `engine/validation.ts` + testes. |
| 5 | API: CRUD tipologias + `/api/calcular`. Wizard mínimo (form bobo, tabela de peças). |
| 6 | UI Admin abas Básicas/Variáveis/Derivados. |
| 7 | UI Admin aba Grupos & peças com simulador. |
| 8 | `engine/pricing.ts` + aba Preço com simulador. |
| 9 | Wizard polido com diagrama SVG, mobile, debounce. |
| 10 | Deploy Vercel + Turso. Compartilhar link com a vidraceira. |

A partir do dia 11: iteração com base no feedback. O lab está vivo enquanto trouxer aprendizado novo. Quando parar, vira referência para o projeto oficial.

---

## 12. Critérios de "lab funcionou"

Ao final, considera-se sucesso se:

1. Cadastrei a varanda dinâmica via UI sem precisar mexer em JSON cru.
2. Cadastrei mais 2 tipologias reais (uma sugerida pela vidraceira).
3. A vidraceira simulou ≥ 5 vãos diferentes no wizard sem ajuda direta.
4. Identifiquei pelo menos 2 ajustes ao modelo (provável: gramática de selector incompleta, falta um `kind` de variável, pricing precisa de `basis` novo).
5. Os testes do `engine/` passam para os 3 casos modelados.

Se algum desses falhar, o aprendizado vale mais que o sucesso. O ponto é descobrir agora, não em produção.

---

## 13. O que não fazer no lab

Lista explícita de tentações. Tudo aqui **não pertence ao lab**, mesmo que pareça útil:

- Autenticação, multi-tenancy, RLS.
- TanStack Query (server actions e fetch nativo bastam).
- Storybook, Playwright, Cypress.
- Docker, docker-compose.
- CI/CD elaborado (Vercel já dá deploy preview por PR de graça).
- Versionamento de tipologia.
- Snapshot rico de orçamento.
- Validação ABNT real (mockar como função `validarABNT(...) → ok`).
- Otimização de queries Prisma (incluir tudo com `include` está OK no lab).
- i18n.
- Tema dark.
- Animações além do que vem nativo no shadcn.
- Refatorar o `engine/` "para ficar mais limpo" antes dos testes passarem.

A regra de ouro: se a feature não responde a uma das três hipóteses da §1, ela não entra.

---

## 14. Transição para o projeto oficial

Quando o lab cumprir os critérios da §12, o projeto oficial começa do zero — não é refatoração do lab. O que viaja:

1. **Spec v2 atualizada** com o que foi aprendido (gramática de selector ajustada, kinds de variável que faltaram, etc.).
2. **Pasta `engine/` em TS** como referência de comportamento. Cada função vira referência para a equivalente em Java.
3. **`tests/engine/`** como casos de teste a serem reimplementados em JUnit, garantindo paridade.
4. **JSONs de seed** como casos de aceitação do projeto oficial.

Nada de UI, schema Prisma, ou componentes React viaja. O projeto oficial usa Java/Spring + React/Vite + Postgres + Flyway, com o cuidado de refletir o comportamento do `engine/` no novo motor Java.

---

## Apêndice A — Bootstrap

Comandos para começar do zero. Servem como documentação do README.

```bash
# 1. criar o projeto
npx create-next-app@latest tipologia-lab \
  --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"
cd tipologia-lab

# 2. dependências
npm install prisma @prisma/client mathjs zod
npm install -D vitest @vitejs/plugin-react @testing-library/react

# 3. shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button input select switch slider \
  tabs card dialog tooltip badge separator label textarea

# 4. prisma
npx prisma init --datasource-provider sqlite
# editar schema.prisma com o conteúdo da §4
npx prisma migrate dev --name init

# 5. seed
# criar prisma/seed.ts e seed/*.json
# adicionar "prisma": { "seed": "tsx prisma/seed.ts" } ao package.json
npx prisma db seed

# 6. dev
npm run dev
```

---

## Apêndice B — Variáveis de ambiente

```
# .env (local)
DATABASE_URL="file:./dev.db"

# .env.production (Vercel)
DATABASE_URL="libsql://<seu-db>.turso.io"
DATABASE_AUTH_TOKEN="..."
```

Nenhum outro segredo. Lab.

---

## Apêndice C — Decisões para revisitar pós-lab

Pontos onde o lab pode demonstrar que a decisão da spec v2 precisa de ajuste:

- **Online vs offline na pré-visualização do admin.** Spec escolheu online. Se latência atrapalhar a UX em vão real, reconsiderar.
- **Lib de fórmula.** Spec não fixou Java; lab usa mathjs. Se aparecerem casos que mathjs não cobre, isso entra como requisito da escolha em Java.
- **Gramática de selector.** 11 kinds parece confortável; se a vidraceira pedir caso que não encaixa, o conjunto cresce.
- **Kinds de Variable.** 4 kinds; ENUM eventual ("escolha entre opções pré-definidas") pode aparecer.
- **`basis` de PricingRule.** 5 valores; se ferragem por linha ou regra com taxa percentual aparecer, vira `basis` novo.

Cada ajuste vira uma issue, não um refactor in-place do lab. O lab está congelado depois do dia 10 — só responde a perguntas, não evolui sozinho.
