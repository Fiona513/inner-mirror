import { rejectCurrentPrimary, stopWithoutInsight } from "./reasoning-engine.ts";
import type {
  Insight,
  InsightFingerprint,
  InsightGateCheck,
  InsightGateResult,
  InsightResponse,
  RecognitionOutcome,
  RejectedInterpretation,
  Session,
  Signal,
} from "./types.ts";
import type { ScenarioPack } from "../packs/types.ts";

export const INSIGHT_CORRECTION_OPTIONS: InsightResponse[] = [
  "strongly_endorsed",
  "partially_endorsed",
  "rejected",
  "prefer_alternative",
  "reject_both",
];

export type CorrectionFollowupResponse = "reconsidered_fits" | "still_not_fit";

const PARAPHRASE_FRAMING = [
  "可能更接近",
  "可能是",
  "也许是",
  "你现在",
  "我现在",
  "你觉得",
  "我觉得",
  "你想要",
  "我想要",
  "你需要",
  "我需要",
  "现在",
  "其实",
  "可能",
  "也许",
  "想要",
  "需要",
  "觉得",
  "我想",
  "你想",
  "的是",
  "这是",
  "我",
  "你",
];

function normalizeMeaning(value: Signal["value"] | string) {
  let normalized = Array.isArray(value) ? value.join(" ") : String(value);
  normalized = normalized.toLocaleLowerCase();
  for (const phrase of PARAPHRASE_FRAMING) normalized = normalized.replaceAll(phrase, "");
  return normalized.replace(/[\p{P}\p{S}\s]/gu, "");
}

function sourceSignals(session: Session, insight: Insight) {
  const sourceIds = new Set(insight.sourceSignalIds);
  return session.signals.filter((signal) => sourceIds.has(signal.id));
}

export function isNonParaphrase(insight: Insight, signals: Signal[]) {
  if (!insight.cognitiveGainKey || insight.cognitiveGainKey === insight.semanticKey) return false;
  if (signals.some((signal) => signal.semanticKey && signal.semanticKey === insight.semanticKey)) return false;

  const insightMeaning = normalizeMeaning(insight.statement);
  return !signals.some((signal) => {
    const signalMeaning = normalizeMeaning(signal.value);
    return signalMeaning.length >= 2 && signalMeaning === insightMeaning;
  });
}

export function hasTestedAlternative(pack: ScenarioPack, session: Session, hypothesisId: string) {
  return session.testedAlternatives.some(
    (record) => {
      const discriminator = pack.discriminators.find((item) => item.id === record.discriminatorId);
      if (!discriminator) return false;
      const pair = new Set([discriminator.hypothesisA, discriminator.hypothesisB]);
      if (!pair.has(record.hypothesisId) || !pair.has(record.comparedWithHypothesisId)) return false;
      if (record.hypothesisId === record.comparedWithHypothesisId) return false;
      const interaction = pack.interactions.find((item) => item.id === discriminator.interactionId);
      const trigger = session.signals.find((signal) => signal.id === record.triggerSignalId);
      return Boolean(
        interaction
        && trigger
        && trigger.source === interaction.source
        && trigger.key === interaction.key
        && trigger.evidenceFamily === interaction.evidenceFamily
        && (record.hypothesisId === hypothesisId || record.comparedWithHypothesisId === hypothesisId),
      );
    },
  );
}

function checksFor(
  pack: ScenarioPack,
  session: Session,
  insight: Insight,
): Record<InsightGateCheck, boolean> {
  const sources = sourceSignals(session, insight).filter((signal) => signal.source !== "confirmation");
  const evidenceFamilies = new Set(sources.map((signal) => signal.evidenceFamily));
  const correctionOptions = new Set(insight.correctionOptions);
  return {
    non_paraphrase: isNonParaphrase(insight, sources),
    multi_source: evidenceFamilies.size >= 2,
    alternative_tested: hasTestedAlternative(pack, session, insight.hypothesisId),
    context_bound: insight.contextScenarioId === session.lifeContext.scenarioId
      && insight.contextReferenceId === session.lifeContext.referenceId,
    one_layer: insight.inferenceDepth >= 0 && insight.inferenceDepth <= 1,
    user_correctable: INSIGHT_CORRECTION_OPTIONS.every((option) => correctionOptions.has(option)),
  };
}

export function evaluateInsightGate(
  pack: ScenarioPack,
  session: Session,
  insight: Insight,
): InsightGateResult {
  const checks = checksFor(pack, session, insight);
  const failedChecks = (Object.keys(checks) as InsightGateCheck[]).filter((check) => !checks[check]);
  return {
    eligible: failedChecks.length === 0,
    checks,
    failedChecks,
    underlyingHypothesisId: insight.hypothesisId,
  };
}

function blockedGate(underlyingHypothesisId?: string): InsightGateResult {
  const checks: Record<InsightGateCheck, boolean> = {
    non_paraphrase: false,
    multi_source: false,
    alternative_tested: false,
    context_bound: false,
    one_layer: false,
    user_correctable: false,
  };
  return {
    eligible: false,
    checks,
    failedChecks: Object.keys(checks) as InsightGateCheck[],
    underlyingHypothesisId,
  };
}

export function buildInsightCandidate(pack: ScenarioPack, session: Session): Insight | undefined {
  if (!session.primary) return undefined;
  const rule = pack.insightRules.find((item) => item.hypothesisId === session.primary?.id);
  if (!rule) return undefined;
  const sourceIds = new Set(session.primary.supportingSignalIds);
  const sources = session.signals.filter(
    (signal) => signal.source !== "confirmation" && sourceIds.has(signal.id),
  );
  return {
    id: rule.id,
    hypothesisId: rule.hypothesisId,
    statement: rule.statement,
    semanticKey: rule.semanticKey,
    cognitiveGainKey: rule.cognitiveGainKey,
    sourceSignalIds: sources.map((signal) => signal.id),
    evidenceFamilies: [...new Set(sources.map((signal) => signal.evidenceFamily))].sort(),
    alternativeTested: hasTestedAlternative(pack, session, rule.hypothesisId),
    contextScenarioId: rule.contextScenarioId,
    contextReferenceId: session.lifeContext.referenceId,
    inferenceDepth: rule.inferenceDepth,
    correctionOptions: [...INSIGHT_CORRECTION_OPTIONS],
    status: "candidate",
  };
}

function noValidInsight(
  pack: ScenarioPack,
  session: Session,
  gate: InsightGateResult,
): Session {
  const reason = session.lastRevision?.type === "both_weakened"
    ? "both_weakened"
    : "insight_gate_failed";
  return stopWithoutInsight(pack, session, reason, gate);
}

export function evaluateRecognition(pack: ScenarioPack, session: Session): Session {
  if (session.scenarioPackId !== pack.id) throw new Error("Scenario pack does not match session");
  const insight = buildInsightCandidate(pack, session);
  if (!insight) return noValidInsight(pack, session, blockedGate(session.primary?.id));
  const gate = evaluateInsightGate(pack, session, insight);
  if (!gate.eligible) return noValidInsight(pack, session, gate);
  const recognitionOutcome: RecognitionOutcome = {
    status: "INSIGHT_ELIGIBLE",
    insight,
    gate,
  };
  return {
    ...session,
    state: "RECOGNITION",
    insight,
    insightGate: gate,
    recognitionOutcome,
    openQuestion: undefined,
    pendingCorrection: undefined,
  };
}

function rejectInsight(
  pack: ScenarioPack,
  session: Session,
  response: Extract<InsightResponse, "rejected" | "prefer_alternative" | "reject_both">,
  signalId: string,
): Session {
  const insight = session.insight;
  if (!insight || session.recognitionOutcome?.status !== "INSIGHT_ELIGIBLE") {
    throw new Error("There is no eligible Insight to reject");
  }
  if (session.correctionRound >= 2) {
    return stopWithoutInsight(pack, session, "both_directions_rejected");
  }
  const rejectedInterpretation: RejectedInterpretation = {
    insightId: insight.id,
    hypothesisId: insight.hypothesisId,
    response,
    signalId,
  };
  const withoutInsight: Session = {
    ...session,
    insight: undefined,
    insightGate: undefined,
    recognitionOutcome: undefined,
    openQuestion: undefined,
  };
  const nextRound = session.correctionRound + 1;

  if (response === "reject_both") {
    const rejectedDirections = [
      ...new Set([
        ...session.rejectedDirections,
        insight.hypothesisId,
        ...(session.activeAlternative ? [session.activeAlternative.id] : []),
      ]),
    ];
    const recovery: Session = {
      ...withoutInsight,
      state: "GO_DEEPER",
      primary: undefined,
      activeAlternative: undefined,
      activeDiscriminator: undefined,
      rejected: [...new Set([...session.rejected, ...rejectedDirections])],
      rejectedDirections,
      rejectedInterpretations: [...session.rejectedInterpretations, rejectedInterpretation],
      correctionRound: nextRound,
      pendingCorrection: {
        rejectedInsightId: insight.id,
        rejectedHypothesisId: insight.hypothesisId,
        displayedAlternativeId: session.activeAlternative?.id,
        mode: "both_rejected",
      },
    };
    return nextRound >= 2
      ? stopWithoutInsight(pack, recovery, "both_directions_rejected")
      : recovery;
  }

  const displayedAlternativeId = session.activeAlternative?.id;
  if (!displayedAlternativeId) {
    return stopWithoutInsight(
      pack,
      {
        ...withoutInsight,
        rejected: [...new Set([...session.rejected, insight.hypothesisId])],
        rejectedDirections: [...new Set([...session.rejectedDirections, insight.hypothesisId])],
        rejectedInterpretations: [...session.rejectedInterpretations, rejectedInterpretation],
        correctionRound: nextRound,
      },
      "both_directions_rejected",
    );
  }
  const reconsidered = rejectCurrentPrimary(
    pack,
    withoutInsight,
    signalId,
    displayedAlternativeId,
  );
  const withRejection: Session = {
    ...reconsidered,
    rejectedInterpretations: [...session.rejectedInterpretations, rejectedInterpretation],
    correctionRound: nextRound,
  };
  if (withRejection.state === "NO_VALID_INSIGHT") return withRejection;
  if (response === "prefer_alternative") return evaluateRecognition(pack, withRejection);
  if (nextRound >= 2 || !withRejection.primary) {
    return stopWithoutInsight(pack, withRejection, "both_directions_rejected");
  }
  return {
    ...withRejection,
    state: "GO_DEEPER",
    pendingCorrection: {
      rejectedInsightId: insight.id,
      rejectedHypothesisId: insight.hypothesisId,
      reconsideredHypothesisId: withRejection.primary.id,
      displayedAlternativeId,
      mode: "reconsider_alternative",
    },
  };
}

export function respondToInsight(
  pack: ScenarioPack,
  session: Session,
  response: InsightResponse,
  signalId: string,
): Session {
  if (response === "rejected" || response === "prefer_alternative" || response === "reject_both") {
    return rejectInsight(pack, session, response, signalId);
  }
  if (!session.insight || session.recognitionOutcome?.status !== "INSIGHT_ELIGIBLE") {
    throw new Error("There is no eligible Insight to respond to");
  }
  const insight: Insight = {
    ...session.insight,
    status: response === "strongly_endorsed" ? "endorsed" : "partial",
  };
  return {
    ...session,
    state: "CORRECT_AND_LEAVE",
    insight,
    recognitionOutcome: {
      status: "INSIGHT_ELIGIBLE",
      insight,
      gate: session.insightGate!,
    },
  };
}

export function completeCorrectionFollowup(
  pack: ScenarioPack,
  session: Session,
  response: CorrectionFollowupResponse,
  signalId: string,
): Session {
  if (!session.pendingCorrection) throw new Error("There is no pending correction follow-up");
  if (session.correctionRound >= 2) return stopWithoutInsight(pack, session, "both_directions_rejected");
  const base: Session = {
    ...session,
    correctionFollowupUsed: true,
    correctionRound: session.correctionRound + 1,
    pendingCorrection: undefined,
  };

  if (session.pendingCorrection.mode === "both_rejected") {
    return stopWithoutInsight(pack, base, "both_directions_rejected");
  }

  if (response === "still_not_fit") {
    if (!base.primary) return stopWithoutInsight(pack, base, "both_directions_rejected");
    const rejectedHypothesisId = base.primary.id;
    const reweighted = rejectCurrentPrimary(pack, base, signalId);
    return stopWithoutInsight(pack, {
      ...reweighted,
      rejectedInterpretations: [
        ...base.rejectedInterpretations,
        {
          insightId: `correction_candidate:${rejectedHypothesisId}`,
          hypothesisId: rejectedHypothesisId,
          response: "rejected",
          signalId,
        },
      ],
    }, "both_directions_rejected");
  }

  const confirmationSignal: Signal = {
    id: signalId,
    source: "confirmation",
    evidenceFamily: "user_correction",
    key: "correction_followup",
    value: "reconsidered_fits",
    semanticKey: "reconsidered_interpretation_confirmed",
  };
  return evaluateRecognition(pack, {
    ...base,
    signals: [...base.signals, confirmationSignal],
  });
}

export function insightFingerprint(session: Session): InsightFingerprint {
  return {
    ruleVersion: session.reasoningRuleVersion,
    scenarioPackId: session.scenarioPackId,
    gateEligible: session.insightGate?.eligible,
    failedChecks: [...(session.insightGate?.failedChecks ?? [])].sort(),
    outcome: session.recognitionOutcome?.status,
    underlyingHypothesisId: session.insightGate?.underlyingHypothesisId,
    insightId: session.insight?.id,
  };
}
