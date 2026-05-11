# Caso 003 — Varanda dinâmica

> ✅ **Modelado em v3.** Caso de referência. Modo `VAO`. Seedado em [seed/003-varanda-dinamica.json](../seed/003-varanda-dinamica.json) com testes em [tests/engine/pipeline.test.ts](../tests/engine/pipeline.test.ts) (5 folhas, 3 folhas mínimo, range checks, conversão de unidade). Use como gabarito ao escrever os próximos.

---

## 1. Identificação

- **ID:** 003
- **Nome:** Varanda dinâmica
- **Categoria:** Varandas
- **Modo (v3):** VAO
- **Status:** ✅ modelado v3 + seed
- **Origem:** spec v2 (caso âncora; v3 manteve a estrutura adicionando `nivel` e `OPTION_LIST` em `CorVidro`)
- **Última revisão:** 2026-04-29 (atualização para v3)

---

## 2. Descrição

Varanda fechada com folhas de vidro lado a lado, ocupando todo o vão entre as paredes. O vidraceiro decide quantas folhas fazem sentido para o vão — varandas mais largas ganham mais folhas para que cada uma fique numa medida prática de transportar e manusear. As folhas das pontas encostam nas paredes laterais por meio de uma ferragem reforçada de canto, enquanto as folhas do meio deslizam ou fixam por trilho corrido.

É um produto comum em apartamentos com sacada, especialmente em prédios de 2 e 3 dormitórios. A vidraceira costuma sugerir entre 4 e 6 folhas para vãos típicos de 3 a 5 metros, mas precisa de flexibilidade tanto para baixo (varanda pequena de cozinha, 3 folhas) quanto para cima (varanda gourmet, 8 a 10 folhas).

---

## 3. Particularidades

- O número de folhas é definido pelo vidraceiro no momento do orçamento, não fixo no cadastro da tipologia.
- As folhas das pontas (cantos) têm largura levemente maior que as do meio para acomodar a ferragem de canto.
- Existe uma "espessura de canto" diferente da "espessura de perfil intermediário" — duas variáveis técnicas distintas.
- O preço total combina componentes que escalam diferente: vidro por área, ferragem por número de cantos (sempre 2), instalação com parcela fixa mais parcela proporcional ao número de folhas.
- A largura útil disponível para vidro é menor que o vão bruto, descontando 2× a espessura de canto e (Nfolhas-1)× a espessura de perfil intermediário.

---

## 4. Variáveis de entrada

| Código | Tipo | Label exibido | Faixa / default | Captura |
|---|---|---|---|---|
| Lvao | medida | Largura do vão | 2000–8000 mm | medida horizontal entre as paredes laterais, sem desconto |
| Avao | medida | Altura do vão | 1800–2800 mm | do piso ao limite superior, descontando o que for de obra |
| Nfolhas | contagem | Quantidade de folhas | 3–10, default 5 | quantas peças de vidro o vidraceiro quer usar para preencher o vão |
| Pperfil | parâmetro técnico | Espessura do perfil | default 50 mm | largura do perfil intermediário entre duas folhas adjacentes |
| Pcanto | parâmetro técnico | Espessura do canto | default 75 mm | largura do perfil de canto, mais robusto que o intermediário |

---

## 5. Composição esperada

A varanda tem um único grupo de peças — as folhas — e a quantidade desse grupo é dinâmica, vinda da variável `Nfolhas`. Dentro desse grupo, as peças se dividem em três papéis: canto esquerdo (a primeira), canto direito (a última) e centrais (todas as do meio). O critério que separa um papel do outro é puramente posicional: posição 1 é canto esquerdo, última posição é canto direito, qualquer posição entre 2 e Nfolhas-1 é central.

As folhas centrais usam uma fórmula simples — toda largura útil dividida pelo número de folhas. As de canto usam a mesma largura central, mas somam a espessura de canto, porque essa medida é absorvida pelo perfil de canto na hora da instalação. A altura é igual para todas as folhas, descontando uma folga fixa para o trilho.

A largura útil é uma variável derivada que aparece antes das fórmulas das folhas: vão bruto menos os dois cantos menos os perfis intermediários (que são `Nfolhas - 1`, porque há um perfil entre cada par de folhas adjacentes).

O preço é composto de três componentes. Vidro entra por metro quadrado da área total de cobrança, com preço variando por cor — esse é o componente mais relevante. Ferragem reforçada entra por peça com papel de canto — sempre duas peças, valor fixo cada. Instalação tem parcela fixa pelo serviço base mais um adicional por folha, que captura o tempo a mais que folhas extras pedem na montagem.

```
Variáveis de entrada: Lvao, Avao, Nfolhas, Pperfil, Pcanto

Valores derivados (escopo vão):
  Lutil  = Lvao - 2*Pcanto - (Nfolhas - 1)*Pperfil
  Lfolha = Lutil / Nfolhas
  Afolha = Avao - 100

Grupo: FOLHAS
  quantidade: Nfolhas
  Papel CANTO_ESQ: primeira peça (selector FIRST)
    largura: Lfolha + Pcanto
    altura:  Afolha
  Papel CENTRAL: peças do meio (selector EXCEPT_FIRST_LAST)
    largura: Lfolha
    altura:  Afolha
  Papel CANTO_DIR: última peça (selector LAST)
    largura: Lfolha + Pcanto
    altura:  Afolha

Regras de preço:
  VIDRO_M2:       por m² na tipologia       expressão: precoM2_cor(corVidro)
  FERRAGEM_CANTO: por peça nos cantos       expressão: 180,00
  INSTALACAO_VAO: por vão na tipologia      expressão: 350 + 80 * Nfolhas
```

---

## 6. Cálculos exemplo

| Cenário | Inputs | Peças geradas | Área de cobrança | Preço estimado |
|---|---|---|---|---|
| Típico | Lvao=4000, Avao=2200, Nfolhas=5 | 1 canto-esq + 3 centrais + 1 canto-dir | ~8,05 m² | ~R$ 3.364 (vidro incolor) |
| Mínimo | Lvao=2000, Avao=1800, Nfolhas=3 | 1 + 1 + 1 | ~3,57 m² | ~R$ 1.590 |
| Largo | Lvao=6000, Avao=2200, Nfolhas=7 | 1 + 5 + 1 | ~12,32 m² | ~R$ 4.760 |
| Extremo | Lvao=8000, Avao=2800, Nfolhas=10 | 1 + 8 + 1 | ~21,84 m² | ~R$ 7.500 |

Cálculo do cenário típico, para conferência:

- `Lutil = 4000 - 2×75 - 4×50 = 3650`
- `Lfolha = 3650 / 5 = 730`
- `Afolha = 2200 - 100 = 2100`
- Cantos: 805 × 2100 = 1,69 m² (real); arredondado 850 × 2100 = 1,79 m² (cobrança)
- Centrais: 730 × 2100 = 1,53 m²; arredondado 750 × 2100 = 1,58 m²
- Total cobrança ≈ 1,79 + 1,79 + 3 × 1,58 = 8,30 m² (a primeira tabela usou ~8,05; arredondamento do exemplo do mockup era ligeiramente diferente — diferença esperada conforme o cálculo exato de cada rounding step).

---

## 7. Notas e questões em aberto

- A ferragem reforçada de canto é uma constante (R$ 180,00). Faz sentido manter como literal, ou um dia ela vai variar por cor de alumínio / acabamento? Se variar, vira fórmula `precoFerragem_cor(corAluminio)` na mesma estrutura usada para vidro.
- Em vãos muito largos (acima de 6m) com poucas folhas (4 ou 5), cada folha fica desproporcional (1500mm+) e fora do que a indústria recomenda para temperado 8mm. Hoje não há checagem disso — depende do vidraceiro saber. Vale modelar como aviso (não bloqueio) baseado em `Lfolha > limite_recomendado_para_espessura`?
- O vão pode ter altura desigual (piso desnivelado, teto inclinado). Hoje o modelo assume `Avao` único; a vidraceira normalmente mede em dois pontos e usa a menor. Vale capturar essa convenção em texto de ajuda da variável.
- Existe a variante "varanda com biombo central fixo" — uma das folhas do meio é fixa, as outras deslizam. Não é o mesmo caso desse, mas compartilha 90% da composição. Caso futuro 005 ou 006.

---

## 8. Casos relacionados

- **Caso 002 — Porta com bandeira** (caso oposto: composição totalmente fixa, 2 folhas + 1 bandeira)
- **Caso 004 — Box frontal** (composição fixa de 2 peças, mas com papéis distintos: fixa e móvel)
- **Caso futuro — Varanda com biombo** (variação desse caso com 1 folha no meio sendo fixa)
