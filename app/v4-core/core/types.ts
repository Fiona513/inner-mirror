export const REASONING_RULE_VERSION = "v4.3-insight.3" as const;

export type JourneyState =
  | "ENTER"
  | "CLARIFY"
  | "DIFFERENTIATE"
  | "FIRST_AGENT_MOMENT"
  | "EXPLORE"
  | "REVISION"
  | "GO_DEEPER"
  | "RECOGNITION"
  | "NO_VALID_INSIGHT"
  | "CORRECT_AND_LEAVE";

export interface LifeContext {
  scenarioId: string;
  label: string;
  referenceId: string;
}

export type SignalSource =
  | "choice"
  | "scenario"
  | "comparison"
  | "relative_position"
  | "confirmation";

export interface Signal {
  id: string;
  source: SignalSource;
  evidenceFamily: string;
  key: string;
  value: string | string[] | number;
  semanticKey?: string;
  abstained?: boolean;
}

export interface Hypothesis {
  id: string;
  statement: string;
  supportingSignalIds: string[];
  contradictingSignalIds: string[];
  status: "emerging" | "supported" | "weakened" | "rejected";
}

export interface Discriminator {
  id: string;
  hypothesisA: string;
  hypothesisB: string;
  interactionId: string;
}

export interface Revision {
  previousPrimary?: string;
  previousAlternative?: string;
  newPrimary?: string;
  triggerSignalIds: string[];
  type: "strengthened" | "primary_switch" | "both_weakened" | "user_rejection";
}

export type InsightResponse =
  | "strongly_endorsed"
  | "partially_endorsed"
  | "rejected"
  | "prefer_alternative"
  | "reject_both";

export interface Insight {
  id: string;
  hypothesisId: string;
  statement: string;
  semanticKey: string;
  cognitiveGainKey: string;
  sourceSignalIds: string[];
  evidenceFamilies: string[];
  alternativeTested: boolean;
  contextScenarioId: string;
  contextReferenceId: string;
  inferenceDepth: number;
  correctionOptions: InsightResponse[];
  status: "candidate" | "endorsed" | "partial" | "rejected";
}

export interface TestedAlternative {
  id: string;
  hypothesisId: string;
  comparedWithHypothesisId: string;
  discriminatorId: string;
  triggerSignalId: string;
  outcome: "primary_held" | "primary_switched" | "both_weakened";
  statusAfterTest: Hypothesis["status"];
  activeAfterTest: boolean;
}

export type InsightGateCheck =
  | "non_paraphrase"
  | "multi_source"
  | "alternative_tested"
  | "context_bound"
  | "one_layer"
  | "user_correctable";

export interface InsightGateResult {
  eligible: boolean;
  checks: Record<InsightGateCheck, boolean>;
  failedChecks: InsightGateCheck[];
  underlyingHypothesisId?: string;
}

export interface NoValidInsight {
  status: "NO_VALID_INSIGHT";
  openQuestion: string;
  gate: InsightGateResult;
  reason: NoValidReason;
}

export type NoValidReason =
  | "insufficient_signals"
  | "both_directions_rejected"
  | "both_weakened"
  | "insight_gate_failed";

export interface EligibleInsight {
  status: "INSIGHT_ELIGIBLE";
  insight: Insight;
  gate: InsightGateResult;
}

export type RecognitionOutcome = NoValidInsight | EligibleInsight;

export interface RejectedInterpretation {
  insightId: string;
  hypothesisId: string;
  response: Extract<InsightResponse, "rejected" | "prefer_alternative" | "reject_both">;
  signalId: string;
}

export interface PendingCorrection {
  rejectedInsightId: string;
  rejectedHypothesisId: string;
  reconsideredHypothesisId?: string;
  displayedAlternativeId?: string;
  mode: "reconsider_alternative" | "both_rejected";
}

export interface PresentedPair {
  primaryId: string;
  alternativeId: string;
}

export interface FormationGateResult {
  eligible: boolean;
  evidenceFamilies: string[];
  eligibleCandidateIds: string[];
  reason:
    | "needs_more_evidence_families"
    | "needs_second_supported_candidate"
    | "pair_formed"
    | "all_candidates_weakened";
}

export interface Session {
  id: string;
  scenarioPackId: string;
  reasoningRuleVersion: typeof REASONING_RULE_VERSION;
  state: JourneyState;
  lifeContext: LifeContext;
  signals: Signal[];
  candidates: Hypothesis[];
  primary?: Hypothesis;
  activeAlternative?: Hypothesis;
  testedAlternatives: TestedAlternative[];
  activeDiscriminator?: Discriminator;
  formationGate: FormationGateResult;
  hypothesisPairFormed: boolean;
  insight?: Insight;
  insightGate?: InsightGateResult;
  recognitionOutcome?: RecognitionOutcome;
  rejected: string[];
  rejectedDirections: string[];
  rejectedScenarios: string[];
  rejectedInterpretations: RejectedInterpretation[];
  revisions: Revision[];
  lastRevision?: Revision;
  openQuestion?: string;
  explorationActionCount: number;
  clarifyStepIndex: number;
  consecutiveAbstainCount: number;
  totalAbstainCount: number;
  correctionRound: number;
  correctionFollowupUsed: boolean;
  pendingCorrection?: PendingCorrection;
  presentedPair?: PresentedPair;
  noValidReason?: NoValidReason;
}

export interface ReasoningFingerprint {
  ruleVersion: string;
  scenarioPackId: string;
  formationEligible: boolean;
  evidenceFamilies: string[];
  primary?: { id: string; status: Hypothesis["status"] };
  activeAlternative?: { id: string; status: Hypothesis["status"] };
  testedAlternativeIds: string[];
  discriminatorId?: string;
  revisionType?: Revision["type"];
}

export interface InsightFingerprint {
  ruleVersion: string;
  scenarioPackId: string;
  gateEligible?: boolean;
  failedChecks: InsightGateCheck[];
  outcome?: RecognitionOutcome["status"];
  underlyingHypothesisId?: string;
  insightId?: string;
}
