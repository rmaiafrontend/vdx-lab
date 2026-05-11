# Caso 006 — Janela quatro folhas (2 fixas + 2 corrediças)

---

## 1. Identificação

- **ID:** 006
- **Nome:** Janela quatro folhas (2 fixas + 2 corrediças)
- **Categoria:** Janelas
- **Status:** modelado
- **Origem:** inventário próprio (tipologia 45 do sistema)
- **Última revisão:** 2026-04-28

---

## 2. Descrição

Janela de quatro folhas dispostas lado a lado, com as duas folhas das pontas fixas e as duas folhas centrais corrediças que deslizam à frente das fixas. Quando abertas, as corrediças se sobrepõem aos fixos correspondentes, deixando o miolo do vão livre para ventilação. Quando fechadas, encontram-se ao centro num bate-fecha vidro-vidro.

É uma tipologia comum em quartos e salas onde o cliente quer abertura central ampla sem que toda a largura do vão se abra. A vidraceira costuma cotar para vãos entre 1,5 e 3 metros de largura — abaixo disso vira uma janela de duas folhas (uma fixa + uma corrediça); acima disso aparecem variantes de seis folhas.

---

## 3. Particularidades

- Composição totalmente fixa: sempre 4 peças, sem variável de quantidade. Caso oposto à varanda dinâmica.
- Papéis distintos no mesmo grupo: fixos e corrediças têm fórmulas diferentes tanto na largura quanto na altura.
- As corrediças têm largura maior que `LV/4` (acrescentam 50 mm) para sobrepor a fixa adjacente quando fechadas — sem essa sobreposição ficaria fresta entre folhas.
- Fixos e corrediças têm alturas distintas (`AV-55` vs `AV-23`), refletindo trilhos diferentes em planos distintos.
- A variável `ABF` (altura do bate-fecha) é declarada como entrada obrigatória, mas não aparece nas fórmulas de nenhuma das 4 peças de vidro — sinaliza uso em outro escopo (acessório, validação, ou peça/perfil ainda não modelado).
- Acessórios são papel-específicos: roldanas só vão nas duas corrediças; o bate-fecha vidro-vidro é peça única que vive no encontro entre as duas corrediças.
- Vidro tem múltiplas espessuras possíveis (6mm e 8mm, todos temperados), com preço por m² variando tanto por cor quanto por espessura.

---

## 4. Variáveis de entrada

| Código | Tipo | Label exibido | Faixa / default | Captura |
|---|---|---|---|---|
| LV | medida | Largura do vão | 1500–3500 mm | medida horizontal entre as paredes laterais |
| AV | medida | Altura do vão | 1000–2400 mm | do peitoril ao limite superior do vão |
| ABF | medida | Altura do bate-fecha | a confirmar | altura da travessa de bate-fecha entre as corrediças — provavelmente consumida pelo acessório, não pelas peças de vidro |

*Captura de `ABF` está em aberto — ver seção 7.*

---

## 5. Composição esperada

A janela tem um único grupo de peças — as folhas — com quantidade fixa em 4. Dentro do grupo, há dois papéis: **fixo** (posições 1 e 4) e **corrediça** (posições 2 e 3). O critério é puramente posicional: os extremos são fixos; o miolo é corrediço.

As duas folhas fixas são iguais entre si, e as duas corrediças são iguais entre si — o modelo não precisa distinguir "fixo esquerdo" de "fixo direito" no sentido da fórmula. A nomeação "esquerdo / direito" do cadastro é só orientação para o vidraceiro na hora do recorte e da etiqueta.

A largura do fixo é `LV/4` — divisão direta do vão em quatro partes iguais. A largura da corrediça é `(LV/4) + 50`; o adicional de 50 mm é a sobreposição que cobre a fresta com o fixo adjacente quando a janela está fechada.

A altura do fixo é `AV - 55` e a da corrediça é `AV - 23`. As folgas diferentes refletem o fato de que cada papel corre num trilho próprio com folga vertical distinta — o fixo é assentado entre travessas inferior e superior, enquanto a corrediça pendura num trilho superior e tem folga menor abaixo.

O preço é composto de três componentes. Vidro entra por m² da área total das 4 peças, com preço variando por cor e espessura escolhidas — é o componente mais relevante. Roldanas entram por peça com papel `CORREDICA`, multiplicadas pela quantidade convencional por folha (tipicamente 2). Bate-fecha vidro-vidro entra como peça única na tipologia, valor fixo.

```
Variáveis de entrada: LV, AV, ABF

Grupo: FOLHAS
  quantidade: 4 (fixa)
  Papel FIXO: posições 1 e 4 (selector FIRST + LAST, ou EQUALS [1, 4])
    largura: LV / 4
    altura:  AV - 55
  Papel CORREDICA: posições 2 e 3 (selector EXCEPT_FIRST_LAST)
    largura: (LV / 4) + 50
    altura:  AV - 23

Regras de preço:
  VIDRO_M2:       por m² na tipologia               expressão: precoM2_cor_espessura(corVidro, espVidro)
  ROLDANA:        por peça com papel CORREDICA      expressão: precoUn_modelo(modeloRoldana) * roldanasPorFolha
  BATE_FECHA_VV:  por vão na tipologia              expressão: 20,70 (literal por enquanto)
```

---

## 6. Cálculos exemplo

| Cenário | Inputs | Peças geradas | Área de cobrança | Observação |
|---|---|---|---|---|
| Típico | LV=2000, AV=1200 | 2 fixos (500×1145) + 2 corrediças (550×1177) | ~2,44 m² | janela de quarto padrão |
| Mínimo | LV=1500, AV=1000 | 2 fixos (375×945) + 2 corrediças (425×977) | ~1,54 m² | menor cabível |
| Largo | LV=3000, AV=1400 | 2 fixos (750×1345) + 2 corrediças (800×1377) | ~4,22 m² | sala ampla |
| Extremo | LV=3500, AV=2400 | 2 fixos (875×2345) + 2 corrediças (925×2377) | ~8,50 m² | conferir se folha cabe na espessura escolhida |

Cálculo do cenário típico, sem arredondamento de cobrança:

- Fixo: largura = 2000/4 = 500 mm; altura = 1200 − 55 = 1145 mm; área = 500 × 1145 ≈ 0,5725 m²
- Corrediça: largura = 500 + 50 = 550 mm; altura = 1200 − 23 = 1177 mm; área ≈ 0,6474 m²
- Total = 2 × 0,5725 + 2 × 0,6474 ≈ 2,44 m²
- Vidro incolor 6MM (R$ 130/m²): 2,44 × 130 ≈ R$ 317,20
- Roldanas com regulagem (R$ 3,00 × 4 un, assumindo 2 por corrediça): R$ 12,00
- Bate-fecha vidro-vidro: R$ 20,70
- Subtotal materiais ≈ R$ 349,90 (sem instalação, sem perfil de alumínio, sem mão de obra)

---

## 7. Notas e questões em aberto

- A variável `ABF` (altura do bate-fecha) é obrigatória no cadastro mas não consta nas fórmulas das 4 peças. Onde é consumida? Hipóteses: (a) define a altura do acessório bate-fecha vidro-vidro; (b) é usada em validação ABNT relacionando altura útil e altura do bate-fecha; (c) está reservada para uma peça/perfil extra ainda não modelado. Revisitar com a vidraceira antes de migrar para v2 — pode revelar gap "variável de input não consumida por nenhuma fórmula visível".
- O "+50" na largura das corrediças é a sobreposição com o fixo. Constante ou variável conforme espessura do perfil / ferragem? Se variar, deveria ser parâmetro técnico nomeado (ex.: `Psobreposicao`, default 50 mm) em vez de literal embutido.
- Os "-55" e "-23" das alturas são folgas de instalação. Mesma pergunta: constantes ou parâmetros? A spec v2 prefere parâmetros nomeados quando há chance de variar entre obras.
- O cadastro-fonte tem inconsistências de espaçamento nas fórmulas (`LV /4`, `(LV/4 )+50`) — ruído de digitação sem efeito no cálculo. Limpar na migração.
- Não há informação no cadastro sobre **quantas** roldanas vão por corrediça. Convenção comum é 2 por folha (uma em cada extremidade). Fixar isso explicitamente no modelo, ou tratar como input do vidraceiro?
- Vidro disponível em 6mm e 8mm temperados. Há regra ABNT que torna 8mm obrigatório acima de certa altura ou área? Se houver, é particularidade "regra ABNT condicional" e precisa virar comportamento do modelo, não só conhecimento tácito da vidraceira.
- Os fixos não recebem ferragem (só vidro encaixado no perfil). Confirmar que não há nenhum acessório por peça com papel `FIXO` — caso contrário, a regra de preço por papel precisa cobrir os dois papéis, não só a corrediça.

---

## 8. Casos relacionados

- **Caso 003 — Varanda dinâmica** (caso oposto na composição: dinâmica vs fixa; ambos compartilham "papéis distintos no mesmo grupo" e "preço por papel" via acessórios)
- **Caso 002 — Porta com bandeira** (a documentar; também tem composição fixa com papéis distintos, mas provavelmente com múltiplos grupos)
- **Caso futuro — Janela duas folhas (1 fixa + 1 corrediça)** (versão reduzida desta, mesmo padrão de papéis com quantidade 2)
- **Caso futuro — Janela seis folhas** (variação com mais corrediças, mantendo o esquema fixo-corrediça-...-corrediça-fixo)
