import type { TipologiaSnapshot, VariableValue } from "@/lib/engine";

export type EmbedColor =
  | "incolor"
  | "fume"
  | "bronze"
  | "verde"
  | "refletivo"
  | "acidato";

export type EmbedVars = {
  width?: number;
  height?: number;
  thickness?: number;
  color?: EmbedColor;
  sashCount?: number;
};

type EmbedVarKey = keyof EmbedVars;

// Lista das chaves de template disponíveis no vdx-render-embed.
// Mantém em sincronia manualmente; quando o embed adicionar/remover
// templates, atualizar aqui. Agrupado por família para facilitar leitura
// no select do admin.
export const RENDER_KEYS = [
  // Portas
  "porta-vidro",
  "porta-vidro-fume",
  "porta-correr",
  "porta-correr-bronze",
  "porta-correr-acidato",
  "porta-correr-fora-vao",
  "porta-pivotante",
  "porta-pivotante-bronze",
  "porta-camarao-4",
  "porta-mola-piso",
  "porta-giro-bandeira",
  "porta-sauna",
  "pivotante-dupla",
  "pivotante-dupla-bandeira",
  "pivotante-fixo",
  // Janelas
  "janela-basculante",
  "janela-correr-2",
  "janela-correr-2-verde",
  "janela-correr-4",
  "janela-pivotante",
  "janela-pivotante-335",
  "janela-bandeira",
  "janela-orion-plus-2",
  "janela-orion-plus-4",
  "janela-maxim-ar",
  "janela-guilhotina",
  // Correr (genérico)
  "correr-2-folhas",
  "correr-3-folhas",
  "correr-4-folhas",
  // Box
  "box-banho",
  "box-banho-acidato",
  "box-2-folhas",
  "box-giro",
  "box-giro-fixo",
  "box-articulado",
  "box-flex",
  "box-frontal-fixo",
  // Divisórias
  "divisoria",
  "divisoria-3-fixas",
  "divisoria-fixas",
  "divisoria-refletiva",
  // Varanda / Sacada
  "varanda",
  "sacada-central",
  // Balcão
  "balcao-pia-2",
  "balcao-pia-3",
  "balcao-pia-4",
  // Outros
  "fixo-vidro",
  "espelho-bisote",
  "tampo-mesa",
  "prateleira",
  "versatick-truck-3",
] as const;

export type RenderKey = (typeof RENDER_KEYS)[number];

export function isRenderKey(v: string): v is RenderKey {
  return (RENDER_KEYS as readonly string[]).includes(v);
}

// Convenção de mapeamento: códigos de variável → keys do EmbedVars.
// Quando o codigo da variável bate com uma chave aqui, o valor é
// passado pro embed automaticamente. Variáveis fora dessa convenção
// são ignoradas pelo render.
const CONVENTION: Record<string, EmbedVarKey> = {
  Lvao: "width",
  Avao: "height",
  Lporta: "width",
  Aporta: "height",
  Largura: "width",
  Altura: "height",
  Espessura: "thickness",
  Cor: "color",
  Nfolhas: "sashCount",
};

/** Resolve a key do embed pra um codigo arbitrário (incluindo aliases). */
export function getEmbedKeyForCodigo(codigo: string): EmbedVarKey | null {
  return CONVENTION[codigo] ?? null;
}

/** Rótulo legível em pt-BR pra cada variável aceita pelo embed. */
export const EMBED_KEY_LABELS: Record<EmbedVarKey, string> = {
  width: "largura",
  height: "altura",
  thickness: "espessura",
  color: "cor",
  sashCount: "número de folhas",
};

/**
 * Preset pronto pra ser adicionado como variável da tipologia. Cobre o caso
 * mais comum (codigo canônico) — aliases (ex.: Lporta) ainda funcionam pelo
 * CONVENTION acima quando criados manualmente.
 */
export type EmbedVarPreset = {
  codigo: string;
  embedKey: EmbedVarKey;
  label: string;
  description: string;
  kind: "DIMENSION" | "COUNT" | "TECHNICAL_PARAM" | "OPTION_LIST";
  nivel: "VAO" | "ORCAMENTO";
  unit: string | null;
  defaultValue: string | null;
  minValue: string | null;
  maxValue: string | null;
  required: boolean;
  options?: { codigo: string; label: string }[];
};

export const EMBED_VAR_PRESETS: readonly EmbedVarPreset[] = [
  {
    codigo: "Lvao",
    embedKey: "width",
    label: "Largura do vão",
    description:
      "Largura total em mm. Controla a largura do render.",
    kind: "DIMENSION",
    nivel: "VAO",
    unit: "mm",
    defaultValue: "2000",
    minValue: "300",
    maxValue: "8000",
    required: true,
  },
  {
    codigo: "Avao",
    embedKey: "height",
    label: "Altura do vão",
    description:
      "Altura total em mm. Controla a altura do render.",
    kind: "DIMENSION",
    nivel: "VAO",
    unit: "mm",
    defaultValue: "2100",
    minValue: "300",
    maxValue: "3500",
    required: true,
  },
  {
    codigo: "Nfolhas",
    embedKey: "sashCount",
    label: "Quantidade de folhas",
    description:
      "Número de folhas (2 a 8). Só afeta tipologias paramétricas (varanda, divisória de fixos).",
    kind: "COUNT",
    nivel: "VAO",
    unit: "un",
    defaultValue: "4",
    minValue: "2",
    maxValue: "8",
    required: true,
  },
  {
    codigo: "Espessura",
    embedKey: "thickness",
    label: "Espessura do vidro",
    description: "Espessura do vidro em mm — controla a espessura no render.",
    kind: "TECHNICAL_PARAM",
    nivel: "ORCAMENTO",
    unit: "mm",
    defaultValue: "10",
    minValue: null,
    maxValue: null,
    required: false,
  },
  {
    codigo: "Cor",
    embedKey: "color",
    label: "Cor do vidro",
    description:
      "Cor do vidro renderizado. Apenas as 6 cores aceitas pelo embed são válidas.",
    kind: "OPTION_LIST",
    nivel: "VAO",
    unit: null,
    defaultValue: "incolor",
    minValue: null,
    maxValue: null,
    required: true,
    options: [
      { codigo: "incolor", label: "Incolor" },
      { codigo: "fume", label: "Fumê" },
      { codigo: "bronze", label: "Bronze" },
      { codigo: "verde", label: "Verde" },
      { codigo: "refletivo", label: "Refletivo" },
      { codigo: "acidato", label: "Acidato" },
    ],
  },
];

export type RenderConfig = {
  renderKey: RenderKey;
  varMap: Record<string, EmbedVarKey>;
};

/**
 * Resolve config de render a partir do snapshot. Retorna null quando a
 * tipologia não tem renderKey definido ou aponta pra uma chave inválida.
 */
export function getRenderConfig(
  snapshot: TipologiaSnapshot
): RenderConfig | null {
  const key = snapshot.renderKey;
  if (!key || !isRenderKey(key)) return null;
  return { renderKey: key, varMap: CONVENTION };
}

export function buildEmbedVars(
  config: RenderConfig,
  inputs: Record<string, VariableValue>
): EmbedVars {
  const out: EmbedVars = {};
  for (const [varCode, embedKey] of Object.entries(config.varMap)) {
    const v = inputs[varCode];
    if (v === undefined || v === null) continue;
    switch (embedKey) {
      case "width":
      case "height":
      case "thickness":
        if (typeof v === "number" && Number.isFinite(v) && v > 0) {
          out[embedKey] = v;
        }
        break;
      case "sashCount":
        if (typeof v === "number" && Number.isInteger(v) && v >= 2 && v <= 8) {
          out.sashCount = v;
        }
        break;
      case "color":
        if (typeof v === "string" && isEmbedColor(v)) out.color = v;
        break;
    }
  }
  return out;
}

const VALID_COLORS: readonly EmbedColor[] = [
  "incolor",
  "fume",
  "bronze",
  "verde",
  "refletivo",
  "acidato",
];

function isEmbedColor(v: string): v is EmbedColor {
  return (VALID_COLORS as readonly string[]).includes(v);
}
