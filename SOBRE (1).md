# vdx engine

Motor de inteligência do domínio vidraçaria. Constitution (catálogo canônico de ferragens, vidros, kits, regras), endpoints determinísticos de consulta e endpoints generativos com LLM. Não tem cara, não tem frontend, não renderiza visualmente nada. É o cérebro que alimenta os produtos visuais da família VDX (incluindo o Lab).

O nome interno do pacote hoje é `vdx-render-api` — nome legado da fase em que o produto era motor de renderização. Será renomeado para `vdx-engine` na próxima refatoração.

---

## Para que serve

A vidraçaria brasileira tem duas escassezes técnicas que o Lab sozinho não resolve:

1. **Catálogo confiável e cross-fabricante.** Cada fabricante (Glasspeças, HELA, AL, GMS-Blindex, GLASSVETRO) tem nomenclatura própria, mas o setor inteiro converge no padrão Santa Marina (códigos 1101, 1103, 1520 etc.). O vendedor real chama "510" quando quer dizer "1510". A vendedora chama "gv" quando quer dizer "1101R" (dobradiça superior reforçada). Sem um lugar único que reconcilie isso, qualquer software vira ilha.

2. **Inteligência sobre conteúdo não-estruturado.** Foto de ferragem que cliente trouxe, áudio do cliente descrevendo o que quer, CAD do arquiteto, manual de instalação em PDF — tudo isso é entrada do mundo real que precisa virar dado estruturado para o Lab calcular.

O Engine resolve isso oferecendo:

1. **Constitution DB** — base canônica do conhecimento sobre ferragens, vidros, kits, regras NBR.
2. **Endpoints determinísticos** — busca, listagem, filtros, alternativas. Resposta direta, sem LLM no caminho.
3. **Endpoints generativos** — LLM responde perguntas que exigem interpretação (foto, áudio, CAD, texto livre).
4. **Contrato JSON estável** — Lab e VDX consomem como infra. Versionamento, compatibilidade backwards.

---

## Conceitos centrais

### 1. Canonical

Identificador único de uma ferragem no padrão Santa Marina (chave setorial). Exemplo: `1101` é dobradiça superior. Tem categoria, função, recorte canônico (largura × altura em mm), carga máxima recomendada, fixação (vidro/vidro, vidro/alvenaria), regra de uso.

### 2. Variante

Implementação específica de um canonical por fabricante. Exemplo: `1101-SG` (Santa Marina), `1101-LGL`, `1101-AL`, `1101-GLASSPECAS`. Mesma função, dimensões podem variar levemente, preço varia, acabamento varia.

### 3. Alias

Como o mercado real chama um canonical. Pode ser truncamento (`510 → 1510`), apelido (`gv → 1101R`), nome popular (`lateral reforçada → 1101R`), código alternativo. Todos resolvem para o canonical correto via `GET /api/v2/ferragens/buscar?q=...`.

### 4. Função canônica + Alternativa funcional

Agrupa canonicals que resolvem o mesmo papel funcional. Exemplo: a função `dobradica_superior_porta` tem três alternativas: `1101` (padrão), `1114` (automática box), `1101R` (reforçada para vidro pesado). Vidraceiro escolhe baseado em peso do vidro e posição da fechadura.

### 5. Kit

Conjunto pré-definido de canonicals que compõem uma tipologia comum (ex.: kit porta pivotante, kit box articulado). Atalho de modelagem.

### 6. Regra global

Constraints normativos do setor (folgas NBR 7199, espessura mínima por aplicação, peso máximo por ferragem). Aplicáveis a todas as tipologias.

---

## Tabelas principais do Constitution DB

| Tabela | Conteúdo | Volume atual |
|---|---|---|
| `canonicas` | Canonical IDs (chave Santa Marina) | 180 entradas |
| `variantes_canonicas` | Variantes por fabricante | 303 entradas |
| `aliases_canonicos` | Truncamentos, apelidos, nomes populares | ~30 entradas |
| `funcoes_canonicas` | Agrupamento funcional | em construção |
| `alternativas_funcionais` | Alternativas equivalentes por função | em construção |
| `kits_canonicos` | Kits prontos (Pivotante, Articulada, Box) | 18 kits |
| `kits_componentes` | Componentes de cada kit | múltiplos por kit |
| `regras_globais` | Folgas NBR e constraints normativos | 5 entradas |
| `pendentes_validacao_humana` | Itens aguardando confirmação de campo | 2 entradas |

Schema completo está em `data/constitution.db` (SQLite).

---

## Stack atual

- **Backend:** FastAPI + Python 3.11
- **DB:** SQLite (`data/constitution.db`)
- **LLMs locais:** Ollama (Gemma 4, Qwen 3) — disponíveis no servidor, ainda não usados em produção
- **LLMs cloud:** Claude API (planejado para tarefas críticas com visão e parsing complexo)
- **Servidor:** Contabo VPS, deploy via `git pull` + `Restart=always`
- **Produção:** `https://render.sw3.tec.br`

A stack pode evoluir conforme demanda (Postgres se carga aumentar, queue se tarefas LLM crescerem). Decisão pós-inventário.

---

## Endpoints atuais (v2 em produção)

```
GET  /api/v2/ferragens/buscar?q={código}     Busca por canonical OU alias
GET  /api/v2/ferragens/?linha=&categoria=    Listagem com filtros
GET  /api/v2/ferragens/{cid}                 Detalhe de canonical
GET  /api/v2/ferragens/{cid}/variantes       Variantes por fabricante
GET  /api/v2/ferragens/kits                  Lista de kits
GET  /api/v2/ferragens/regras                Folgas NBR e regras globais
GET  /api/v2/ferragens/filtros               Valores possíveis dos filtros
```

Endpoints v1 (legado de renderização visual) também ativos durante a transição. Vão ser desligados quando o Lab assumir 100% da camada visual.

---

## Reposicionamento em curso

O Engine nasceu como motor de renderização visual (gerador de SVG/PNG/PDF, viewer 3D, frontend próprio com `/editor` e `/configurar`). Acumulou responsabilidades porque não havia outro lugar pra colocá-las.

Com o Lab assumindo a camada visual, o Engine volta à sua vocação original: **motor de inteligência puro, sem frontend, sem render visual**.

### Sai do Engine
- Frontend `/editor` (recém-entregue) — desliga
- Frontend `/configurar` (legado) — desliga
- Renderer SVG (`svg_renderer_v2.py` e correlatos)
- Pipeline 3D (Three.js viewer, scene builder)
- Endpoints v1 de renderização

### Fica no Engine
- Constitution DB
- Endpoints v2 de busca e consulta
- Pipeline de extração de catálogos (PDF → DB)
- Inteligência LLM (em construção)

### Nasce no Engine
- Endpoints generativos (foto → código, áudio → tipologia, CAD → vãos)
- Endpoints de modelagem assistida (Engine ajuda Lab a cadastrar tipologia)
- Endpoints de validação técnica (Engine valida orçamento que Lab calcula)

---

## Capacidades planejadas

### Capacidade 1 — Catálogo canônico via API

Lab consulta Engine para preencher dropdowns, validar códigos, listar variantes, obter preços e alternativas.

**Endpoints novos a construir:**
- `GET /api/v2/ferragens/{cid}/precos` — preço atual por variante/fabricante
- `GET /api/v2/ferragens/{cid}/alternativas` — alternativas funcionais (1101 vs 1114 vs 1101R)
- `GET /api/v2/vidros/preco?cor=&espessura=` — preço por m² de vidro

**Esforço:** baixo. Endpoints novos sobre tabelas existentes.

**Valor:** Lab para de duplicar dados que estão no Engine. Catálogo único, manutenção centralizada.

### Capacidade 2 — Modelagem assistida de tipologia

LLM ajuda admin do Lab a cadastrar tipologia nova mais rápido.

**Como funcionaria:**
- Admin do Lab tem botão "Importar tipologia"
- Cole nome (ex.: "Box camarão 2 folhas") + opcional foto/link de referência
- Engine consulta Constitution + manuais de fabricante + padrões setoriais → propõe esqueleto JSON Lab pronto: variáveis padrão, grupos de peças, fórmulas, componentes de preço
- Humano revisa, ajusta, salva no Lab

**Esforço:** médio-alto. Requer LLM bem prompt-engineered + biblioteca de "padrões de tipologia" como contexto + Constitution rica.

**Valor:** alto. Reduz custo de cadastro de horas para minutos. Lab escala mais rápido.

### Capacidade 3 — Identificação visual (foto → código)

Vendedora tira foto de ferragem na obra (ou cliente manda foto por WhatsApp), Engine identifica o código.

**Como funcionaria:**
- `POST /api/v2/identify/ferragem` com imagem
- Engine usa LLM com visão (Claude Vision ou Qwen-VL local) usando Constitution como referência
- Retorna: `{canonical_id: "1101", confidence: 0.85, candidates: [...], reasoning: "..."}`
- Vendedora confirma → vira input para o orçamento no Lab

**Esforço:** médio. Dataset inicial existe (22 fotos da vendedora real Niedja).

**Valor:** alto e palpável. Resolve dor real e atual. Diferencial competitivo claro.

### Capacidade 4 — Especificação por linguagem natural

Cliente descreve por texto/áudio o que quer ("fechar a varanda em vidro temperado, espelho dos dois lados") e Engine devolve tipologia provável + medidas a perguntar + ferragens prováveis.

**Como funcionaria:**
- `POST /api/v2/parse/natural` com texto (ou áudio transcrito)
- LLM interpreta cruzando com Constitution
- Retorna: `{tipologia_sugerida: "varanda_4_folhas_correr", medidas_a_perguntar: [...], ferragens_provaveis: [...], confidence: ...}`
- Lab inicia wizard pré-preenchido com a sugestão

**Esforço:** alto. Linguagem é traiçoeira. Requer iteração com vendedora real para calibrar prompts.

**Valor:** muito alto se funcionar. Vendedora atende cliente por WhatsApp e sai com orçamento.

### Capacidade 5 — Engenheiro virtual (validação técnica)

Lab calcula preço e peças. Engine valida engenharia antes de fechar.

**Como funcionaria:**
- `POST /api/v2/validate/orcamento` com peças + ferragens + dimensões
- Engine roda regras: folgas NBR estão OK? carga das ferragens suporta o vidro escolhido? espessura mínima atende a aplicação? alguma alternativa mais barata daria conta?
- Retorna: `{valid: true/false, warnings: [...], suggestions: [...]}`

**Esforço:** alto. Requer profundidade técnica. Constitution tem parcial hoje.

**Valor:** alto. Diferencial brutal — "VDX não emite orçamento tecnicamente errado". Reduz retrabalho, defeito, retorno de cliente.

---

## Arquitetura proposta

```
┌─────────────────────────────────────────────────────────────────┐
│  VDX LAB                                                         │
│  Engine de cálculo paramétrico (Raiff)                           │
│  - Modela tipologias (admin)                                     │
│  - Calcula preço/peças (wizard)                                  │
│  - Determinístico, formal, sem LLM                               │
│  - Frontend: admin + wizard + docs                               │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     │ JSON (catálogo, sugestões, identificações,
                     │       validações)
                     │
┌────────────────────▼────────────────────────────────────────────┐
│  VDX ENGINE                                                      │
│  Motor de inteligência do domínio vidraçaria                     │
│  - Constitution DB (180 canonicals, 303 variantes, aliases)      │
│  - Endpoints determinísticos (busca, filtro, alternativas)       │
│  - Endpoints generativos (LLM): foto→código, áudio→tipologia,    │
│    cad→vãos, manual→tipologia para Lab                           │
│  - SEM frontend, SEM cara, só JSON                               │
└─────────────────────────────────────────────────────────────────┘
                     │
                     │ JSON (mesmas APIs)
                     │
┌────────────────────▼────────────────────────────────────────────┐
│  VDX (produto principal)                                         │
│  - Frontend cliente final                                        │
│  - Outros módulos (CRM, financeiro, etc.)                        │
└─────────────────────────────────────────────────────────────────┘
```

Engine alimenta Lab e VDX. Os dois consumidores não duplicam conhecimento de domínio — perguntam.

---

## Contrato Engine ↔ Lab

A definir conforme Lab evoluir. Princípios mínimos:

1. **JSON sobre HTTPS.** REST simples no curto prazo. GraphQL possível se Lab pedir.
2. **Versionamento na URL.** `/api/v2/...` hoje, `/api/v3/...` quando houver breaking change.
3. **Backwards compatibility.** Engine não quebra contrato sem aviso prévio. Versões antigas convivem com novas durante transição.
4. **Sem estado no Engine para consumidores.** Lab cuida do estado dele, Engine responde requests stateless.
5. **Errors estruturados.** Toda falha retorna `{error_code, message, hint}` interpretável.

Spec detalhada do contrato será desenhada quando Raiff sinalizar quais endpoints o Lab precisa. Engine prepara infra; Lab define demanda.

---

## Estado atual do Engine

- **Schema v2 deployado em produção.** 180 canonicals, 303 variantes, aliases para os 17 códigos do dia-a-dia da vendedora real.
- **17/17 códigos da vendedora resolvendo via API** (incluindo truncamentos como `510 → 1510` e apelidos como `gv → 1101R`).
- **681 testes verdes**, CI verde no GitHub.
- **Endpoints v2 ativos** em `https://render.sw3.tec.br/api/v2/`.

Pendências documentadas:

- Schema sem campo de furos (refinamento futuro)
- Catálogos LGL e TQ não baixados (URL falhou)
- Itens `jumbo` e `gv = 1101R` aguardam confirmação visual com a vendedora
- Frontend `/editor` e `/configurar` em produção, mas marcados para desligamento conforme Lab assume

---

## Filosofia

O Engine é **infraestrutura**, não produto final. Sua qualidade é medida pela facilidade com que Lab e VDX entregam valor ao cliente final. Não tem vaidade de UI, não compete por atenção do usuário. Existe pra desaparecer atrás dos consumidores e fazer eles parecerem mais inteligentes do que seriam sem ele.

Cada nova capacidade só nasce quando Lab ou VDX confirmam demanda real. Engine não constrói pra abstração — constrói pra alguém usar.

A divisão de responsabilidade com o Lab é estrita:
- **Engine:** o que existe no domínio, como se relaciona, como interpretar entrada do mundo real.
- **Lab:** como o vendedor opera no dia-a-dia, como modelar tipologia, como calcular preço.

Quando uma feature ambígua aparecer, a pergunta é: "isso é conhecimento do domínio (Engine) ou processo de uso (Lab)?". A resposta define onde mora.

---

## Como rodar (em desenvolvimento)

```bash
git clone <repo>
cd vdx-render-api
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload --port 8001
```

Constitution DB já vem populado em `data/constitution.db`. Para popular do zero:

```bash
python3 scripts/etl_v2_from_ferragens.py --apply
python3 scripts/ingestao_glasspecas_2022.py --apply
python3 scripts/ingestao_gms_blindex.py --apply
python3 scripts/seed_aliases_niedja.py --apply
```

Testes:

```bash
python3 -m pytest tests/
```

---

## Próximos passos

1. **Inventário do estado atual** — categorizar cada módulo entre fica/migra/desliga.
2. **Definição do contrato Engine ↔ Lab** (com Raiff) — endpoints prioritários para Lab consumir.
3. **Migração visual para o Lab** — desligar `/editor`, `/configurar`, renderer SVG, viewer 3D.
4. **Capacidade 1** (catálogo canônico via API) — endpoints novos para Lab consumir como infra.
5. **Capacidade 3** (identificação visual) — primeiro endpoint generativo, dataset existe.
6. Depois: capacidades 2, 5 e 4 conforme demanda real.

---

## Contato

Allan Sales — SW3 Innovations  
Campina Grande, PB
