import type { Discriminator, LifeContext, PresentedPair, SignalSource } from "../core/types.ts";

export interface HypothesisRule {
  id: string;
  statement: string;
  order: number;
}

export interface EvidenceEffect {
  hypothesisId: string;
  weight: number;
}

export interface InteractionOption {
  id: string;
  label: string;
  semanticKey?: string;
  effects: EvidenceEffect[];
  isAbstain?: boolean;
}

export interface InsightRule {
  id: string;
  hypothesisId: string;
  statement: string;
  semanticKey: string;
  cognitiveGainKey: string;
  contextScenarioId: string;
  inferenceDepth: number;
}

export interface InteractionDefinition {
  id: string;
  kind?: "choice" | "ranking";
  source: Exclude<SignalSource, "confirmation">;
  evidenceFamily: string;
  key: string;
  prompt: string;
  options: InteractionOption[];
}

export interface FormationRules {
  minEvidenceFamilies: number;
  minEligibleCandidates: number;
  emergenceThreshold: number;
  supportedThreshold: number;
}

export interface EvidencePolicy {
  mode: "single_current_signal_per_family";
}

export interface NoValidCopyRule {
  hypothesisIds: [string, string];
  summary: string;
  openQuestion: string;
}

export interface ScenarioPack {
  id: string;
  label: string;
  entry: {
    kicker: string;
    title: string;
    support: string;
    action: string;
    boundary: string;
  };
  lifeContext: Omit<LifeContext, "referenceId">;
  hypotheses: HypothesisRule[];
  interactions: InteractionDefinition[];
  discriminators: Discriminator[];
  formation: FormationRules;
  evidencePolicy: EvidencePolicy;
  insightRules: InsightRule[];
  openQuestion: string;
  noValidSummary: string;
  noValidCopyRules?: NoValidCopyRule[];
  correctionPrompt: string;
  journey: {
    clarifyInteractionIds: string[];
  };
}

export function resolveNoValidCopy(pack: ScenarioPack, pair?: PresentedPair) {
  if (!pair) {
    return { summary: pack.noValidSummary, openQuestion: pack.openQuestion };
  }
  const pairIds = new Set([pair.primaryId, pair.alternativeId]);
  const matched = pack.noValidCopyRules?.find(
    (rule) => rule.hypothesisIds.every((hypothesisId) => pairIds.has(hypothesisId)),
  );
  return matched
    ? { summary: matched.summary, openQuestion: matched.openQuestion }
    : { summary: pack.noValidSummary, openQuestion: pack.openQuestion };
}
