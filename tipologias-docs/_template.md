# Caso XXX — [Nome do caso]

> Gabarito para documentar um caso de tipologia. Substitua os blocos entre colchetes pelo conteúdo real e remova as instruções em itálico antes de comitar.

---

## 1. Identificação

- **ID:** XXX
- **Nome:** [Nome curto e descritivo, como a vidraceira chamaria]
- **Categoria:** [Portas / Janelas / Varandas / Boxes / Outros]
- **Status:** [não modelado | modelado | parcialmente coberto | revela gap]
- **Origem:** [vidraceira / inventário próprio / spec original / pedido de cliente]
- **Última revisão:** [data ou commit]

*Status guia a leitura do INDEX. Use "revela gap" quando o caso não couber no modelo atual sem ajuste.*

---

## 2. Descrição

[Como a vidraceira descreveria esse produto para um cliente. Linguagem natural, sem jargão do modelo. 3 a 8 linhas. Imagem ou desenho esquemático ajuda — se houver, referenciar aqui.]

[Se possível, incluir uma frase sobre quando esse produto aparece no dia a dia: "comum em apartamentos de 2 dormitórios", "usado em sacadas voltadas para o sul", etc. Contexto vale ouro daqui a 6 meses.]

---

## 3. Particularidades

[Lista do que torna esse caso diferente de uma porta retangular trivial. Cada item em uma linha, direto e específico. Foque no que **importa para o modelo**, não em estética.]

- [particularidade 1]
- [particularidade 2]
- [particularidade 3]

*Exemplos de particularidades: "número de folhas é dinâmico", "peças laterais usam fórmula diferente das centrais", "preço varia por espessura, não só por cor", "a cor do alumínio é decisão à parte do vidro", "tem regra ABNT que muda fórmula com base na altura".*

---

## 4. Variáveis de entrada

[Tabela com as variáveis que o vidraceiro vai informar. A coluna "captura" é a mais importante — ela explica o sentido da variável no mundo real, não o tipo no modelo.]

| Código | Tipo | Label exibido | Faixa / default | Captura |
|---|---|---|---|---|
| Lvao | medida | Largura do vão | 2000–8000 mm | medida horizontal entre as paredes |
| Avao | medida | Altura do vão | 1800–2800 mm | do piso ao teto, descontado o forro |
| ... | ... | ... | ... | ... |

*Tipo: medida, contagem, parâmetro técnico, sim/não. Não use os nomes do modelo (`DIMENSION`, `COUNT`) aqui — o catálogo é PT-BR puro.*

---

## 5. Composição esperada

[Descrição em prosa de como esse caso seria modelado. Comece falando dos grupos: quantos são, o que cada um representa, como se relacionam. Depois fale dos papéis dentro de cada grupo.]

[Se o caso tem peças que se comportam diferente (canto vs centro, fixa vs móvel), descreva o critério que separa uma da outra. Não precisa escrever a fórmula exata — basta indicar a ideia: "as peças de canto ficam um pouco mais largas para acomodar a ferragem reforçada".]

[Se o caso revela um gap (status = "revela gap"), descreva aqui **o que precisaria existir no modelo** para cobrir esse caso. Pode ser: "uma forma de peças do mesmo grupo se referenciarem entre si", "regra ABNT que entra antes do cálculo de fórmula", "preço com faixas de área".]

[Pseudocódigo é opcional e vai no fim do bloco, depois da prosa, em bloco de código. Use só se ajudar a clarear.]

```
Pseudocódigo opcional (omitir se a prosa já basta):

Grupo: FOLHAS
  quantidade: Nfolhas
  Papel CANTO_ESQ: primeira peça
  Papel CENTRAL: peças do meio
  Papel CANTO_DIR: última peça
```

---

## 6. Cálculos exemplo

[Pelo menos 3 linhas: caso típico, caso mínimo, caso extremo. Inputs e o que se espera de output. Use unidades em mm e m².]

| Cenário | Inputs | Peças geradas | Área de cobrança | Preço estimado |
|---|---|---|---|---|
| Típico | Lvao=4000, Avao=2200, Nfolhas=5 | 1 canto-esq, 3 centrais, 1 canto-dir | ~8,05 m² | R$ 3.364,00 |
| Mínimo | Lvao=2000, Avao=1800, Nfolhas=3 | 1 + 1 + 1 | ~3,60 m² | R$ — |
| Extremo | Lvao=8000, Avao=2800, Nfolhas=10 | 1 + 8 + 1 | ~22,40 m² | R$ — |

*Esses cenários viram diretamente casos de teste em `tests/engine/` quando o caso for modelado.*

---

## 7. Notas e questões em aberto

[Tudo o que você pensou e ainda não decidiu. Não precisa responder; precisa registrar para não perder.]

- [pergunta 1]
- [pergunta 2]
- [pergunta 3]

*Exemplos: "Faz sentido cobrar mais pelo canto, ou a ferragem reforçada já está embutida no perfil?", "E se o vão for em formato L, isso vira 2 vãos ou 1?", "A vidraceira sabe a espessura ou ela é decidida pelo cálculo ABNT?".*

---

## 8. Casos relacionados

[Links para casos que compartilham particularidades, ou que podem ser confundidos com este. Ajuda a navegar o catálogo.]

- [Caso 003 — Varanda dinâmica] (compartilha "número de folhas é dinâmico")
- [Caso 008 — Janela maxim-ar] (caso oposto: número fixo de peças)
