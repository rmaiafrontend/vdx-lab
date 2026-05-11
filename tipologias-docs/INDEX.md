# Catálogo de casos de tipologia

> Conjunto de casos que servem de teste contra o modelo de tipologia. Cada caso é uma sonda — se o modelo cobre, vira teste em `tests/engine/` e seed em `seed/`; se não cobre, revela um gap.
>
> **Status do modelo:** v3 implementada. Os 3 gaps consolidados que motivaram a evolução foram fechados (ver final deste documento). A spec v3 introduziu `modoDeProducao` (VAO | MEDIDA_DE_PRODUCAO), `Variable.nivel`, `PieceRole.condition` e `SpecificationTemplate`. Casos 003, 005 e 006-guarda-corpo (renumerado a partir do antigo 007) viraram seeds reais e estão verificados em testes.

---

## Como usar este catálogo

**Para entender o domínio.** Se você é novo no projeto, leia em ordem: o `_template.md` para conhecer a estrutura, o caso 003 (varanda dinâmica, modo VAO simples) como referência, depois 005 (modo VAO com `condition`) e por fim 007 (modo MEDIDA_DE_PRODUCAO + SpecificationTemplate).

**Para validar uma mudança no modelo.** Ao alterar a spec v3 (entidades, gramática de selector, novo `kind`/`nivel`/`scope`, novo `basis` de preço), volte ao catálogo e marque os casos afetados. Se algum caso modelado quebrar, a mudança precisa de cuidado.

**Para registrar um caso novo.** Use o `_template.md`. Numere sequencialmente. Atualize a Tabela 1 e a matriz da Tabela 2. Se o caso revelar um gap, documente em "Gaps consolidados".

**O que não está aqui.** Implementação, JSON de seed, código. O catálogo é o nível conceitual — fica entre a spec v3 e o lab. JSONs viáveis vivem em `seed/` (`003-varanda-dinamica.json`, `005-porta-com-fixo.json`, `006-guarda-corpo.json`); testes vivem em `tests/engine/`.

---

## Tabela 1 — Lista de casos

| ID | Nome | Categoria | Modo | Status | Gaps revelados |
|---|---|---|---|---|---|
| 001 | Porta pivotante simples | Portas | VAO | a documentar | — |
| 002 | Porta com bandeira | Portas | VAO | a documentar | — |
| 003 | [Varanda dinâmica](./003-varanda-dinamica.md) | Varandas | VAO | ✅ modelado v3 + seed | — |
| 004 | Box frontal | Boxes | VAO | a documentar | — |
| 005 | [Porta de giro com fixo](./005-porta-de-giro-com-fixo.md) | Portas | VAO | ✅ modelado v3 + seed | (resolvido) fórmulas variantes por escolha de instalação |
| 006 | [Janela quatro folhas (2 fixas + 2 corrediças)](./006-janela-quatro-folhas.md) | Janelas | VAO | modelado (não seedado) | possível: variável de input não consumida por fórmula visível (`ABF`) |
| 007 | [Guarda-corpo com peças heterogêneas](./007-guarda-corpo.md) | Guarda-corpos | MEDIDA_DE_PRODUCAO | ✅ modelado v3 + seed | (resolvido) modo de entrada lista de peças; especificação técnica adicional |

*Atualize esta tabela ao adicionar caso novo. Mantenha em ordem de ID. Note que o caso 007 (guarda-corpo) é seedado como `006-guarda-corpo.json` — a numeração da spec v3 §9.3 e a do catálogo divergem por motivos históricos; o conteúdo é o mesmo.*

### Status possíveis

| Status | Significado |
|---|---|
| `a documentar` | Conhecemos o caso, ainda não foi escrito |
| `modelado v3 + seed` | Caso descrito, cabe no modelo v3, e existe como seed JSON + teste no engine |
| `modelado` | Caso descrito e cabe no modelo v3, mas ainda sem seed dedicado |
| `parcialmente coberto` | Cabe com aproximação ou perda de algum aspecto |
| `revela gap` | Não cabe no modelo atual; aponta evolução necessária |
| `obsoleto` | Caso documentado mas que não vai ser modelado (decisão registrada nas notas) |

---

## Tabela 2 — Matriz de particularidades

> Linhas = casos. Colunas = particularidades catalogadas. Célula `✓` quando o caso tem aquela característica, vazio quando não.

| ID | Composição dinâmica | Papéis distintos no mesmo grupo | Múltiplos grupos | Preço por componente | Preço por papel | Regra ABNT condicional | Validação por dimensão de peça | Peça não-retangular | Fórmula variante por escolha de instalação | Modo de entrada lista de peças | Especificação técnica adicional |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 003 | ✓ | ✓ |   | ✓ | ✓ |   |   |   |   |   |   |
| 005 |   |   | ✓ |   |   |   |   |   | ✓ |   |   |
| 006 |   | ✓ |   | ✓ | ✓ |   |   |   |   |   |   |
| 007 | ✓ |   |   | ✓ |   | ✓ | ✓ |   |   | ✓ | ✓ |

*Quando aparecer uma particularidade nova que ainda não tem coluna, adicione coluna nova ao final e marque retroativamente os casos que têm.*

### Particularidades catalogadas

Definição curta de cada coluna, para evitar interpretação dúbia:

- **Composição dinâmica.** Número de peças depende de variável de runtime, não é fixo no cadastro.
- **Papéis distintos no mesmo grupo.** Dentro de um mesmo grupo de peças, há subconjuntos que se calculam de forma diferente (canto vs central, fixa vs móvel).
- **Múltiplos grupos.** Mais de um agrupador semântico de peças (ex.: folhas + bandeira).
- **Preço por componente.** Total composto de mais de uma `PricingRule` (vidro + ferragem + instalação, e não só `preco_m2` agregado).
- **Preço por papel.** Algum componente de preço se aplica só a peças de papel específico (ex.: ferragem só nos cantos).
- **Regra ABNT condicional.** Existe regra externa que altera comportamento (ex.: "vidro temperado obrigatório acima de X metros de altura").
- **Validação por dimensão de peça.** Existe regra que limita dimensão da peça gerada, não só do vão (ex.: "nenhuma folha pode passar de 1500mm para temperado 8mm").
- **Peça não-retangular.** A peça final tem corte que não é retângulo simples (chanfro, recorte para puxador, formato L).
- **Fórmula variante por escolha de instalação.** A fórmula que calcula largura/altura de uma peça muda em função de uma escolha do vidraceiro no momento do orçamento (ex.: instalação no U vs. ferragem). Não é mudança de topologia, é mudança de regra de cálculo selecionada em runtime.
- **Modo de entrada lista de peças.** A tipologia é orçada informando peça por peça (medidas próprias por peça) em vez de informar medidas de um vão único e o motor derivar peças. Cabe em produtos orçados em massa (guarda-corpo, espelhos avulsos, recortes).
- **Especificação técnica adicional.** A peça carrega informação estruturada além de largura/altura (furação, recorte, chanfro, polimento especial). Não muda o formato do corte, mas afeta ficha de produção, preço e validação ABNT.

*Adicione novas linhas à medida que casos novos revelarem comportamentos novos.*

---

## Gaps consolidados

Lista de gaps descobertos pela leitura conjunta dos casos. Cada gap referencia os casos que o motivam, o que ajuda a priorizar — quanto mais casos apontam para o mesmo gap, mais urgente o ajuste no modelo.

### Gaps fechados pela v3

> **Gap 1 — Fórmulas variantes por escolha de instalação. ✅ RESOLVIDO em v3.** Casos #005, #002 (provável).
>
> A v3 introduziu o campo `condition` em `PieceRole` (uma expressão booleana opcional). Múltiplos roles podem coexistir num mesmo `PieceGroup`, cada um com sua condition; o motor avalia condition antes de resolver selector e descarta os roles cuja condition é falsa. A validação de cobertura no save amostra combinações de variáveis BOOLEAN/OPTION_LIST referenciadas em qualquer condition do grupo (cap em 32 amostras), garantindo que para cada combinação algum role cubra cada índice.
>
> Implementação: [src/lib/engine/pipeline-vao.ts](../src/lib/engine/pipeline-vao.ts) (`assignRoles`), [src/lib/engine/validation.ts](../src/lib/engine/validation.ts) (`checkSelectorCoverage`). Caso seedado em [seed/005-porta-com-fixo.json](../seed/005-porta-com-fixo.json) com `TipoInstalacao` em OPTION_LIST e dois roles `FIXO_U` / `FIXO_FERRAGEM` cobrindo as duas variantes.

> **Gap 2 — Modos de entrada da tipologia. ✅ RESOLVIDO em v3.** Caso #007.
>
> A v3 introduziu `Tipologia.modoDeProducao` com dois valores: `VAO` (motor deriva peças a partir de medidas do vão) e `MEDIDA_DE_PRODUCAO` (vidraceiro informa peça por peça). O modo é imutável após criação. Cada modo tem pipeline próprio ([pipeline-vao.ts](../src/lib/engine/pipeline-vao.ts), [pipeline-medida.ts](../src/lib/engine/pipeline-medida.ts)) e UI própria no admin/wizard. Variáveis ganham `nivel` (ORCAMENTO | VAO | PECA) coerente com o modo: `nivel=PECA` só é válido em MEDIDA_DE_PRODUCAO, `nivel=VAO` só em VAO. ComputedValue ganha scope `ORCAMENTO_PECA` (exclusivo de MEDIDA).
>
> Caso seedado em [seed/006-guarda-corpo.json](../seed/006-guarda-corpo.json) com 9 variáveis (3 nivel=ORCAMENTO + 6 nivel=PECA).

> **Gap 3 — Especificação técnica adicional da peça (furação, recortes, etc.). ✅ RESOLVIDO em v3.** Caso #007.
>
> A v3 introduziu `SpecificationTemplate` (apenas em modo MEDIDA_DE_PRODUCAO). Cada template tem `codigo`, `label`, `requiredMin/Max` e `schemaAtributos` (JSON descrevendo atributos com `type`, `required`, `default`, `min/max`, `options`, `source`). A peça da entrada carrega lista de `PieceSpecification` cujos atributos são materializados pelo motor (com `source` resolvendo para variáveis/computed values da peça). Pricing ganhou `basis=PER_SPECIFICATION` e `appliesTo=SPECIFICATION_TYPE` para iterar sobre as specs e usar atributos no cálculo, e `componentKind=BENEFICIAMENTO` para classificar.
>
> No caso 007, o template `FURACAO` resolve `qtdTorres`, `furosPorTorre`, `distBordaH/V` e `distEntreTorres` (computed) a partir das variáveis da peça. O preço da furação é `8 * qtdTorres * furosPorTorre` por especificação.

### Gaps registrados (abertos)

*Nenhum no momento. Espere preenchimento depois de mais casos confirmarem padrões — recomendado depois de 10–15 casos documentados.*

Formato sugerido para cada gap futuro:

> **Gap N — [Nome curto].** Casos #X, #Y, #Z.
>
> [Descrição em 2-4 linhas: o que falta no modelo, qual o impacto, e quais caminhos de evolução parecem viáveis. Não tem que decidir aqui; tem que registrar a fronteira.]

---

## Sessões de inventário

Registro das sessões em que casos foram levantados, especialmente as conversas com a vidraceira. Útil para auditoria e para lembrar o contexto de cada caso.

| Data | Participantes | Casos levantados | Notas |
|---|---|---|---|
| — | — | — | sessão pendente |

*Recomendação: primeira sessão de inventário com a vidraceira para listar os 10 produtos mais comuns que ela orça e os 5 mais chatos. Os comuns provavelmente viram casos `modelados`; os chatos provavelmente viram `revela gap`.*

---

## Convenções

- **Linguagem:** português do Brasil em todo o conteúdo. Termos técnicos do modelo (`PieceGroup`, `PieceRole`, `SpecificationTemplate`, `selector`, `kind`, `nivel`, `condition`) só aparecem no bloco 5 (composição esperada) e no pseudocódigo opcional, e nesse caso ficam em inglês para refletir a spec v3 fielmente.
- **Unidades:** mm para dimensões, m² para áreas, R$ para valores. Sempre explícitas.
- **Pseudocódigo:** opcional. Sempre depois da prosa, em bloco de código. Não substitui a explicação narrativa.
- **Imagens:** quando houver, ficam em `docs/casos/img/{ID}-nome.{png,jpg,svg}` e são referenciadas com caminho relativo no bloco 2.
- **Numeração:** três dígitos com zeros à esquerda (`001`, `042`, `127`). Mantém ordenação estável e sugere espaço para crescer.
- **Versionamento:** caso é arquivo Markdown no git. Mudanças relevantes (especialmente em "modelado" → "revela gap" ou vice-versa) viram commit com mensagem descritiva.
