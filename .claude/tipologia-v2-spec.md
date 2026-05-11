# Tipologia v2 — Especificação Técnica

> ⚠️ **Histórico — substituída pela v3.** Esta spec descreve a v2, ancestral do modelo atual. A v3 (atual, implementada em 2026-04-29) introduziu:
>
> - `Tipologia.modoDeProducao` (`VAO` | `MEDIDA_DE_PRODUCAO`) — produtos orçados peça a peça (guarda-corpo) cabem como modo dedicado, em vez de gerar peças a partir de medidas do vão.
> - `Variable.nivel` (`ORCAMENTO` | `VAO` | `PECA`) — separa variáveis que vivem no orçamento, no vão ou em cada peça.
> - `Variable.kind=OPTION_LIST` com `options[]` — escolhas predefinidas como Cor do vidro, Tipo de instalação.
> - `PieceRole.condition` (expressão booleana) — múltiplos roles para o mesmo conceito, com a `condition` decidindo qual aplica em runtime (ex.: fixo no U vs ferragem).
> - `SpecificationTemplate` — entidade nova, exclusiva do modo MEDIDA, descreve furações/recortes/beneficiamentos da peça com schema de atributos, com `source` apontando para variáveis/computed values.
> - Pricing: novo `componentKind=BENEFICIAMENTO`, novos `basis=PER_ORCAMENTO|PER_SPECIFICATION`, novo `appliesTo=SPECIFICATION_TYPE`. Builtins do evaluator: `precoM2`, `precoTorre`, `count` (substituem o `precoM2_cor` da v2). `==`/`!=` aceitam strings (necessário para OPTION_LIST).
>
> Os 3 gaps revelados pelos casos 005/007 e listados em `tipologias-docs/INDEX.md` foram fechados pela v3. Esta spec v2 fica preservada como histórico do raciocínio que motivou a evolução.

> Especificação de um modelo paramétrico de tipologia para sistemas de orçamento de vidraçaria, com suporte a composição dinâmica, papéis de peça, regras em múltiplos níveis e preço componível. Projeto de estudo — partindo do zero, sem dívida de migração.

---

## 1. Visão

A Tipologia v2 é o núcleo de um motor de orçamento configurável. O administrador cadastra um produto-template descrevendo:

- Quais variáveis o vidraceiro vai informar (medidas, contagens, parâmetros).
- Que valores derivados são calculados a partir dessas variáveis.
- Quais grupos de peças compõem o produto e em que quantidade.
- Quais papéis cada peça pode assumir dentro de seu grupo, e quais peças do grupo recebem cada papel.
- Como o preço final é composto a partir de componentes (vidro, ferragem, instalação, etc.).

O motor recebe os valores que o vidraceiro informou e devolve a lista de peças concretas (com dimensões reais e arredondadas) mais o breakdown de preço.

### 1.1 O que muda em relação ao modelo paramétrico clássico

| Aspecto | Modelo clássico | Tipologia v2 |
|---|---|---|
| Topologia | Fixa em design-time (N peças) | Dinâmica em runtime (N depende de variável) |
| Diferenciação de peça | Nome, sem semântica | Papel (`role`) explícito por grupo |
| Camadas de cálculo | Vão e peça | Vão, grupo, peça |
| Preço | `preco_m2` agregado por (tipologia, cor) | Composto por `PricingRule` (vidro/ferragem/instalação/...) |
| Distribuição de quantidade por papel | Cada papel declara `quantidade` | Cada papel declara `selector` sobre o grupo |
| Validação estrutural | Manual | Cobertura do grupo verificada no save |

### 1.2 Princípios de design

1. **Estrutura no domínio, aritmética em fórmula.** Conceitos como "grupo" e "papel" são entidades. Cálculos são expressões em uma linguagem própria.
2. **Camadas de cálculo são cidadãs de primeira classe.** Vão, grupo e peça têm escopo explícito; uma fórmula declara a qual escopo pertence.
3. **Contexto é injetado, não inferido.** Toda fórmula sabe onde está rodando; o motor injeta `INDEX`, `TOTAL`, `ROLE` etc. no avaliador.
4. **Configuração inválida não compila.** Validação estrutural roda no save — cobertura de papéis, ciclo em valores derivados, expressões inválidas — e bloqueia o cadastro.
5. **Preço seguro server-side.** Componentes e expressões nunca saem do servidor. O vidraceiro vê total e área.
6. **O caso simples continua simples.** O poder do modelo não pode pesar sobre tipologias triviais.

---

## 2. Modelo de domínio

Cinco entidades centrais.

```
Tipologia
   ├── Variable        (entradas do vidraceiro)
   ├── ComputedValue   (variáveis derivadas; escopo VAO|GROUP|PIECE)
   ├── PieceGroup      (agrupador semântico)
   │     └── PieceRole (papel + selector + fórmulas de dimensão)
   └── PricingRule     (componentes de preço)
```

### 2.1 Tipologia

Cabeçalho do produto-template.

```
id, nome, descricao, categoria_id, imagem_url, desenho_esquematico_url,
ordem, ativo, created_at, updated_at
```

### 2.2 Variable — entrada do vidraceiro

```
id, tipologia_id
codigo            -- identificador usado em fórmulas (ex.: Lvao, Nfolhas)
label             -- texto exibido na UI (ex.: "Largura do vão")
descricao         -- tooltip
kind              -- DIMENSION | COUNT | TECHNICAL_PARAM | BOOLEAN
unit              -- mm/cm/m/un (depende do kind)
required          -- bool
default_value     -- expressão ou literal
min_value         -- expressão (pode referenciar outras variáveis)
max_value         -- expressão
order
```

O `kind` não é só metadado de UI — o motor usa para validar e o wizard usa para escolher o widget de input:

| kind | UI sugerida | Conversão de unidade | Uso típico |
|---|---|---|---|
| `DIMENSION` | input numérico com seletor de unidade | sempre para mm internamente | medidas físicas |
| `COUNT` | slider com `min`/`max` | sem unidade, inteiro | quantidades dinâmicas |
| `TECHNICAL_PARAM` | input ou select | depende | espessura, tolerâncias |
| `BOOLEAN` | toggle | n/a | flags ("ter bandeira?") |

`min_value` e `max_value` são expressões — permite "Nfolhas mínimo é `ceil(Lvao / 1200)`" sem precisar de validador especial.

### 2.3 ComputedValue — variáveis derivadas

```
id, tipologia_id
codigo            -- nome do valor derivado (Lutil, Lfolha, areaPorcao)
expression        -- expressão matemática
scope             -- VAO | GROUP | PIECE
piece_group_id    -- nullable (obrigatório para scope=GROUP|PIECE)
order_in_scope    -- ordem de avaliação dentro do escopo
```

Três escopos:

- **VAO** — roda 1× por orçamento. Vê todas as `Variable`.
- **GROUP** — roda 1× por grupo. Vê escopo VAO + variáveis de grupo (`GROUP_TOTAL`).
- **PIECE** — roda 1× por peça concreta. Vê escopos acima + contexto de peça (`INDEX`, `TOTAL`, `IS_FIRST`, `IS_LAST`, `ROLE`).

A ordem de avaliação dentro do escopo é determinística: `order_in_scope` ASC. Validação no save garante que não haja referência a `codigo` ainda não calculado.

### 2.4 PieceGroup — agrupador

Um grupo é "uma classe de peças com mesma quantidade base e que compartilham regras de composição".

```
id, tipologia_id
codigo                  -- FOLHAS, BANDEIRA, BIOMBO
label                   -- texto exibido
quantity_expression     -- expressão que devolve int (ex.: "Nfolhas", "1", "temBandeira ? 1 : 0")
order
```

Numa varanda simples há um grupo (`FOLHAS` com `quantity = Nfolhas`). Numa janela com bandeira há dois (`FOLHAS qty=2`, `BANDEIRA qty=1`). Numa porta-balcão complexa, três ou mais.

### 2.5 PieceRole — papel dentro do grupo

```
id, piece_group_id
codigo                  -- CANTO_ESQ, CENTRAL, CANTO_DIR, PADRAO
label                   -- "Folha de canto esquerdo"
selector_kind           -- ALL | FIRST | LAST | FIRST_AND_LAST | EXCEPT_FIRST_LAST
                        -- INDEX | INDEX_LIST | RANGE | ODD | EVEN | EXPRESSION
selector_value          -- depende do kind (ver §4)
width_expression        -- expressão da largura em mm
height_expression       -- expressão da altura em mm
order
```

A peça `selector` descreve **qual fatia do grupo cada papel reivindica**, em vez de declarar uma quantidade. Isso permite validação de cobertura no save.

Exemplo varanda:

```
Group FOLHAS, qty=Nfolhas
  Role CANTO_ESQ, selector=FIRST,                w=Lfolha+Pcanto, h=Afolha
  Role CENTRAL,   selector=EXCEPT_FIRST_LAST,    w=Lfolha,        h=Afolha
  Role CANTO_DIR, selector=LAST,                 w=Lfolha+Pcanto, h=Afolha
```

### 2.6 PricingRule — componentes de preço

```
id, tipologia_id
codigo                  -- VIDRO_M2, FERRAGEM_CANTO, INSTALACAO_VAO
component_kind          -- VIDRO | FERRAGEM | INSTALACAO | MAO_OBRA | OUTRO
basis                   -- PER_M2 | PER_PIECE | PER_GROUP | PER_VAO | FIXED
applies_to              -- TIPOLOGIA | GROUP_CODE | ROLE_CODE
applies_to_value        -- nullable (FOLHAS / CENTRAL,CANTO_ESQ,CANTO_DIR / ...)
expression              -- expressão que devolve número (R$)
condition               -- expressão booleana, opcional (quando aplicar)
order
ativo
```

A combinação `basis × applies_to` cobre a maior parte dos casos:

| basis | applies_to | Comportamento |
|---|---|---|
| `PER_M2` | `TIPOLOGIA` | multiplica pela área total de cobrança |
| `PER_M2` | `ROLE_CODE` | multiplica pela área das peças daquele papel |
| `PER_PIECE` | `ROLE_CODE` | aplica por peça com aquele papel |
| `PER_PIECE` | `GROUP_CODE` | aplica por peça do grupo |
| `PER_GROUP` | `GROUP_CODE` | aplica 1× por grupo presente |
| `PER_VAO` | `TIPOLOGIA` | aplica 1× pelo orçamento |
| `FIXED` | `TIPOLOGIA` | valor literal |

A `expression` pode usar qualquer variável ou valor derivado disponível no escopo (variáveis vão e contadores agregados pelo motor). A `condition` é uma expressão booleana — se devolver `false`, a regra é ignorada.

---

## 3. Linguagem de fórmula

### 3.1 Decisão arquitetural

Não escrever parser. Usar lib pronta com paridade documentada entre Java e JS.

- Java: `EvalEx` ou `mxParser`.
- JS: `expr-eval` ou `mathjs` (subset).

Razão: o modelo atual sofre com substituição literal de strings, ausência de funções, mensagens de erro genéricas e divergência entre os dois parsers. Uma lib pronta corta esses problemas na raiz.

### 3.2 Sintaxe

Operadores aritméticos, relacionais, lógicos, ternário e funções:

```
+  -  *  /  %  ^
==  !=  <  <=  >  >=
&&  ||  !
cond ? a : b
```

Funções obrigatórias: `min`, `max`, `floor`, `ceil`, `round`, `abs`, `sqrt`, `if(cond, a, b)`.

Identificadores são tokenizados — `L` e `Lv` são variáveis distintas, sem colisão. Isso é responsabilidade da lib.

### 3.3 Contexto disponível por escopo

| Símbolo | VAO | GROUP | PIECE | Origem |
|---|---|---|---|---|
| `Variable.codigo` | ✓ | ✓ | ✓ | entrada do vidraceiro (convertida para mm) |
| `ComputedValue` (scope=VAO) | ✓ | ✓ | ✓ | calculado antes |
| `GROUP_TOTAL` |  | ✓ | ✓ | resultado de `quantity_expression` do grupo |
| `ComputedValue` (scope=GROUP) |  | ✓ | ✓ | calculado para o grupo corrente |
| `INDEX` |  |  | ✓ | índice 1-based da peça no grupo |
| `TOTAL` |  |  | ✓ | total de peças do grupo (= `GROUP_TOTAL`) |
| `IS_FIRST` |  |  | ✓ | `INDEX == 1` |
| `IS_LAST` |  |  | ✓ | `INDEX == TOTAL` |
| `ROLE` |  |  | ✓ | string com `codigo` do papel |
| `ComputedValue` (scope=PIECE) |  |  | ✓ | calculado para a peça corrente |

### 3.4 Conversão de unidade

Todas as variáveis `DIMENSION` são convertidas para **mm** antes de qualquer avaliação. O fronteira de conversão é único, na entrada do motor.

### 3.5 Erros

O avaliador devolve erros estruturados (não exceção genérica):

```json
{
  "code": "FORMULA_PARSE_ERROR" | "FORMULA_REFERENCE_ERROR"
        | "FORMULA_DIVISION_BY_ZERO" | "FORMULA_TYPE_ERROR"
        | "FORMULA_RUNTIME_ERROR",
  "message": "Variable 'Lvxx' not found in scope PIECE",
  "scope": "PIECE",
  "expression": "Lvxx + Pcanto",
  "position": 0,
  "context": { "tipologia_id": 42, "role_code": "CANTO_ESQ" }
}
```

No HTTP, vira `422 Unprocessable Entity` com payload acima.

---

## 4. Linguagem de selector

Cada papel declara sua fatia do grupo. O motor avalia o selector contra os índices `1..GROUP_TOTAL` e materializa as peças.

### 4.1 Tipos de selector

| `selector_kind` | `selector_value` | Significado |
|---|---|---|
| `ALL` | (vazio) | todos os índices |
| `FIRST` | (vazio) | índice 1 |
| `LAST` | (vazio) | índice TOTAL |
| `FIRST_AND_LAST` | (vazio) | atalho para 1 e TOTAL |
| `EXCEPT_FIRST_LAST` | (vazio) | 2..TOTAL-1 |
| `INDEX` | `"3"` | índice específico |
| `INDEX_LIST` | `"1,3,5"` | lista de índices |
| `RANGE` | `"2..N-1"` | intervalo (suporta expressão em ambos os lados) |
| `ODD` | (vazio) | índices ímpares |
| `EVEN` | (vazio) | índices pares |
| `EXPRESSION` | `"INDEX % 2 == 0 && INDEX < TOTAL"` | predicado booleano avaliado por índice |

### 4.2 Validação de cobertura

No save, para cada `PieceGroup`, o backend valida: a união dos selectors dos papéis cobre exatamente `[1, TOTAL]` sem buracos nem sobreposição. Como `TOTAL` pode depender de variável, a validação roda para uma amostra de valores plausíveis (`min`, `max`, alguns intermediários da `Variable` referenciada por `quantity_expression`).

Erros possíveis:

- `SELECTOR_OVERLAP` — dois papéis reivindicam o mesmo índice.
- `SELECTOR_GAP` — algum índice em `[1, TOTAL]` não é coberto.
- `SELECTOR_OUT_OF_RANGE` — papel reivindica índice > TOTAL ou < 1.

---

## 5. Pipeline do motor de cálculo

### 5.1 Entrada

```json
{
  "tipologia_id": 42,
  "variables": { "Lvao": 4000, "Avao": 2200, "Nfolhas": 5 },
  "unit": "mm",
  "vidro": { "tipo_id": 7, "cor_id": 12 }
}
```

### 5.2 Algoritmo

```
1. fetch_completo(tipologia_id)
     - 1 SELECT com LEFT JOIN FETCH em Variable, ComputedValue,
       PieceGroup, PieceRole, PricingRule

2. converter_unidades(variables)
     - todas as DIMENSION → mm

3. validar_entrada(variables)
     - required, min_value, max_value (avaliados como expressão)
     - tipo (DIMENSION = numérico, BOOLEAN = bool, etc.)
     - se algo falhar → 422 com lista estruturada de erros

4. avaliar_computed_values(scope=VAO)
     - itera order_in_scope ASC
     - acumula em context_vao

5. para cada PieceGroup g em ordem:
     a. group_total = avaliar(g.quantity_expression, context_vao)
        - deve resolver para int >= 0
     b. context_grupo = context_vao + { GROUP_TOTAL: group_total }
     c. avaliar_computed_values(scope=GROUP, group=g) → context_grupo
     d. para cada index i em 1..group_total:
          - role = resolver_role(g, i)   // matching de selectors
          - context_peca = context_grupo + {
              INDEX, TOTAL, IS_FIRST, IS_LAST, ROLE
            }
          - avaliar_computed_values(scope=PIECE, group=g, role) → context_peca
          - w = avaliar(role.width_expression, context_peca)
          - h = avaliar(role.height_expression, context_peca)
          - peca = {
              group_code: g.codigo,
              role_code: role.codigo,
              index: i,
              w_real: floor(w), h_real: floor(h),
              w_cobranca: ceil50(floor(w)), h_cobranca: ceil50(floor(h)),
              area_real_m2: w_real * h_real / 1e6,
              area_cobranca_m2: w_cobranca * h_cobranca / 1e6
            }
          - emit peca

6. agregar(pecas)
     - area_real_total, area_cobranca_total
     - area_por_grupo, area_por_role
     - count_por_grupo, count_por_role

7. avaliar_pricing_rules(pecas, agregados, vidro_selecionado)
     - itera regras ativas em ordem
     - aplica condition (se houver)
     - calcula valor por basis × applies_to
     - retorna breakdown por componente

8. resposta = { pecas, agregados, breakdown, total }
```

### 5.3 Resposta

```json
{
  "tipologia_id": 42,
  "tipologia_nome": "Varanda 4 cantos",
  "variaveis_entrada":  { "Lvao": 4000, "Avao": 2200, "Nfolhas": 5 },
  "variaveis_calculadas": { "Lutil": 3650, "Lfolha": 730, "Afolha": 2100 },
  "pecas": [
    {
      "group_code": "FOLHAS", "role_code": "CANTO_ESQ", "index": 1,
      "w_real": 805, "h_real": 2100,
      "w_cobranca": 850, "h_cobranca": 2100,
      "area_real_m2": 1.6905, "area_cobranca_m2": 1.7850
    }
    // ...
  ],
  "totais": {
    "area_real_m2": 7.6650, "area_cobranca_m2": 8.0500,
    "quantidade_pecas": 5,
    "por_role": {
      "CANTO_ESQ": { "count": 1, "area_cob": 1.785 },
      "CENTRAL":   { "count": 3, "area_cob": 4.480 },
      "CANTO_DIR": { "count": 1, "area_cob": 1.785 }
    }
  },
  "preco": {
    "breakdown": [
      { "rule_code": "VIDRO_M2",       "kind": "VIDRO",      "valor": 2254.00 },
      { "rule_code": "FERRAGEM_CANTO", "kind": "FERRAGEM",   "valor":  360.00 },
      { "rule_code": "INSTALACAO_VAO", "kind": "INSTALACAO", "valor":  750.00 }
    ],
    "total": 3364.00
  }
}
```

> **Visibilidade.** O endpoint do vidraceiro devolve apenas `total`, `area_cobranca_m2` e a lista de peças sem expressões. O endpoint admin devolve `breakdown` completo.

---

## 6. Schema SQL

PostgreSQL. DDL completo, na ordem em que pode ser aplicado.

```sql
CREATE TABLE tipologia (
    id BIGSERIAL PRIMARY KEY,
    categoria_id BIGINT NOT NULL REFERENCES categoria(id),
    nome VARCHAR(200) NOT NULL,
    descricao TEXT,
    imagem_url VARCHAR(500),
    desenho_esquematico_url VARCHAR(500),
    ordem INT NOT NULL DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TYPE variable_kind AS ENUM
    ('DIMENSION', 'COUNT', 'TECHNICAL_PARAM', 'BOOLEAN');

CREATE TABLE variable (
    id BIGSERIAL PRIMARY KEY,
    tipologia_id BIGINT NOT NULL REFERENCES tipologia(id) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    label VARCHAR(200) NOT NULL,
    descricao TEXT,
    kind variable_kind NOT NULL,
    unit VARCHAR(10),
    required BOOLEAN NOT NULL DEFAULT TRUE,
    default_value TEXT,
    min_value TEXT,
    max_value TEXT,
    ordem INT NOT NULL DEFAULT 0,
    UNIQUE (tipologia_id, codigo)
);

CREATE TYPE compute_scope AS ENUM ('VAO', 'GROUP', 'PIECE');

CREATE TABLE computed_value (
    id BIGSERIAL PRIMARY KEY,
    tipologia_id BIGINT NOT NULL REFERENCES tipologia(id) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    expression TEXT NOT NULL,
    scope compute_scope NOT NULL,
    piece_group_id BIGINT REFERENCES piece_group(id) ON DELETE CASCADE,
    order_in_scope INT NOT NULL DEFAULT 0,
    UNIQUE (tipologia_id, codigo, scope, piece_group_id),
    CHECK (
        (scope = 'VAO' AND piece_group_id IS NULL) OR
        (scope IN ('GROUP', 'PIECE') AND piece_group_id IS NOT NULL)
    )
);

CREATE TABLE piece_group (
    id BIGSERIAL PRIMARY KEY,
    tipologia_id BIGINT NOT NULL REFERENCES tipologia(id) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    label VARCHAR(200) NOT NULL,
    quantity_expression TEXT NOT NULL,
    ordem INT NOT NULL DEFAULT 0,
    UNIQUE (tipologia_id, codigo)
);

CREATE TYPE selector_kind AS ENUM
    ('ALL', 'FIRST', 'LAST', 'FIRST_AND_LAST', 'EXCEPT_FIRST_LAST',
     'INDEX', 'INDEX_LIST', 'RANGE', 'ODD', 'EVEN', 'EXPRESSION');

CREATE TABLE piece_role (
    id BIGSERIAL PRIMARY KEY,
    piece_group_id BIGINT NOT NULL REFERENCES piece_group(id) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    label VARCHAR(200) NOT NULL,
    selector_kind selector_kind NOT NULL,
    selector_value TEXT,
    width_expression TEXT NOT NULL,
    height_expression TEXT NOT NULL,
    ordem INT NOT NULL DEFAULT 0,
    UNIQUE (piece_group_id, codigo)
);

CREATE TYPE pricing_basis AS ENUM
    ('PER_M2', 'PER_PIECE', 'PER_GROUP', 'PER_VAO', 'FIXED');

CREATE TYPE pricing_applies_to AS ENUM
    ('TIPOLOGIA', 'GROUP_CODE', 'ROLE_CODE');

CREATE TYPE pricing_component_kind AS ENUM
    ('VIDRO', 'FERRAGEM', 'INSTALACAO', 'MAO_OBRA', 'OUTRO');

CREATE TABLE pricing_rule (
    id BIGSERIAL PRIMARY KEY,
    tipologia_id BIGINT NOT NULL REFERENCES tipologia(id) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    label VARCHAR(200),
    component_kind pricing_component_kind NOT NULL,
    basis pricing_basis NOT NULL,
    applies_to pricing_applies_to NOT NULL,
    applies_to_value TEXT,
    expression TEXT NOT NULL,
    condition TEXT,
    ordem INT NOT NULL DEFAULT 0,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (tipologia_id, codigo)
);

CREATE INDEX idx_variable_tipologia ON variable(tipologia_id);
CREATE INDEX idx_computed_value_tipologia ON computed_value(tipologia_id);
CREATE INDEX idx_computed_value_group ON computed_value(piece_group_id) WHERE piece_group_id IS NOT NULL;
CREATE INDEX idx_piece_group_tipologia ON piece_group(tipologia_id);
CREATE INDEX idx_piece_role_group ON piece_role(piece_group_id);
CREATE INDEX idx_pricing_rule_tipologia ON pricing_rule(tipologia_id);
```

### 6.1 Relacionamento com modelo existente

`tipologia_tipos_vidro`, `tipologia_acessorios`, `tipologia_cor_vidro` (cor + preço por m² por cor) e o módulo de validação ABNT continuam como estão. A relação cor↔preço pode ser modelada como uma `PricingRule` `VIDRO PER_M2` cuja `expression` resolve via tabela auxiliar — ou mantida como tabela dedicada se for mais simples. Decisão a tomar (§ 9.3).

---

## 7. Validações no save

Roda no `POST /tipologias` e `PUT /tipologias/{id}`. Bloqueia o cadastro se qualquer regra falhar.

### 7.1 Sintaxe

- Toda `expression`, `min_value`, `max_value`, `default_value`, `quantity_expression`, `width_expression`, `height_expression`, `condition`, `selector_value` (quando aplicável) parseia sem erro.

### 7.2 Referências

- Toda variável referenciada por uma `expression` existe no escopo correto.
- `Variable.codigo` é único por tipologia.
- `ComputedValue.codigo` é único por (tipologia, scope, group).
- `PieceRole.codigo` é único por grupo.
- `PieceGroup.codigo` é único por tipologia.
- `PricingRule.codigo` é único por tipologia.
- `applies_to_value` em `PricingRule` referencia código existente quando `applies_to = GROUP_CODE | ROLE_CODE`.

### 7.3 DAG de dependências

- Construir grafo de dependências entre `ComputedValue` (e `Variable.default/min/max`).
- Detectar ciclo → `COMPUTED_VALUE_CYCLE`.
- Verificar que `order_in_scope` é compatível com a topologia do DAG (ou inferir a ordem topológica e ignorar `order_in_scope` se necessário).

### 7.4 Cobertura de selector

Para cada `PieceGroup`, amostrar valores plausíveis de `GROUP_TOTAL` (`min`, `max`, intermediários derivados das `Variable` referenciadas por `quantity_expression`). Para cada amostra, verificar:

- Cada índice 1..TOTAL é reivindicado por exatamente um `PieceRole`.
- Nenhum papel reivindica índice fora de [1, TOTAL].

### 7.5 Sanidade dimensional

Para uma combinação default das variáveis, avaliar todas as `width_expression`/`height_expression`. Se alguma resultar em ≤ 0 ou > limite plausível (ex.: 10m), emitir aviso. Avisos não bloqueiam, mas aparecem no admin.

---

## 8. Contratos de API

Apenas os endpoints novos do motor de cálculo. CRUD da tipologia segue o padrão do projeto.

### 8.1 Cálculo (vidraceiro)

```
POST /api/orcamento/calcular
```

Request:

```json
{
  "tipologia_id": 42,
  "variables": { "Lvao": 4000, "Avao": 2200, "Nfolhas": 5 },
  "unit": "mm",
  "vidro": { "tipo_id": 7, "cor_id": 12 }
}
```

Response (200): conforme §5.3, **sem** `breakdown`. O vidraceiro vê:

```json
{
  "pecas": [ /* dimensões reais e de cobrança, sem expressões */ ],
  "totais": { "area_cobranca_m2": 8.05, "quantidade_pecas": 5 },
  "preco": { "total": 3364.00 }
}
```

Erros:

- `400` — payload malformado.
- `404` — tipologia não encontrada / inativa.
- `422` — validação de entrada falhou (com lista de erros estruturados).

### 8.2 Cálculo (admin/preview)

```
POST /api/admin/orcamento/calcular
```

Mesma request. Response inclui `breakdown` completo, `variaveis_calculadas` e qualquer log de avaliação. Auth admin obrigatória.

### 8.3 Validação no save

```
POST /api/admin/tipologias
PUT  /api/admin/tipologias/{id}
```

Em caso de erro de validação estrutural, retorna 422 com lista:

```json
{
  "errors": [
    {
      "code": "SELECTOR_GAP",
      "field": "piece_groups[0].piece_roles",
      "message": "Index 3 is not covered by any role when GROUP_TOTAL=5",
      "context": { "group_code": "FOLHAS", "missing_index": 3, "tested_total": 5 }
    },
    {
      "code": "COMPUTED_VALUE_CYCLE",
      "field": "computed_values",
      "message": "Cycle: Lutil → Lfolha → Lutil",
      "context": { "cycle": ["Lutil", "Lfolha", "Lutil"] }
    }
  ]
}
```

---

## 9. Casos de uso modelados

### 9.1 Varanda dinâmica

```
Variables:
  Lvao    DIMENSION mm  required, min=2000, max=8000
  Avao    DIMENSION mm  required, min=1800, max=2800
  Nfolhas COUNT     un  required, min=3, max=10, default=5
  Pperfil TECHNICAL un  default=50
  Pcanto  TECHNICAL un  default=75

ComputedValues (scope=VAO):
  Lutil  = Lvao - 2*Pcanto - (Nfolhas - 1)*Pperfil
  Lfolha = Lutil / Nfolhas
  Afolha = Avao - 100

PieceGroups:
  FOLHAS  qty = Nfolhas
    Role CANTO_ESQ: selector=FIRST,             w=Lfolha+Pcanto, h=Afolha
    Role CENTRAL:   selector=EXCEPT_FIRST_LAST, w=Lfolha,        h=Afolha
    Role CANTO_DIR: selector=LAST,              w=Lfolha+Pcanto, h=Afolha

PricingRules:
  VIDRO_M2:
    component=VIDRO basis=PER_M2 applies_to=TIPOLOGIA
    expression = precoM2_cor(corVidro)
  FERRAGEM_CANTO:
    component=FERRAGEM basis=PER_PIECE applies_to=ROLE_CODE
    applies_to_value = "CANTO_ESQ,CANTO_DIR"
    expression = 180.00
  INSTALACAO_VAO:
    component=INSTALACAO basis=PER_VAO applies_to=TIPOLOGIA
    expression = 350 + 80 * Nfolhas
```

### 9.2 Porta com bandeira (topologia fixa)

```
Variables:
  Lvao DIMENSION mm
  Avao DIMENSION mm
  Aband DIMENSION mm  default=400

ComputedValues (scope=VAO):
  Apar = Avao - Aband

PieceGroups:
  FOLHAS qty=2
    Role PADRAO selector=ALL, w=Lvao/2 - 5, h=Apar
  BANDEIRA qty=1
    Role PADRAO selector=ALL, w=Lvao, h=Aband

PricingRules:
  VIDRO_M2: PER_M2 TIPOLOGIA expression=precoM2_cor(corVidro)
```

Nota: tipologia simples não fica mais complicada pela existência do modelo. Um grupo, um papel, selector `ALL`. O caso simples continua simples.

### 9.3 Box frontal

```
Variables:
  Lvao DIMENSION mm
  Avao DIMENSION mm

PieceGroups:
  FOLHAS qty=2
    Role FIXA   selector=FIRST, w=Lvao*0.4 - 5, h=Avao
    Role MOVEL  selector=LAST,  w=Lvao*0.6 - 5, h=Avao

PricingRules:
  VIDRO_M2: ...
  FERRAGEM_BOX: PER_GROUP GROUP_CODE=FOLHAS expression=420.00
```

---

## 10. Roadmap de implementação

Para projeto de estudo, divisão sugerida em quatro entregas. Cada uma é demoável de ponta a ponta.

### Entrega 1 — Modelo + cálculo de peças

- Schema SQL (sem `pricing_rule`).
- Entidades, repositórios, DTOs.
- Lib de fórmula integrada (Java + JS, com testes de paridade).
- Linguagem de selector (parser).
- Pipeline de cálculo de peças (até §5.2 passo 6).
- CRUD admin via API.
- Validação no save (§7.1, 7.2, 7.3, 7.4).
- Testes do caso varanda + porta com bandeira.

Ao final: dado um payload de entrada, retorna lista de peças expandidas. Sem preço.

### Entrega 2 — Pricing

- `pricing_rule` no schema.
- Avaliador de regras (§5.2 passo 7).
- Endpoint admin com `breakdown` e endpoint vidraceiro com total apenas.
- Snapshot de preço no orçamento criado (cada `OrcamentoItem` carrega componentes e expressões avaliadas).

### Entrega 3 — UI admin (modo avançado)

- Tab "Variáveis" com `kind`.
- Tab "Valores derivados" agrupados por escopo.
- Tab "Grupos & peças" com simulador (mockup já desenhado).
- Tab "Preço" com simulador de breakdown (mockup já desenhado).
- Validação client-side espelhando server-side.
- Render dos erros estruturados.

### Entrega 4 — Wizard do vidraceiro

- Etapa de variáveis: render por `kind` (slider para COUNT, input + select de unidade para DIMENSION, toggle para BOOLEAN).
- Pré-visualização do diagrama esquemático em tempo real.
- Resumo da composição (count por papel).
- Integração com validação ABNT existente.
- Submit com snapshot de preço.

---

## 11. Trade-offs e decisões abertas

Pontos onde múltiplas abordagens são defensáveis. Documentar a decisão escolhida no projeto.

### 11.1 Lib de fórmula

Trade-off: dependência externa vs parser próprio.

- Externa: ganho imediato em features, tokenização correta, mensagens de erro.
- Própria: zero dependência, controle total, mas precisa de paridade JS↔Java construída na mão.

Recomendação: **externa**, com um wrapper fino que normaliza diferenças de sintaxe entre as libs Java e JS. Testes de paridade rodam em CI com casos de teste compartilhados (JSON com `{ expression, context, expected }`).

### 11.2 Snapshot de preço no orçamento

O modelo atual congela `preco_m2` e `preco_total` no `Orcamento`. No v2, o snapshot precisa ser mais rico:

- `OrcamentoItem` carrega: peça expandida + componentes de preço aplicados + expressão original (para auditoria).
- Tabela `orcamento_breakdown` com cada componente avaliado.

Decisão: nível de detalhe do snapshot. Quanto mais detalhado, mais auditável; quanto menos, mais barato.

### 11.3 Cor × preço por m² — manter tabela dedicada?

Opções:

- **Manter `tipologia_cor_vidro` com `preco_m2`** e expor função `precoM2_cor(corVidro)` na linguagem de fórmula. A `PricingRule` `VIDRO_M2` fica `expression = precoM2_cor(corVidro)`.
- **Modelar como `pricing_rule` com `condition`** por cor — uma regra por cor. Mais flexível, mas explode número de regras.

Recomendação: **manter tabela**. Cor é um eixo recorrente; tabela é mais simples de cadastrar e queryar. A função `precoM2_cor(corVidro)` é injetada como builtin do avaliador.

### 11.4 Versionamento da tipologia

Quando o admin altera uma tipologia que já tem orçamentos pendentes, o que acontece?

- Snapshot resolve o problema histórico (orçamentos antigos não mudam).
- Mas o admin pode querer "esta tipologia versão 2 entra em vigor a partir de DD/MM/AAAA".

Para v1 do projeto de estudo, **não versionar**. Snapshot resolve os casos críticos. Versionamento é evolução natural.

### 11.5 Preview no admin

O simulador do admin precisa rodar offline (sem chamar API) ou pode chamar `POST /admin/orcamento/calcular` a cada keystroke?

- Offline: lib JS espelha lib Java; latência zero; risco de divergência.
- Online: fonte única da verdade; latência de rede.

Recomendação: **online com debounce de 300ms**. Garante paridade absoluta. A divergência client↔server é o problema mais caro de depurar; melhor não tê-lo.

### 11.6 Configurações técnicas elegíveis por peça

O modelo atual permite declarar quais `ItemConfiguracaoTecnica` são elegíveis para cada peça. Como isso encaixa no v2?

- Como `applies_to_value` em `PricingRule` quando o item afeta preço (puxador X custa mais que Y).
- Como atributo opcional em `PieceRole` para o caso só-metadado.

Decisão a tomar quando o requisito ficar mais concreto.

### 11.7 Como modelar acessórios

Acessórios são produtos do catálogo, não peças de vidro. No v2, ficam fora dos `PieceGroup` (não são peças). Continuam como itens separados no orçamento. A elegibilidade de acessórios por tipologia continua via tabela pivot.

---

## 12. Glossário

| Termo | Significado |
|---|---|
| **Tipologia** | Produto-template parametrizável (ex.: "Varanda 4 cantos"). |
| **Variable** | Entrada que o vidraceiro fornece (`Lvao`, `Nfolhas`). |
| **ComputedValue** | Valor derivado por fórmula a partir de variáveis e/ou outros valores derivados. |
| **PieceGroup** | Conjunto de peças com mesma quantidade base e regras compartilhadas. |
| **PieceRole** | Papel que uma peça assume dentro do grupo, com fórmulas próprias de dimensão. |
| **Selector** | Regra que define quais índices de um grupo recebem um determinado papel. |
| **PricingRule** | Componente de preço (vidro, ferragem, instalação...) com basis e escopo de aplicação. |
| **Vão** | Espaço físico que o produto vai ocupar; contexto de orçamento. |
| **Peça** | Unidade física de vidro a ser cortada. Peças são instâncias concretas geradas a partir de `PieceRole`. |
| **Área real** | Área da peça nas dimensões exatas. |
| **Área de cobrança** | Área da peça arredondada para o múltiplo de 50mm acima. É o que o vidraceiro paga. |
| **Snapshot** | Cópia congelada de preço/dimensões no orçamento, para auditoria e estabilidade. |

---

## Apêndice A — Exemplo de payload de cadastro

```json
{
  "nome": "Varanda 4 cantos",
  "categoria_id": 3,
  "ordem": 10,
  "ativo": true,
  "variables": [
    { "codigo": "Lvao", "label": "Largura do vão", "kind": "DIMENSION", "unit": "mm",
      "required": true, "min_value": "2000", "max_value": "8000", "ordem": 1 },
    { "codigo": "Avao", "label": "Altura do vão", "kind": "DIMENSION", "unit": "mm",
      "required": true, "min_value": "1800", "max_value": "2800", "ordem": 2 },
    { "codigo": "Nfolhas", "label": "Quantidade de folhas", "kind": "COUNT", "unit": "un",
      "required": true, "min_value": "3", "max_value": "10", "default_value": "5", "ordem": 3 },
    { "codigo": "Pperfil", "label": "Espessura do perfil", "kind": "TECHNICAL_PARAM", "unit": "mm",
      "required": false, "default_value": "50", "ordem": 4 },
    { "codigo": "Pcanto", "label": "Espessura do canto", "kind": "TECHNICAL_PARAM", "unit": "mm",
      "required": false, "default_value": "75", "ordem": 5 }
  ],
  "computed_values": [
    { "codigo": "Lutil",  "expression": "Lvao - 2*Pcanto - (Nfolhas - 1)*Pperfil",
      "scope": "VAO", "order_in_scope": 1 },
    { "codigo": "Lfolha", "expression": "Lutil / Nfolhas",
      "scope": "VAO", "order_in_scope": 2 },
    { "codigo": "Afolha", "expression": "Avao - 100",
      "scope": "VAO", "order_in_scope": 3 }
  ],
  "piece_groups": [
    {
      "codigo": "FOLHAS", "label": "Folhas da varanda",
      "quantity_expression": "Nfolhas", "ordem": 1,
      "piece_roles": [
        { "codigo": "CANTO_ESQ", "label": "Canto esquerdo",
          "selector_kind": "FIRST", "selector_value": null,
          "width_expression": "Lfolha + Pcanto", "height_expression": "Afolha", "ordem": 1 },
        { "codigo": "CENTRAL", "label": "Folha central",
          "selector_kind": "EXCEPT_FIRST_LAST", "selector_value": null,
          "width_expression": "Lfolha", "height_expression": "Afolha", "ordem": 2 },
        { "codigo": "CANTO_DIR", "label": "Canto direito",
          "selector_kind": "LAST", "selector_value": null,
          "width_expression": "Lfolha + Pcanto", "height_expression": "Afolha", "ordem": 3 }
      ]
    }
  ],
  "pricing_rules": [
    { "codigo": "VIDRO_M2", "component_kind": "VIDRO",
      "basis": "PER_M2", "applies_to": "TIPOLOGIA",
      "expression": "precoM2_cor(corVidro)", "ordem": 1, "ativo": true },
    { "codigo": "FERRAGEM_CANTO", "component_kind": "FERRAGEM",
      "basis": "PER_PIECE", "applies_to": "ROLE_CODE", "applies_to_value": "CANTO_ESQ,CANTO_DIR",
      "expression": "180.00", "ordem": 2, "ativo": true },
    { "codigo": "INSTALACAO_VAO", "component_kind": "INSTALACAO",
      "basis": "PER_VAO", "applies_to": "TIPOLOGIA",
      "expression": "350 + 80 * Nfolhas", "ordem": 3, "ativo": true }
  ]
}
```

---

## Apêndice B — Casos de teste mínimos

```
caso "varanda 5 folhas":
  given Lvao=4000, Avao=2200, Nfolhas=5
  expect 5 peças: 1 CANTO_ESQ + 3 CENTRAL + 1 CANTO_DIR
  expect área_cobrança_total ≈ 8.05 m²
  expect breakdown.VIDRO > 0, breakdown.FERRAGEM = 360, breakdown.INSTALACAO = 750

caso "varanda mínima":
  given Nfolhas=3
  expect 3 peças: 1 CANTO_ESQ + 1 CENTRAL + 1 CANTO_DIR
  expect cobertura sem buraco

caso "porta com bandeira":
  given tipologia=PORTA_BANDEIRA, Lvao=900, Avao=2400, Aband=400
  expect 3 peças: 2 FOLHAS + 1 BANDEIRA

caso "validação selector overlap":
  given role A selector=FIRST, role B selector=ALL
  expect erro SELECTOR_OVERLAP no save

caso "validação selector gap":
  given role A selector=FIRST, role B selector=LAST, Nfolhas=3..10
  expect erro SELECTOR_GAP (índice 2 a Nfolhas-1 não cobertos)

caso "validação ciclo":
  given Lutil=Lfolha+1, Lfolha=Lutil-1
  expect erro COMPUTED_VALUE_CYCLE no save

caso "fórmula com referência inexistente":
  given Afolha = "Avao - Pinexistente"
  expect erro FORMULA_REFERENCE_ERROR no save

caso "snapshot estável":
  given orçamento criado, depois admin muda preco_m2 da cor
  expect orçamento mantém valor original
```
