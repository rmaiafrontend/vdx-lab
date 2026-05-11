# Caso 007 — Guarda-corpo com peças heterogêneas e furações por torre

> ✅ **Modelado em v3.** Este caso motivou os Gaps 2 e 3 do INDEX (modo de entrada lista de peças + especificação técnica adicional), ambos fechados pela v3. A spec v3 introduziu `Tipologia.modoDeProducao=MEDIDA_DE_PRODUCAO` (vidraceiro informa peça por peça), `Variable.nivel=PECA` para variáveis específicas de cada peça, e a entidade `SpecificationTemplate` para descrever furações/recortes. Seedado em [seed/006-guarda-corpo.json](../seed/006-guarda-corpo.json) (a numeração diverge do catálogo por motivos históricos), com testes em [tests/engine/pipeline-medida.test.ts](../tests/engine/pipeline-medida.test.ts).
>
> Caso original que revelou o gap: o orçamento contém múltiplas peças com **medidas e furações próprias por peça**, não derivadas de um conjunto único de variáveis do vão. Quebra duas suposições implícitas no modelo v2 (uma tipologia gera peças a partir de um único conjunto de medidas; furação não é parte do domínio).

---

## 1. Identificação

- **ID:** 007 (catálogo) / `006-guarda-corpo.json` (seed)
- **Nome:** Guarda-corpo com peças heterogêneas e furações por torre
- **Categoria:** Guarda-corpos (categoria nova adicionada na v3, id=5)
- **Modo (v3):** MEDIDA_DE_PRODUCAO
- **Status:** ✅ modelado v3 + seed
- **Origem:** vidraceira (mensagem em 2026-04-28)
- **Última revisão:** 2026-04-29 (atualização para v3)

---

## 2. Descrição

Guarda-corpo é uma proteção em vidro, tipicamente em sacadas, escadas, mezaninos e bordas de laje. Diferente de produtos como varanda fechada ou box, o vidro do guarda-corpo não fica abraçado por um perfil em U contínuo nas bordas — ele é fixado por **torres** (suportes metálicos verticais), que prendem o vidro através de **furos** feitos no próprio vidro.

O vidraceiro orça quantas peças de guarda-corpo o cliente precisa para a obra. Em obras grandes — prédios, condomínios, comerciais — isso pode chegar facilmente a 30, 50 ou mais peças no mesmo orçamento. Cada peça tem medidas próprias, porque o guarda-corpo segue o contorno da obra (uma sacada em L tem peças de tamanhos diferentes, uma escada com lances tem peças que variam, varandas em prédio com plantas espelhadas têm peças simétricas mas não idênticas).

Para cada peça, o vidraceiro precisa descrever:

- **Largura e altura** da peça de vidro (a peça em si é retangular).
- **Quantidade de torres** que vão fixar essa peça.
- **Modelo da torre** — 20, 30 ou 40 (provavelmente referência ao código do produto da torre).
- **Quantos furos** cada torre usa para fixar o vidro (1, 2 ou 3 furos).
- **Distância dos furos à borda** do vidro (folga horizontal e vertical até onde o furo fica posicionado).
- **Distância entre torres** ao longo da peça.

A peça de vidro continua sendo retangular — a furação não muda o formato do vidro. Mas a especificação de furação é parte do que vai para a ficha de produção (onde o operador da máquina faz os furos antes da têmpera) e provavelmente entra no preço de alguma forma (vidro com mais furos custa mais para produzir).

O resultado é um orçamento que não se parece com nenhum dos modelados até agora. Em vez de "informe Lvao e Avao, eu calculo as peças", é "informe peça por peça, com medidas e furação de cada uma".

---

## 3. Particularidades

- **O orçamento contém múltiplas peças com medidas próprias por peça**, não um conjunto único de medidas que gera peças derivadas. Esse é o ponto que mais quebra o modelo atual.
- **Cada peça pode ter especificação de furação distinta** (número de torres, modelo de torre, quantos furos por torre, distâncias).
- **Volume típico é alto** — 20, 50, 100 peças por orçamento são comuns em obra grande. UX precisa suportar entrada em massa.
- **A peça de vidro permanece retangular** — furação não altera o formato do corte, mas altera a especificação técnica e provavelmente o preço.
- **Existem peças idênticas e peças quase-idênticas no mesmo orçamento.** Em prédios com plantas repetidas, várias peças têm exatamente as mesmas medidas. UX se beneficia de duplicar/multiplicar peças.
- **A torre é um produto do catálogo**, não um parâmetro técnico do guarda-corpo. Ela tem código próprio, preço próprio, e provavelmente restrições próprias (torre 20 talvez aceite só 1 furo, torre 40 aceita até 3).
- **A furação tem implicação ABNT.** Vidro temperado tem regras sobre número, distância e posição mínima de furos em relação às bordas. Validação não-trivial.

---

## 4. Variáveis de entrada

Esse é o primeiro caso onde a estrutura "uma tabela de variáveis para o vão inteiro" não funciona. Sugiro modelar em dois níveis:

**Nível do orçamento (o que vale para todas as peças):**

| Código | Tipo | Label exibido | Faixa / default | Captura |
|---|---|---|---|---|
| Espessura | parâmetro técnico ou lista de opções | Espessura do vidro | a definir (8, 10, 12 mm comuns) | usada em todas as peças do orçamento; afeta validação ABNT da furação |
| TipoVidro | lista de opções | Tipo do vidro | temperado / laminado | quase sempre temperado em guarda-corpo |
| CorVidro | lista de opções | Cor do vidro | incolor / fumê / etc. | igual aos outros casos |

**Nível da peça (uma linha por peça do orçamento):**

| Código | Tipo | Label exibido | Faixa / default | Captura |
|---|---|---|---|---|
| Largura | medida | Largura | a definir | largura do vidro retangular dessa peça |
| Altura | medida | Altura | a definir | altura do vidro retangular dessa peça |
| Quantidade | contagem | Quantidade desta peça | default 1 | quantas cópias idênticas dessa especificação (atalho para peças repetidas) |
| ModeloTorre | lista de opções | Modelo da torre | 20 / 30 / 40 | qual produto-torre fixa o vidro nessa peça |
| QtdTorres | contagem | Número de torres | default 2 | quantas torres ao longo da peça |
| FurosPorTorre | contagem ou lista | Furos por torre | 1 / 2 / 3 | quantos furos cada torre exige |
| DistBorda | medida | Distância dos furos à borda | default a definir | folga horizontal/vertical até a posição dos furos |
| DistEntreTorres | medida | Distância entre torres | calculado ou informado | espaçamento horizontal das torres ao longo da peça |

A coluna `DistEntreTorres` pode ser informada pelo vidraceiro **ou** calculada automaticamente como `Largura / (QtdTorres + 1)` para torres equidistantes. Decisão a tomar.

---

## 5. Composição esperada

Esse caso não cabe diretamente no modelo v2 atual. Não é só um detalhe — são duas suposições que precisam mudar.

**Primeira suposição quebrada: "uma tipologia + um conjunto de variáveis = um conjunto de peças derivadas".**

No modelo v2, o vidraceiro informa um vão (Lvao, Avao, etc.) e o motor expande N peças aplicando fórmulas. Em guarda-corpo, não há "vão" único — há **N peças diretamente informadas**, cada uma com suas medidas. O vidraceiro está digitando peças, não medidas que viram peças.

Isso pode ser modelado de algumas formas:

- **Múltiplos "vãos" no mesmo orçamento.** O orçamento vira uma lista, cada item é um vão da tipologia guarda-corpo com suas próprias medidas. Mas isso é meio forçado, porque "vão" semanticamente sugere espaço da obra, e aqui cada peça é uma peça de vidro avulsa, não um vão.
- **Tipologia com modo de entrada "lista de peças".** A própria tipologia, no cadastro, declararia que ela é tipo "tabela" em vez de "vão". O wizard renderizaria uma tabela editável em vez de uma planilha de variáveis. Internamente, cada linha vira uma peça expandida sem passar pelo expansor de grupo/papel.
- **Conceito novo: "orçamento bulk".** Um tipo de orçamento que tem uma lista de peças explícitas, não derivadas. Tipologia ainda existe (define o produto, espessuras válidas, restrições), mas não é a unidade de "vão+medidas".

A terceira opção parece a mais limpa, mas é a mais cara em termos de impacto. As três precisam ser pensadas em conjunto com outros casos similares — se aparecerem outros produtos com a mesma característica (orçar peças avulsas em massa), o investimento se justifica.

**Segunda suposição quebrada: "furação não é parte do domínio do orçamento".**

No modelo v2 atual, a `PieceRole` define largura e altura. Não há vocabulário para "essa peça precisa de 6 furos posicionados assim". O modelo trata a peça como retângulo puro.

Em guarda-corpo, a furação:

- Faz parte da ficha de produção (precisa ser registrada, transmitida, reproduzida).
- Provavelmente afeta o preço (cada furo tem custo de máquina).
- Tem implicações ABNT (mínimo de borda, distância entre furos).
- Provavelmente afeta a validação ("modelo de torre 20 aceita só 1 furo, então `FurosPorTorre=3` com `ModeloTorre=20` é inválido").

A furação parece ser um conceito novo no domínio: não é variável de entrada (tem estrutura rica, não é só um número), não é peça (a peça é o vidro, a furação é especificação dela), não é regra de preço (mas afeta preço).

Sugestão de caminho: criar uma entidade `PieceSpecification` (especificação adicional de uma peça) que carrega informação estruturada (furações, recortes, chanfros, polimentos especiais) ligada a uma peça concreta. O motor de cálculo continua produzindo peças retangulares; o motor de preço e a ficha de produção consomem a `PieceSpecification` para calcular custo adicional e gerar instruções.

```
Esquema mínimo, dependendo das decisões em aberto:

Tipologia GUARDA_CORPO
  modoDeEntrada: LISTA_DE_PECAS
  variaveisDoOrcamento: Espessura, TipoVidro, CorVidro
  variaveisDaPeca: Largura, Altura, Quantidade, ModeloTorre, QtdTorres, FurosPorTorre, DistBorda, DistEntreTorres
  
  (sem PieceGroup, sem PieceRole, sem fórmula —
   cada peça vem direto da entrada do vidraceiro)

  PricingRule:
    VIDRO_M2:       por m² na tipologia, expressão precoM2_cor(corVidro)
    FURO:           por furo na peça,    expressão custoFuroBase + custoFuroEspessura(Espessura)
    TORRE:          por torre na peça,   expressão precoTorre(ModeloTorre)
    INSTALACAO:     por orçamento,       expressão a definir (provavelmente fixo + por peça)

  Validação ABNT no save da peça:
    distBorda >= mínimo_para_espessura(Espessura)
    furosPorTorre permitido_no_modelo(ModeloTorre)
```

---

## 6. Cálculos exemplo

Deixados em aberto até confirmarmos as fórmulas com a vidraceira. Estrutura provável:

| Cenário | Inputs | Resultado |
|---|---|---|
| Sacada simples | 4 peças idênticas: 1500×1100, torre 30, 2 torres por peça, 2 furos cada, distBorda=80 | 4 peças × área cobrança + 16 torres + 32 furos + instalação |
| Obra grande | 28 peças variadas (de 800×1100 até 2400×1100), todas torre 30, 2 furos | total proporcional ao número/tamanho de peças |
| Mistura de modelos | 12 peças torre 20 + 6 peças torre 40 | mistura de preços de torre, validação por modelo |

---

## 7. Notas e questões em aberto

Várias dessas perguntas precisam de resposta da vidraceira antes do caso fechar. Marquei as mais críticas.

**Sobre a entrada (UX e modelo):**

- **[crítica]** Como a vidraceira hoje informa as peças do guarda-corpo no orçamento? Uma a uma? Tabela colada de planilha? Só uma quantidade total e o sistema replica? A resposta orienta a escolha entre as três formas de modelar (lista de peças avulsas, tipologia em modo tabela, orçamento bulk).
- O vidraceiro precisa orçar antes de visitar a obra (com medidas estimadas) ou só vai medir uma vez? Isso afeta se há etapa de "estimativa" antes da peça-a-peça.
- Quando há peças idênticas em quantidade (12 peças de 1200×1100), a vidraceira gosta de digitar uma vez e marcar "12 cópias", ou prefere ver 12 linhas explícitas?

**Sobre a torre:**

- **[crítica]** "Torre 20, 30, 40" é a largura da torre em mm, ou é o código do produto (modelos comerciais de torre)? Provavelmente é código de produto. Se for, a torre é um produto do catálogo e tem `Produto`/`ProdutoVariacao` própria.
- Cada modelo de torre aceita uma faixa específica de configurações de furação? Por exemplo, torre 20 aceita só 1 furo, torre 30 aceita 1 ou 2, torre 40 aceita até 3?
- A torre tem espessura/altura mínima de vidro recomendada? (Provavelmente sim — torre 20 não suporta vidro 12mm, etc.)

**Sobre a furação:**

- **[crítica]** A furação afeta o preço? Se afeta, como? Por furo individual? Por número total de furos no orçamento? Há diferença de preço por espessura do vidro (furar vidro 12 é mais caro que furar vidro 8)?
- A vidraceira informa a posição exata dos furos (X e Y a partir da borda), ou só "distância da borda" e o sistema infere posição uniformemente?
- Há restrição ABNT específica para guarda-corpo? Distância mínima do furo à borda em vidro temperado? Decisão sobre validar agora ou deixar a critério do vidraceiro.

**Sobre o orçamento como um todo:**

- O guarda-corpo costuma vir junto de outros produtos (varanda + guarda-corpo) ou é orçamento dedicado? Afeta se a tela do orçamento precisa misturar tipologias diferentes ou cada uma roda separada.
- Há frete/transporte como item separado para obra grande?

---

## 8. Casos relacionados

- **Caso futuro — Vidro recortado para puxador / fechadura.** Provavelmente compartilha o mesmo conceito de "especificação adicional da peça" (chanfro, recorte) sem mudar o cálculo da medida.
- **Caso futuro — Espelho com furação para suporte.** Mesma estrutura: peça retangular + furação especificada.
- **Casos anteriores (003, 005)** — não compartilham a estrutura "lista de peças avulsas". Os casos anteriores derivam peças de medidas de vão; este informa peças diretamente.

---

## Apêndice — Gaps revelados por este caso

Este caso revela dois gaps significativos. Registro aqui para o `INDEX.md` agregar.

> **Gap proposto — Modos de entrada da tipologia.** Casos #007 (e provavelmente outros casos de produtos orçados em massa).
>
> O modelo v2 assume que toda tipologia tem o mesmo modo de entrada: vidraceiro informa medidas do vão, motor deriva peças. Esse caso pede um modo alternativo: vidraceiro informa lista de peças com medidas próprias por peça.
>
> Caminhos possíveis:
> 1. Tipologia ganha um campo `modoDeEntrada` (VAO | LISTA_DE_PECAS) que muda como o wizard renderiza e como o motor processa.
> 2. Conceito novo de "orçamento bulk" separado de tipologia.
> 3. Aceitar que algumas tipologias fogem do modelo v2 e tratar guarda-corpo como excessão (não recomendo, fere o princípio "configuração sem código").
>
> A decisão depende de quantos outros casos pedem esse modo. Se for só guarda-corpo, opção 1 é leve. Se aparecerem outros (espelhos avulsos, recortes diversos), opção 2 vale a pena.

> **Gap proposto — Especificação técnica adicional da peça (furação, recortes, etc.).** Caso #007, e provavelmente futuros casos de produtos beneficiados.
>
> O modelo v2 trata a peça como retângulo puro: largura, altura, área. Não há vocabulário para descrever furação, chanfro, recorte, polimento de borda especial. Esses elementos:
> - Fazem parte da ficha de produção.
> - Provavelmente afetam o preço.
> - Têm implicação ABNT (especialmente furação em temperado).
> - Não mudam o formato do corte da peça.
>
> Sugestão estrutural: entidade `PieceSpecification` ligada à peça, com tipo (`FURO`, `RECORTE`, `CHANFRO`, etc.) e atributos próprios por tipo (em JSON ou em sub-tabelas dedicadas). O motor de preço consome essa lista; a ficha de produção também. Decisão de modelagem fica para depois de mais casos confirmarem o padrão.
