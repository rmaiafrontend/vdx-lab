import { evaluate } from "./evaluator";
import { round2 } from "./units";
import type {
  BreakdownItem,
  EvalScope,
  Lookups,
  PecaCalculada,
  PieceSpecificationCalculada,
  PricingRuleSnapshot,
  Totais,
  VidroInput,
} from "./types";

export type PricingInput = {
  rules: PricingRuleSnapshot[];
  pecas: PecaCalculada[];
  totais: Totais;
  baseScope: EvalScope;
  vidro?: VidroInput;
  lookups?: Lookups;
  tipologiaId?: number;
};

export function avaliarPricing(input: PricingInput): BreakdownItem[] {
  const { rules, pecas, totais, baseScope, vidro, lookups, tipologiaId } = input;
  const breakdown: BreakdownItem[] = [];

  const precoVidro = makePrecoVidroLookup(vidro, lookups);
  const precoTorre = lookups?.precoTorre;

  const pricingScope: EvalScope = {
    ...baseScope,
    VidroId: vidro?.vidroId ?? (baseScope.VidroId as number | undefined) ?? 0,
    areaCobrancaTotal: totais.areaCobrancaM2,
    areaRealTotal: totais.areaRealM2,
    quantidadePecas: totais.quantidadePecas,
    count: (arr: unknown) => (Array.isArray(arr) ? arr.length : 0),
    pecas: pecas as unknown as EvalScope[keyof EvalScope],
  };

  const activeRules = rules
    .filter((r) => r.ativo)
    .sort((a, b) => a.ordem - b.ordem);

  for (const rule of activeRules) {
    if (rule.condition) {
      const cond = evaluate(rule.condition, pricingScope, {
        scope: "VAO",
        tipologiaId,
        precoVidro,
        precoTorre,
        field: `pricing_rules[${rule.codigo}].condition`,
      });
      if (cond !== true) continue;
    }

    let valor = 0;

    switch (rule.basis) {
      case "FIXED":
      case "PER_VAO":
      case "PER_ORCAMENTO": {
        valor = Number(
          evaluate(rule.expression, pricingScope, {
            scope: "VAO",
            tipologiaId,
            precoVidro,
            precoTorre,
            field: `pricing_rules[${rule.codigo}].expression`,
          })
        );
        break;
      }
      case "PER_M2": {
        const valorM2 = Number(
          evaluate(rule.expression, pricingScope, {
            scope: "VAO",
            tipologiaId,
            precoVidro,
            precoTorre,
            field: `pricing_rules[${rule.codigo}].expression`,
          })
        );
        const area = areaForRule(rule, pecas, totais);
        valor = valorM2 * area;
        break;
      }
      case "PER_PIECE": {
        const targetPieces = piecesForRule(rule, pecas);
        for (const p of targetPieces) {
          const pieceScope: EvalScope = {
            ...pricingScope,
            INDEX: p.index,
            ROLE: p.roleCode ?? "",
            wReal: p.wReal,
            hReal: p.hReal,
            wCobranca: p.wCobranca,
            hCobranca: p.hCobranca,
            areaRealM2: p.areaRealM2,
            areaCobrancaM2: p.areaCobrancaM2,
          };
          // No modo MEDIDA, variáveis nivel=PECA da peça entram no scope
          // (ex.: QtdTorres em "QtdTorres * precoTorre(ModeloTorre)").
          for (const [k, v] of Object.entries(p.variables)) {
            if (!(k in pieceScope)) pieceScope[k] = v as EvalScope[string];
          }
          // Atributos materializados das especificações também ficam disponíveis.
          for (const spec of p.especificacoes) {
            for (const [k, v] of Object.entries(spec.atributos)) {
              if (!(k in pieceScope)) pieceScope[k] = v as EvalScope[string];
            }
          }
          valor += Number(
            evaluate(rule.expression, pieceScope, {
              scope: "PIECE",
              tipologiaId,
              groupCode: p.groupCode ?? undefined,
              roleCode: p.roleCode ?? undefined,
              precoVidro,
              precoTorre,
              field: `pricing_rules[${rule.codigo}].expression`,
            })
          );
        }
        break;
      }
      case "PER_GROUP": {
        const groupCode =
          rule.appliesTo === "GROUP_CODE" ? rule.appliesToValue : null;
        if (!groupCode) break;
        const hasGroup = pecas.some((p) => p.groupCode === groupCode);
        if (!hasGroup) break;
        valor = Number(
          evaluate(rule.expression, pricingScope, {
            scope: "GROUP",
            tipologiaId,
            groupCode,
            precoVidro,
            precoTorre,
            field: `pricing_rules[${rule.codigo}].expression`,
          })
        );
        break;
      }
      case "PER_SPECIFICATION": {
        const tipoFiltro =
          rule.appliesTo === "SPECIFICATION_TYPE" ? rule.appliesToValue : null;
        for (const peca of pecas) {
          for (const spec of peca.especificacoes) {
            if (tipoFiltro && spec.tipo !== tipoFiltro) continue;
            const specScope = buildSpecScope(pricingScope, peca, spec);
            valor += Number(
              evaluate(rule.expression, specScope, {
                scope: "PIECE",
                tipologiaId,
                precoVidro,
                precoTorre,
                field: `pricing_rules[${rule.codigo}].expression`,
              })
            );
          }
        }
        break;
      }
    }

    breakdown.push({
      ruleCode: rule.codigo,
      kind: rule.componentKind,
      valor: round2(valor),
    });
  }

  return breakdown;
}

function makePrecoVidroLookup(
  vidro?: VidroInput,
  lookups?: Lookups
): (vidroId: number) => number {
  return (vidroId) => {
    if (vidro?.precoM2 !== undefined) return vidro.precoM2;
    if (lookups?.precoVidro) return lookups.precoVidro(vidroId);
    // sem injeção: erro explícito (evita custo silencioso)
    throw new Error(
      `precoVidro não injetado: lookups.precoVidro ausente (vidroId=${vidroId})`
    );
  };
}

function buildSpecScope(
  baseScope: EvalScope,
  peca: PecaCalculada,
  spec: PieceSpecificationCalculada
): EvalScope {
  const out: EvalScope = {
    ...baseScope,
    INDEX: peca.index,
    wReal: peca.wReal,
    hReal: peca.hReal,
    wCobranca: peca.wCobranca,
    hCobranca: peca.hCobranca,
    areaRealM2: peca.areaRealM2,
    areaCobrancaM2: peca.areaCobrancaM2,
  };
  for (const [k, v] of Object.entries(peca.variables)) {
    if (!(k in out)) out[k] = v as EvalScope[string];
  }
  for (const [k, v] of Object.entries(spec.atributos)) {
    out[k] = v as EvalScope[string];
  }
  return out;
}

function areaForRule(
  rule: PricingRuleSnapshot,
  pecas: PecaCalculada[],
  totais: Totais
): number {
  if (rule.appliesTo === "TIPOLOGIA") return totais.areaCobrancaM2;
  if (rule.appliesTo === "GROUP_CODE") {
    return pecas
      .filter((p) => p.groupCode === rule.appliesToValue)
      .reduce((s, p) => s + p.areaCobrancaM2, 0);
  }
  if (rule.appliesTo === "ROLE_CODE") {
    const roles = parseRoleList(rule.appliesToValue);
    return pecas
      .filter((p) => p.roleCode !== null && roles.includes(p.roleCode))
      .reduce((s, p) => s + p.areaCobrancaM2, 0);
  }
  return 0;
}

function piecesForRule(
  rule: PricingRuleSnapshot,
  pecas: PecaCalculada[]
): PecaCalculada[] {
  if (rule.appliesTo === "TIPOLOGIA") return pecas;
  if (rule.appliesTo === "GROUP_CODE") {
    return pecas.filter((p) => p.groupCode === rule.appliesToValue);
  }
  if (rule.appliesTo === "ROLE_CODE") {
    const roles = parseRoleList(rule.appliesToValue);
    return pecas.filter((p) => p.roleCode !== null && roles.includes(p.roleCode));
  }
  return [];
}

function parseRoleList(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}
