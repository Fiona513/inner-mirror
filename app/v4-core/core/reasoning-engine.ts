import {
  REASONING_RULE_VERSION,
  type Discriminator,
  type FormationGateResult,
  type Hypothesis,
  type InsightGateCheck,
  type InsightGateResult,
  type NoValidReason,
  type ReasoningFingerprint,
  type Revision,
  type Session,
  type Signal,
  type TestedAlternative,
} from "./types.ts";
import {
  resolveNoValidCopy,
  type EvidenceEffect,
  type InteractionDefinition,
  type ScenarioPack,
} from "../packs/types.ts";

export const MAX_EXPLORATION_ACTIONS = 8;

type CandidateEvaluation = {
  hypothesis: Hypothesis;
  score: number;
  order: number;
};

type LogicalOutcome = {
  candidates: CandidateEvaluation[];
  formationGate: FormationGateResult;
  primary?: Hypothesis;
  activeAlternative?: Hypothesis;
};

function assertEvidencePolicy(pack: ScenarioPack) {
  if (pack.evidencePolicy.mode !== "single_current_signal_per_family") {
    throw new Error(`Unsupported evidence policy: ${pack.evidencePolicy.mode}`);
  }
  const families = pack.interactions.map((interaction) => interaction.evidenceFamily);
  if (new Set(families).size !== families.length) {
    throw new Error("Each evidence family must have exactly one mutually exclusive interaction");
  }
}

function stableValue(value: Signal["value"]): string {
  return Array.isArray(value) ? JSON.stringify([...value].sort()) : String(value);
}

function interactionFor(pack: ScenarioPack, interactionId: string): InteractionDefinition {
  const interaction = pack.interactions.find((item) => item.id === interactionId);
  if (!interaction) throw new Error(`Unknown interaction: ${interactionId}`);
  return interaction;
}

function effectsForSignal(pack: ScenarioPack, signal: Signal): EvidenceEffect[] {
  if (signal.source === "confirmation") return [];
  const interaction = pack.interactions.find((item) => item.key === signal.key);
  if (!interaction) return [];
  if (interaction.source !== signal.source || interaction.evidenceFamily !== signal.evidenceFamily) return [];
  if (signal.abstained) return [];
  if (Array.isArray(signal.value)) {
    const positionWeights = [1, 0.6, 0.3, 0.1, 0];
    return signal.value.flatMap((optionId, index) => {
      const option = interaction.options.find((item) => item.id === optionId);
      const multiplier = positionWeights[index] ?? 0;
      return (option?.effects ?? []).map((effect) => ({
        ...effect,
        weight: effect.weight * multiplier,
      }));
    });
  }
  return interaction.options.find((option) => option.id === stableValue(signal.value))?.effects ?? [];
}

export function normalizeInteractionSignal(
  pack: ScenarioPack,
  interactionId: string,
  optionId: string,
  signalId: string,
): Signal {
  const interaction = interactionFor(pack, interactionId);
  const option = interaction.options.find((item) => item.id === optionId);
  if (!option) throw new Error(`Unknown option ${optionId} for interaction ${interactionId}`);
  if (!signalId.trim()) throw new Error("Signal id is required");
  return {
    id: signalId,
    source: interaction.source,
    evidenceFamily: interaction.evidenceFamily,
    key: interaction.key,
    value: option.id,
    semanticKey: option.semanticKey ?? option.id,
    abstained: option.isAbstain === true,
  };
}

export function normalizeRankingSignal(
  pack: ScenarioPack,
  interactionId: string,
  orderedOptionIds: string[],
  signalId: string,
): Signal {
  const interaction = interactionFor(pack, interactionId);
  if (interaction.kind !== "ranking") throw new Error(`${interactionId} is not a ranking interaction`);
  const rankableIds = interaction.options.filter((item) => !item.isAbstain).map((item) => item.id);
  if (
    orderedOptionIds.length < 2
    || orderedOptionIds.length > rankableIds.length
    || new Set(orderedOptionIds).size !== orderedOptionIds.length
    || orderedOptionIds.some((id) => !rankableIds.includes(id))
  ) {
    throw new Error(`Invalid ranking for ${interactionId}`);
  }
  if (!signalId.trim()) throw new Error("Signal id is required");
  return {
    id: signalId,
    source: interaction.source,
    evidenceFamily: interaction.evidenceFamily,
    key: interaction.key,
    value: [...orderedOptionIds],
    semanticKey: `ranked:${orderedOptionIds.join(">")}`,
    abstained: false,
  };
}

function strongestContributionByFamily(
  pack: ScenarioPack,
  signals: Signal[],
  hypothesisId: string,
) {
  const byFamily = new Map<string, { signal: Signal; weight: number }>();
  for (const signal of signals) {
    const weight = effectsForSignal(pack, signal)
      .filter((effect) => effect.hypothesisId === hypothesisId)
      .reduce((sum, effect) => sum + effect.weight, 0);
    if (!weight) continue;
    const current = byFamily.get(signal.evidenceFamily);
    if (!current || Math.abs(weight) > Math.abs(current.weight)) {
      byFamily.set(signal.evidenceFamily, { signal, weight });
    }
  }
  return [...byFamily.values()];
}

function evaluateCandidates(pack: ScenarioPack, signals: Signal[], rejected: string[]) {
  const rejectedSet = new Set(rejected);
  return pack.hypotheses
    .map((rule): CandidateEvaluation => {
      const contributions = strongestContributionByFamily(pack, signals, rule.id);
      const score = contributions.reduce((sum, item) => sum + item.weight, 0);
      const status: Hypothesis["status"] = rejectedSet.has(rule.id)
        ? "rejected"
        : score >= pack.formation.supportedThreshold
          ? "supported"
          : score >= pack.formation.emergenceThreshold
            ? "emerging"
            : "weakened";
      return {
        score,
        order: rule.order,
        hypothesis: {
          id: rule.id,
          statement: rule.statement,
          supportingSignalIds: contributions.filter((item) => item.weight > 0).map((item) => item.signal.id),
          contradictingSignalIds: contributions.filter((item) => item.weight < 0).map((item) => item.signal.id),
          status,
        },
      };
    })
    .sort((a, b) => b.score - a.score || a.order - b.order);
}

function formationGate(
  pack: ScenarioPack,
  signals: Signal[],
  candidates: CandidateEvaluation[],
): FormationGateResult {
  const normalizedSignals = signals.filter((signal) => effectsForSignal(pack, signal).length > 0);
  const evidenceFamilies = [...new Set(normalizedSignals.map((signal) => signal.evidenceFamily))].sort();
  const eligibleCandidateIds = candidates
    .filter((item) => item.hypothesis.status === "emerging" || item.hypothesis.status === "supported")
    .map((item) => item.hypothesis.id);

  if (evidenceFamilies.length < pack.formation.minEvidenceFamilies) {
    return { eligible: false, evidenceFamilies, eligibleCandidateIds, reason: "needs_more_evidence_families" };
  }
  if (eligibleCandidateIds.length < pack.formation.minEligibleCandidates) {
    return {
      eligible: false,
      evidenceFamilies,
      eligibleCandidateIds,
      reason: eligibleCandidateIds.length === 0 ? "all_candidates_weakened" : "needs_second_supported_candidate",
    };
  }
  return { eligible: true, evidenceFamilies, eligibleCandidateIds, reason: "pair_formed" };
}

function logicalOutcome(
  pack: ScenarioPack,
  signals: Signal[],
  rejected: string[],
  pairWasPreviouslyFormed: boolean,
  candidateScope?: string[],
): LogicalOutcome {
  const candidates = evaluateCandidates(pack, signals, rejected);
  const gate = formationGate(pack, signals, candidates);
  const allowed = candidateScope ? new Set(candidateScope) : undefined;
  const viable = candidates.filter(
    (item) => (!allowed || allowed.has(item.hypothesis.id))
      && (item.hypothesis.status === "emerging" || item.hypothesis.status === "supported"),
  );
  const mayExposePair = gate.eligible || pairWasPreviouslyFormed;

  if (!mayExposePair || viable.length === 0) {
    return { candidates, formationGate: gate };
  }

  const primary = viable[0]?.hypothesis;
  const activeAlternative = viable.find((item) => item.hypothesis.id !== primary?.id)?.hypothesis;
  return { candidates, formationGate: gate, primary, activeAlternative };
}

function discriminatorMatches(discriminator: Discriminator, primaryId: string, alternativeId: string) {
  return (
    (discriminator.hypothesisA === primaryId && discriminator.hypothesisB === alternativeId)
    || (discriminator.hypothesisA === alternativeId && discriminator.hypothesisB === primaryId)
  );
}

export function getDiscriminatorOutcomeSignatures(
  pack: ScenarioPack,
  session: Session,
  discriminator: Discriminator,
) {
  const interaction = interactionFor(pack, discriminator.interactionId);
  return interaction.options.map((option) => {
    const signal = normalizeInteractionSignal(pack, interaction.id, option.id, `preview:${interaction.id}:${option.id}`);
    const signals = [...session.signals.filter((item) => item.key !== signal.key), signal];
    const outcome = logicalOutcome(
      pack,
      signals,
      session.rejected,
      true,
      [discriminator.hypothesisA, discriminator.hypothesisB],
    );
    return `${outcome.primary?.id ?? "none"}|${outcome.activeAlternative?.id ?? "none"}`;
  });
}

export function isDiscriminatorValid(
  pack: ScenarioPack,
  session: Session,
  discriminator: Discriminator,
) {
  const signatures = getDiscriminatorOutcomeSignatures(pack, session, discriminator);
  return new Set(signatures).size >= 2;
}

function selectDiscriminator(pack: ScenarioPack, session: Session) {
  if (!session.primary || !session.activeAlternative) return undefined;
  return pack.discriminators.find(
    (item) => !session.rejectedScenarios.includes(item.interactionId)
      && discriminatorMatches(item, session.primary!.id, session.activeAlternative!.id)
      && isDiscriminatorValid(pack, session, item),
  );
}

function withDiscriminatorTest(
  pack: ScenarioPack,
  previous: Session,
  next: Session,
  signal: Signal,
): Session {
  const interaction = pack.interactions.find((item) => item.key === signal.key);
  if (!interaction) return next;
  const discriminator = previous.activeDiscriminator
    ?? pack.discriminators.find(
      (item) => item.interactionId === interaction.id
        && previous.testedAlternatives.some((record) => record.discriminatorId === item.id),
    );
  if (!discriminator || discriminator.interactionId !== interaction.id || !previous.primary) return next;

  const pairIds = [discriminator.hypothesisA, discriminator.hypothesisB];
  if (!pairIds.includes(previous.primary.id)) return next;
  const alternativeBeforeId = pairIds.find((id) => id !== previous.primary?.id);
  if (!alternativeBeforeId) return next;
  const after = next.candidates.find((candidate) => candidate.id === alternativeBeforeId);
  if (!after) return next;

  const record: TestedAlternative = {
    id: `${discriminator.id}:${signal.id}`,
    hypothesisId: alternativeBeforeId,
    comparedWithHypothesisId: previous.primary.id,
    discriminatorId: discriminator.id,
    triggerSignalId: signal.id,
    outcome: !next.primary
      ? "both_weakened"
      : next.primary.id === previous.primary.id
        ? "primary_held"
        : "primary_switched",
    statusAfterTest: after.status,
    activeAfterTest: next.activeAlternative?.id === alternativeBeforeId,
  };
  return {
    ...next,
    testedAlternatives: [
      ...previous.testedAlternatives.filter((item) => item.discriminatorId !== discriminator.id),
      record,
    ],
  };
}

function revisionFromSignal(
  pack: ScenarioPack,
  previous: Session,
  next: Session,
  signal: Signal,
): Revision | undefined {
  if (!previous.primary) return undefined;
  if (!next.primary) {
    return {
      previousPrimary: previous.primary.id,
      previousAlternative: previous.activeAlternative?.id,
      triggerSignalIds: [signal.id],
      type: "both_weakened",
    };
  }
  if (previous.primary.id !== next.primary.id) {
    return {
      previousPrimary: previous.primary.id,
      previousAlternative: previous.activeAlternative?.id,
      newPrimary: next.primary.id,
      triggerSignalIds: [signal.id],
      type: "primary_switch",
    };
  }
  const strengthensPrimary = effectsForSignal(pack, signal)
    .some((effect) => effect.hypothesisId === next.primary?.id && effect.weight > 0);
  if (!strengthensPrimary) return undefined;
  return {
    previousPrimary: previous.primary.id,
    previousAlternative: previous.activeAlternative?.id,
    newPrimary: next.primary.id,
    triggerSignalIds: [signal.id],
    type: "strengthened",
  };
}

function withDerivedReasoning(
  pack: ScenarioPack,
  session: Session,
  triggerSignal?: Signal,
  candidateScope?: string[],
): Session {
  const outcome = logicalOutcome(
    pack,
    session.signals,
    session.rejected,
    session.hypothesisPairFormed,
    candidateScope,
  );
  const firstFormation = !session.hypothesisPairFormed && outcome.formationGate.eligible;
  const effectiveSignalCount = session.signals.filter((signal) => !signal.abstained && effectsForSignal(pack, signal).length).length;
  let next: Session = {
    ...session,
    candidates: outcome.candidates.map((item) => item.hypothesis),
    primary: outcome.primary,
    activeAlternative: outcome.activeAlternative,
    formationGate: outcome.formationGate,
    hypothesisPairFormed: session.hypothesisPairFormed || outcome.formationGate.eligible,
    presentedPair: outcome.primary && outcome.activeAlternative
      ? { primaryId: outcome.primary.id, alternativeId: outcome.activeAlternative.id }
      : session.presentedPair,
    activeDiscriminator: undefined,
    state: firstFormation
      ? "FIRST_AGENT_MOMENT"
      : effectiveSignalCount < 2
        ? "CLARIFY"
        : outcome.primary
          ? "EXPLORE"
          : "DIFFERENTIATE",
  };
  next = { ...next, activeDiscriminator: selectDiscriminator(pack, next) };
  if (!triggerSignal) return next;
  const revision = revisionFromSignal(pack, session, next, triggerSignal);
  if (!revision) return next;
  return {
    ...next,
    state: "REVISION",
    lastRevision: revision,
    revisions: [...session.revisions, revision],
  };
}

export function createCoreSession(
  pack: ScenarioPack,
  sessionId = "v4-core-session",
): Session {
  assertEvidencePolicy(pack);
  const emptyGate: FormationGateResult = {
    eligible: false,
    evidenceFamilies: [],
    eligibleCandidateIds: [],
    reason: "needs_more_evidence_families",
  };
  return {
    id: sessionId,
    scenarioPackId: pack.id,
    reasoningRuleVersion: REASONING_RULE_VERSION,
    state: "ENTER",
    lifeContext: {
      ...pack.lifeContext,
      referenceId: `${pack.id}:${sessionId}`,
    },
    signals: [],
    candidates: pack.hypotheses.map((item) => ({
      id: item.id,
      statement: item.statement,
      supportingSignalIds: [],
      contradictingSignalIds: [],
      status: "weakened",
    })),
    formationGate: emptyGate,
    hypothesisPairFormed: false,
    testedAlternatives: [],
    rejected: [],
    rejectedDirections: [],
    rejectedScenarios: [],
    rejectedInterpretations: [],
    revisions: [],
    explorationActionCount: 0,
    clarifyStepIndex: 0,
    consecutiveAbstainCount: 0,
    totalAbstainCount: 0,
    correctionRound: 0,
    correctionFollowupUsed: false,
  };
}

export function stopWithoutInsight(
  pack: ScenarioPack,
  session: Session,
  reason: NoValidReason,
  gateOverride?: InsightGateResult,
): Session {
  const noValidCopy = resolveNoValidCopy(pack, session.presentedPair);
  const failedChecks: InsightGateCheck[] = [
    "non_paraphrase",
    "multi_source",
    "alternative_tested",
    "context_bound",
    "one_layer",
    "user_correctable",
  ];
  const checks = Object.fromEntries(failedChecks.map((check) => [check, false])) as InsightGateResult["checks"];
  const gate: InsightGateResult = gateOverride ?? {
    eligible: false,
    checks,
    failedChecks,
    underlyingHypothesisId: session.primary?.id,
  };
  return {
    ...session,
    state: "NO_VALID_INSIGHT",
    primary: undefined,
    activeAlternative: undefined,
    activeDiscriminator: undefined,
    insight: undefined,
    insightGate: gate,
    recognitionOutcome: {
      status: "NO_VALID_INSIGHT",
      openQuestion: noValidCopy.openQuestion,
      gate,
      reason,
    },
    openQuestion: noValidCopy.openQuestion,
    pendingCorrection: undefined,
    noValidReason: reason,
  };
}

function recordNormalizedSignal(
  pack: ScenarioPack,
  session: Session,
  interactionId: string,
  signal: Signal,
): Session {
  if (session.state === "NO_VALID_INSIGHT" || session.state === "CORRECT_AND_LEAVE") {
    throw new Error(`Journey is already complete: ${session.state}`);
  }
  const replacesExisting = session.signals.some(
    (item) => item.source !== "confirmation" && item.evidenceFamily === signal.evidenceFamily,
  );
  if (!replacesExisting && session.explorationActionCount >= MAX_EXPLORATION_ACTIONS) {
    throw new Error("Exploration action budget exceeded");
  }

  const consecutiveAbstainCount = signal.abstained ? session.consecutiveAbstainCount + 1 : 0;
  const next: Session = {
    ...session,
    signals: [
      ...session.signals.filter(
        (item) => item.source === "confirmation" || item.evidenceFamily !== signal.evidenceFamily,
      ),
      signal,
    ],
    rejectedScenarios: signal.abstained
      ? [...new Set([...session.rejectedScenarios, interactionId])]
      : session.rejectedScenarios,
    consecutiveAbstainCount,
    totalAbstainCount: session.totalAbstainCount + (signal.abstained ? 1 : 0),
    explorationActionCount: session.explorationActionCount + (replacesExisting ? 0 : 1),
    lastRevision: undefined,
  };

  if (consecutiveAbstainCount >= 2) {
    return stopWithoutInsight(pack, next, "insufficient_signals");
  }

  const discriminator = session.activeDiscriminator?.interactionId === interactionId
    ? session.activeDiscriminator
    : undefined;
  const candidateScope = discriminator
    ? [discriminator.hypothesisA, discriminator.hypothesisB]
    : undefined;
  let derived = withDerivedReasoning(pack, next, signal, candidateScope);
  derived = withDiscriminatorTest(pack, session, derived, signal);

  if (discriminator && derived.lastRevision?.type === "both_weakened") {
    derived = {
      ...derived,
      rejectedDirections: [
        ...new Set([
          ...derived.rejectedDirections,
          discriminator.hypothesisA,
          discriminator.hypothesisB,
        ]),
      ],
      rejectedScenarios: [...new Set([...derived.rejectedScenarios, interactionId])],
    };
  }
  return derived;
}

export function recordInteraction(
  pack: ScenarioPack,
  session: Session,
  interactionId: string,
  optionId: string,
  signalId: string,
): Session {
  if (session.scenarioPackId !== pack.id) throw new Error("Scenario pack does not match session");
  const signal = normalizeInteractionSignal(pack, interactionId, optionId, signalId);
  return recordNormalizedSignal(pack, session, interactionId, signal);
}

export function recordRankingInteraction(
  pack: ScenarioPack,
  session: Session,
  interactionId: string,
  orderedOptionIds: string[],
  signalId: string,
): Session {
  if (session.scenarioPackId !== pack.id) throw new Error("Scenario pack does not match session");
  const signal = normalizeRankingSignal(pack, interactionId, orderedOptionIds, signalId);
  return recordNormalizedSignal(pack, session, interactionId, signal);
}

export function rejectCurrentPrimary(
  pack: ScenarioPack,
  session: Session,
  signalId: string,
  preferredAlternativeId = session.activeAlternative?.id,
): Session {
  if (!session.primary) throw new Error("There is no primary hypothesis to reject");
  const rejectedId = session.primary.id;
  if (preferredAlternativeId && preferredAlternativeId !== session.activeAlternative?.id) {
    throw new Error("Preferred alternative must be the alternative currently shown to the user");
  }
  const rejectionSignal: Signal = {
    id: signalId,
    source: "confirmation",
    evidenceFamily: "user_correction",
    key: "hypothesis_rejected",
    value: rejectedId,
    semanticKey: "hypothesis_rejected",
  };
  const base: Session = {
    ...session,
    signals: [...session.signals, rejectionSignal],
    rejected: [...new Set([...session.rejected, rejectedId])],
    rejectedDirections: [...new Set([...session.rejectedDirections, rejectedId])],
    lastRevision: undefined,
  };
  const candidateScope = preferredAlternativeId ? [rejectedId, preferredAlternativeId] : [rejectedId];
  const reasoned = withDerivedReasoning(pack, base, undefined, candidateScope);
  const preferred = preferredAlternativeId
    ? reasoned.candidates.find((candidate) => candidate.id === preferredAlternativeId)
    : undefined;
  if (!preferred || (preferred.status !== "emerging" && preferred.status !== "supported")) {
    return stopWithoutInsight(pack, reasoned, "insight_gate_failed");
  }
  const next: Session = {
    ...reasoned,
    primary: preferred,
    activeAlternative: undefined,
    activeDiscriminator: undefined,
  };
  const revision: Revision = {
    previousPrimary: rejectedId,
    previousAlternative: preferredAlternativeId,
    newPrimary: next.primary?.id,
    triggerSignalIds: [rejectionSignal.id],
    type: "user_rejection",
  };
  return {
    ...next,
    state: "REVISION",
    lastRevision: revision,
    revisions: [...session.revisions, revision],
  };
}

export function reasoningFingerprint(session: Session): ReasoningFingerprint {
  return {
    ruleVersion: session.reasoningRuleVersion,
    scenarioPackId: session.scenarioPackId,
    formationEligible: session.formationGate.eligible,
    evidenceFamilies: [...session.formationGate.evidenceFamilies].sort(),
    primary: session.primary ? { id: session.primary.id, status: session.primary.status } : undefined,
    activeAlternative: session.activeAlternative
      ? { id: session.activeAlternative.id, status: session.activeAlternative.status }
      : undefined,
    testedAlternativeIds: session.testedAlternatives.map((item) => item.id).sort(),
    discriminatorId: session.activeDiscriminator?.id,
    revisionType: session.lastRevision?.type,
  };
}
