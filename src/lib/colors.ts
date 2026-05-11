/**
 * Paleta de cores por papel (`PieceRole.codigo`).
 *
 * Estratégia:
 * - Papéis com prefixo semântico conhecido recebem cor fixa (CANTO_* roxo, CENTRAL emerald, BANDEIRA azul).
 * - Papéis arbitrários caem em uma rotação determinística (hash simples → âmbar / rose / cyan / zinc).
 *
 * Classes Tailwind são `bg-*` / `border-*` (uso em `<div>` HTML).
 */
export type RoleColor = {
  /** classe `bg-*` para o retângulo da peça */
  bg: string;
  /** classe `border-*` para a borda do retângulo */
  border: string;
  /** classe `text-*` para o conteúdo dentro do retângulo */
  text: string;
  /** classe `bg-*` para o bullet do legend (cor sólida, sem alpha) */
  dot: string;
};

const SEMANTIC: Record<"canto" | "central" | "bandeira", RoleColor> = {
  canto: {
    bg: "bg-purple-500/25",
    border: "border-purple-400/60",
    text: "text-purple-100",
    dot: "bg-purple-400",
  },
  central: {
    bg: "bg-emerald-500/25",
    border: "border-emerald-400/60",
    text: "text-emerald-100",
    dot: "bg-emerald-400",
  },
  bandeira: {
    bg: "bg-blue-500/25",
    border: "border-blue-400/60",
    text: "text-blue-100",
    dot: "bg-blue-400",
  },
};

const FALLBACK: RoleColor[] = [
  {
    bg: "bg-amber-500/25",
    border: "border-amber-400/60",
    text: "text-amber-100",
    dot: "bg-amber-400",
  },
  {
    bg: "bg-rose-500/25",
    border: "border-rose-400/60",
    text: "text-rose-100",
    dot: "bg-rose-400",
  },
  {
    bg: "bg-cyan-500/25",
    border: "border-cyan-400/60",
    text: "text-cyan-100",
    dot: "bg-cyan-400",
  },
  {
    bg: "bg-fuchsia-500/25",
    border: "border-fuchsia-400/60",
    text: "text-fuchsia-100",
    dot: "bg-fuchsia-400",
  },
  {
    bg: "bg-zinc-500/25",
    border: "border-zinc-400/60",
    text: "text-zinc-100",
    dot: "bg-zinc-400",
  },
];

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function roleColor(roleCode: string): RoleColor {
  if (!roleCode) return FALLBACK[FALLBACK.length - 1];
  const upper = roleCode.toUpperCase();
  if (upper.startsWith("CANTO")) return SEMANTIC.canto;
  if (upper === "CENTRAL" || upper.startsWith("CENTR")) return SEMANTIC.central;
  if (upper === "BANDEIRA" || upper.startsWith("BANDEIR")) return SEMANTIC.bandeira;
  // Outros papéis: rotação determinística pelo hash do código
  return FALLBACK[hashString(upper) % FALLBACK.length];
}
