# Caso 005 — Porta de giro com fixo (com forma de instalação variável)

> ✅ **Modelado em v3.** Este caso motivou o `PieceRole.condition` (Gap 1 do INDEX). A solução escolhida foi a opção 2 das três cogitadas originalmente — múltiplos `PieceRole` com `condition` filtrando qual aplica — e está seedada em [seed/005-porta-com-fixo.json](../seed/005-porta-com-fixo.json), com testes em [tests/engine/pipeline.test.ts](../tests/engine/pipeline.test.ts) cobrindo as duas variantes.
>
> Caso original que revelou o gap: a forma de instalação do fixo afeta a fórmula de cálculo da peça. Não é uma diferença de topologia (continua sendo "porta + fixo"), mas uma diferença de **regra de cálculo** que depende de uma escolha do vidraceiro. O mesmo padrão aparece em outras tipologias (porta com bandeira, etc.).

---

## 1. Identificação

- **ID:** 005
- **Nome:** Porta de giro com fixo
- **Categoria:** Portas
- **Modo (v3):** VAO
- **Status:** ✅ modelado v3 + seed
- **Origem:** vidraceira (áudio em 2026-04-28)
- **Última revisão:** 2026-04-29 (atualização para v3)

---

## 2. Descrição

Porta de uma folha que abre por giro (dobradiças ou pivô) acompanhada de uma peça fixa do lado, ocupando juntas a largura total do vão. A porta abre, o fixo fica imóvel — comum em entradas de ambientes onde o vão é mais largo do que uma porta sozinha resolveria, mas não tão largo a ponto de pedir duas folhas que abrem.

O ponto particular desse produto é como o fixo é instalado. Existem duas formas, e o vidraceiro decide na hora do orçamento qual vai usar. As duas têm a mesma aparência final para o cliente, mas pedem fórmulas de desconto diferentes na medida da peça de vidro:

- **Fixo instalado no U** — o fixo entra dentro de um perfil em formato de U preso à estrutura (parede, teto e piso). O U abraça as bordas do vidro com folga.
- **Fixo instalado na ferragem** — o fixo é segurado por ferragens pontuais (agarradores ou articuladores), sem perfil contínuo. O que ocupa espaço é só a ferragem em si.

A diferença geométrica é real: o U exige folga de encaixe em cada borda que ele abraça, enquanto a ferragem exige folga só nos pontos onde fica fixada. Isso muda a largura e a altura da peça de vidro a ser cortada — não é só uma questão de preço, é uma questão de medida da peça.

O mesmo padrão aparece em outras tipologias. A vidraceira citou explicitamente o caso da **porta com bandeira em cima**: se a bandeira é instalada no U, a fórmula de desconto é uma; se é instalada na ferragem, é outra. Provavelmente a mesma lógica se aplica a vários produtos com peças fixas.

---

## 3. Particularidades

- A forma de instalação do fixo (U ou ferragem) é uma **escolha do vidraceiro no momento do orçamento**, não uma característica fixa da tipologia no cadastro.
- A fórmula que calcula a largura/altura da peça de vidro **muda em função dessa escolha** — não é só o preço que muda, é a medida do corte.
- A topologia do produto não muda: continua sendo "porta + fixo" em qualquer cenário. O número de peças e os papéis são os mesmos.
- O mesmo gatilho aparece em outras tipologias (porta com bandeira em cima, e provavelmente outras com peças fixas) — sugere que a solução vale modelar como capacidade geral do sistema, não como caso particular.
- A fórmula da porta (peça de giro) provavelmente não muda com essa escolha — só a fórmula da peça fixa é afetada. Mas vale confirmar com a vidraceira.

---

## 4. Variáveis de entrada

| Código | Tipo | Label exibido | Faixa / default | Captura |
|---|---|---|---|---|
| Lvao | medida | Largura do vão | a definir | medida horizontal entre as paredes laterais |
| Avao | medida | Altura do vão | a definir | do piso ao limite superior |
| Lporta | medida | Largura desejada da porta | default a definir | quanto da largura total fica para a folha de giro; o fixo ocupa o restante |
| TipoInstalacaoFixo | sim/não ou lista de opções | Forma de instalação do fixo | U / ferragem | define qual fórmula de desconto se aplica ao fixo |
| ... | ... | ... | ... | parâmetros técnicos de folga, espessura de perfil, espessura da ferragem — a confirmar com a vidraceira |

*A variável `TipoInstalacaoFixo` é o gatilho condicional. No modelo atual ela seria um `BOOLEAN` (U=true / ferragem=false), mas pode haver mais opções no futuro — então uma lista de opções pré-definidas seria mais limpa. Esse é um sub-gap discutido na seção de notas.*

---

## 5. Composição esperada

A porta de giro com fixo tem dois grupos de peças, cada um com uma única peça e papel único: o grupo `PORTA` tem a folha de giro, e o grupo `FIXO` tem a peça fixa. Ambos têm `quantity = 1`. O critério que separa os papéis é trivial — só há um por grupo.

A complicação está na fórmula da peça do grupo `FIXO`. Hoje, no modelo v2, uma `PieceRole` declara uma fórmula única de largura e uma única de altura. Para esse caso, a fórmula precisaria escolher entre duas variantes em runtime, baseada no valor da variável `TipoInstalacaoFixo`. Não é apenas escolher entre dois números — são duas fórmulas matematicamente diferentes, com possivelmente parâmetros distintos (espessura do U vs. espessura da ferragem).

Em uma linguagem ideal, a fórmula seria algo como:

```
largura_fixo = (Lvao - Lporta) - (TipoInstalacaoFixo == "U" ? 2*Pu : 2*Pferragem)
```

Isso parece resolvível com a função `if` do avaliador (`mathjs` cobre via ternário ou `if(cond, a, b)`). Mas há um problema mais profundo: à medida que mais condições se acumulam (3, 4, 5 formas de instalação, mais combinações), uma fórmula com vários ternários aninhados vira ilegível e impossível de validar visualmente no admin. O vidraceiro nunca vai escrever isso à mão; o admin que cadastra a tipologia também vai sofrer.

A composição **esperada** desse caso, portanto, depende de uma decisão de modelagem que ainda não foi tomada. Há três caminhos possíveis, listados no gap consolidado abaixo. A documentação aqui fica intencionalmente em aberto até essa decisão acontecer.

```
Esquema mínimo, independente de qual caminho escolhermos:

Variáveis de entrada: Lvao, Avao, Lporta, TipoInstalacaoFixo (+ parâmetros técnicos)

Grupo PORTA, qtd=1
  Papel UNICO: largura = Lporta - folga_giro, altura = Avao - folga_topo_piso
              (fórmula provavelmente fixa, não afetada pela instalação do fixo)

Grupo FIXO, qtd=1
  Papel UNICO: largura = depende de TipoInstalacaoFixo
              altura  = depende de TipoInstalacaoFixo
              (esse é o ponto que o modelo atual não cobre bem)
```

---

## 6. Cálculos exemplo

Deixados em aberto. Para preencher esta tabela com confiança precisamos das fórmulas exatas das duas variantes (U e ferragem), o que depende de uma conversa específica com a vidraceira sobre os valores de folga.

| Cenário | Inputs | Peças geradas | Área de cobrança | Preço |
|---|---|---|---|---|
| Típico, instalação no U | Lvao=2000, Avao=2200, Lporta=900, TipoInstalacao="U" | 1 porta + 1 fixo | a calcular | a calcular |
| Típico, instalação na ferragem | Lvao=2000, Avao=2200, Lporta=900, TipoInstalacao="ferragem" | 1 porta + 1 fixo | a calcular | a calcular |
| Mesmo cenário, comparar | mesmos inputs, só varia TipoInstalacao | a porta sai igual; o fixo sai diferente | comparar Δ | comparar Δ |

*Quando preenchermos esses cálculos, eles viram diretamente um teste de regressão valioso: dado o mesmo vão, a porta deve sair idêntica nos dois cenários, e só o fixo muda. Confirma a hipótese de que a escolha de instalação afeta apenas o fixo.*

---

## 7. Notas e questões em aberto

- **Quais são exatamente as fórmulas de desconto para U vs ferragem?** Precisa de conversa específica com a vidraceira para listar os parâmetros (folga U, folga ferragem, espessura do perfil, etc.). Sem isso o caso não fica modelável.
- **A escolha afeta só o fixo, ou também a porta?** Provavelmente só o fixo, mas vale confirmar — pode haver alguma folga de encontro entre a porta e o fixo que mude também.
- **O preço também muda em função da forma de instalação?** É plausível: o U é um perfil contínuo, custa mais material; a ferragem é pontual mas usa peças individuais que podem ser caras. Possivelmente os dois custos batem, mas vale confirmar.
- **Há mais de duas formas de instalação?** Hoje a vidraceira citou duas (U e ferragem). Em outros tipos de produto pode haver mais (ex.: ferragem articulada, ferragem agarrador, U com fechamento). O modelo precisa suportar `n` opções, não só duas — daí a tendência a usar lista de opções em vez de booleano.
- **Esse padrão se aplica a quais outras tipologias além de porta-com-fixo e porta-com-bandeira?** Provavelmente a qualquer produto com peças fixas: varandas com fixo lateral, janelas com fixo superior, boxes com peça fixa. Se for confirmado em massa, a solução vale a pena ser estrutural, não pontual.
- **Em que momento do wizard o vidraceiro escolhe?** Antes ou depois de informar as medidas? Se antes, a pré-visualização já pode mostrar a peça correta. Se depois, há recálculo. Essa decisão de UX está atrelada à decisão de modelagem.

---

## 8. Casos relacionados

- **Caso 002 — Porta com bandeira** (compartilha o mesmo gatilho: forma de instalação da bandeira muda a fórmula)
- **Caso 001 — Porta pivotante simples** (caso oposto: porta sozinha, sem fixo, sem o problema de instalação variável)
- **Casos futuros** — Janela com fixo superior, varanda com fixo lateral, box com peça fixa lateral. Provavelmente mesmo gatilho.

---

## Apêndice — Gap revelado por este caso

Este caso revela um gap que provavelmente afeta vários outros. Registro aqui para o `INDEX.md` agregar quando atualizado.

> **Gap proposto — Fórmulas variantes por escolha de instalação.** Casos #005, #002 (provável), e potencialmente outros casos de produtos com peças fixas.
>
> O modelo atual permite uma fórmula única de largura/altura por `PieceRole`. Quando a fórmula precisa variar conforme uma escolha do vidraceiro (forma de instalação, no caso), há três caminhos possíveis:
>
> 1. **Ternários no avaliador** (`if(TipoInstalacao == "U", formulaA, formulaB)`). Funciona com mathjs, mas vira ilegível com 3+ condições. Bom para protótipo, ruim para escala.
> 2. **Múltiplas `PieceRole` com `condition`.** A `PieceRole` já tem `selector` que decide quais peças do grupo recebem aquele papel; daria pra estender com uma `condition` global ("este papel só se aplica se TipoInstalacao=U"). Cobertura passaria a depender também da condição. Mais limpo no admin (cada variante tem seu próprio card com fórmulas próprias), mais complexo no motor.
> 3. **Sub-tipologia ou variante de tipologia.** A escolha vira parte da identidade da tipologia: "Porta de giro com fixo - U" e "Porta de giro com fixo - ferragem" seriam tipologias separadas. Limpo conceitualmente, mas duplica cadastro e força o vidraceiro a escolher antes de informar medidas.
>
> O caminho 2 parece o mais alinhado ao espírito do modelo (estrutura no domínio, não em fórmula). Decisão a tomar depois de mais casos confirmarem o padrão.
