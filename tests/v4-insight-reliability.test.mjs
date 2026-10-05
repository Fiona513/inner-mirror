import assert from "node:assert/strict";
import test from "node:test";

import {
  buildInsightCandidate,
  completeCorrectionFollowup,
  evaluateInsightGate,
  evaluateRecognition,
  insightFingerprint,
  respondToInsight,
} from "../app/v4-core/core/insight-engine.ts";
import {
  createCoreSession,
  recordInteraction,
  rejectCurrentPrimary,
} from "../app/v4-core/core/reasoning-engine.ts";
import { uncertainOutcomePack } from "../app/v4-core/packs/uncertain-outcome.ts";

function formInitialPair(sessionId = "insight-session") {
  let session = createCoreSession(uncertainOutcomePack, sessionId);
  session = recordInteraction(uncertainOutcomePack, session, "context_delay", "waiting_longer", "signal-context");
  session = recordInteraction(uncertainOutcomePack, session, "clarify_focus", "outcome_unknown", "signal-focus");
  return session;
}

function testDiscriminator(
  optionId,
  signalId = `signal-${optionId}`,
  sessionId = "insight-session",
) {
  return recordInteraction(
    uncertainOutcomePack,
    formInitialPair(sessionId),
    "result_arrives_counterfactual",
    optionId,
    signalId,
  );
}

test("A — Paraphrase Block rejects a direct restatement", () => {
  const session = {
    ...testDiscriminator("relief_even_if_bad", "paraphrase-history"),
    signals: [
      ...testDiscriminator("relief_even_if_bad", "paraphrase-history").signals,
      {
        id: "tired",
        source: "choice",
        evidenceFamily: "current_state",
        key: "state",
        value: "我很累",
        semanticKey: "fatigue",
      },
      {
        id: "rest",
        source: "comparison",
        evidenceFamily: "current_need",
        key: "need",
        value: "我想休息",
        semanticKey: "need_rest",
      },
    ],
  };
  const gate = evaluateInsightGate(uncertainOutcomePack, session, {
    id: "paraphrase-rest",
    hypothesisId: "uncertainty",
    statement: "你现在需要休息",
    semanticKey: "need_rest",
    cognitiveGainKey: "need_rest",
    sourceSignalIds: ["tired", "rest"],
    evidenceFamilies: ["current_need", "current_state"],
    alternativeTested: false,
    contextScenarioId: "uncertain_outcome",
    contextReferenceId: session.lifeContext.referenceId,
    inferenceDepth: 0,
    correctionOptions: ["strongly_endorsed", "partially_endorsed", "rejected", "prefer_alternative", "reject_both"],
    status: "candidate",
  });
  assert.equal(gate.eligible, false);
  assert.equal(gate.checks.non_paraphrase, false);
  assert.deepEqual(gate.failedChecks, ["non_paraphrase"]);
});

test("B — Valid Cognitive Gain passes all six gates after a real discriminator", () => {
  const reasoned = testDiscriminator("harder_if_i_was_wrong", "signal-valid-switch");
  const recognized = evaluateRecognition(uncertainOutcomePack, reasoned);
  assert.equal(recognized.primary?.id, "fear_of_error");
  assert.equal(recognized.recognitionOutcome?.status, "INSIGHT_ELIGIBLE");
  assert.equal(recognized.insight?.id, "insight_error_self_trust");
  assert.deepEqual(recognized.insight?.evidenceFamilies, ["counterfactual_result", "distress_focus"]);
  assert.equal(recognized.insightGate?.eligible, true);
  assert.ok(Object.values(recognized.insightGate?.checks ?? {}).every(Boolean));

  const endorsed = respondToInsight(
    uncertainOutcomePack,
    recognized,
    "strongly_endorsed",
    "signal-endorse",
  );
  assert.equal(endorsed.insight?.status, "endorsed");
});

test("C — Alternative Not Tested blocks recognition despite sufficient Primary support", () => {
  const recognized = evaluateRecognition(uncertainOutcomePack, formInitialPair());
  assert.equal(recognized.primary, undefined);
  assert.equal(recognized.insightGate?.underlyingHypothesisId, "uncertainty");
  assert.equal(recognized.recognitionOutcome?.status, "NO_VALID_INSIGHT");
  assert.equal(recognized.insightGate?.checks.multi_source, true);
  assert.equal(recognized.insightGate?.checks.alternative_tested, false);
  assert.equal(recognized.insight, undefined);
});

test("C2 — Rejection Is Not Positive Evidence", () => {
  const before = formInitialPair("reject-is-not-evidence");
  const alternativeBefore = before.activeAlternative;
  assert.equal(alternativeBefore?.id, "fear_of_error");
  assert.deepEqual(alternativeBefore?.supportingSignalIds, ["signal-focus"]);

  const after = rejectCurrentPrimary(
    uncertainOutcomePack,
    before,
    "signal-rejection-is-not-support",
  );
  assert.equal(after.primary?.id, "fear_of_error");
  assert.deepEqual(after.primary?.supportingSignalIds, alternativeBefore?.supportingSignalIds);
  assert.equal(
    after.primary?.supportingSignalIds.includes("signal-rejection-is-not-support"),
    false,
  );

  const recognition = evaluateRecognition(uncertainOutcomePack, after);
  assert.equal(recognition.insightGate?.checks.multi_source, false);
  assert.equal(recognition.insightGate?.checks.alternative_tested, false);
  assert.equal(recognition.recognitionOutcome?.status, "NO_VALID_INSIGHT");
  assert.equal(recognition.insight, undefined);
});

test("D — a weakened candidate remains Tested/Historical but is not an Active Alternative", () => {
  const reasoned = testDiscriminator("relief_even_if_bad", "signal-historical-alternative");
  assert.equal(reasoned.primary?.id, "uncertainty");
  assert.equal(reasoned.activeAlternative, undefined);
  assert.equal(reasoned.testedAlternatives.length, 1);
  assert.equal(reasoned.testedAlternatives[0].hypothesisId, "fear_of_error");
  assert.equal(reasoned.testedAlternatives[0].statusAfterTest, "weakened");
  assert.equal(reasoned.testedAlternatives[0].activeAfterTest, false);

  const recognized = evaluateRecognition(uncertainOutcomePack, reasoned);
  assert.equal(recognized.insight?.alternativeTested, true);
  assert.equal(recognized.insightGate?.checks.alternative_tested, true);
  assert.equal(recognized.recognitionOutcome?.status, "INSIGHT_ELIGIBLE");
});

test("E — No Valid Insight is a normal outcome for both-weakened and insufficient evidence", () => {
  const bothWeakened = evaluateRecognition(
    uncertainOutcomePack,
    testDiscriminator("neither_changes", "signal-no-valid"),
  );
  assert.equal(bothWeakened.primary, undefined);
  assert.equal(bothWeakened.recognitionOutcome?.status, "NO_VALID_INSIGHT");
  assert.equal(bothWeakened.insight, undefined);
  assert.equal(bothWeakened.openQuestion, uncertainOutcomePack.openQuestion);

  const insufficient = evaluateRecognition(
    uncertainOutcomePack,
    createCoreSession(uncertainOutcomePack, "insufficient"),
  );
  assert.equal(insufficient.recognitionOutcome?.status, "NO_VALID_INSIGHT");
  assert.equal(insufficient.openQuestion, uncertainOutcomePack.openQuestion);
});

test("F1 — Reject Recovery removes Insight A and yields revised Insight B after one follow-up", () => {
  const recognizedA = evaluateRecognition(
    uncertainOutcomePack,
    testDiscriminator("harder_if_i_was_wrong", "signal-reject-revised"),
  );
  const explorationCount = recognizedA.explorationActionCount;
  assert.equal(recognizedA.insight?.hypothesisId, "fear_of_error");

  const rejected = respondToInsight(
    uncertainOutcomePack,
    recognizedA,
    "rejected",
    "signal-reject-insight-a",
  );
  assert.equal(rejected.insight, undefined);
  assert.equal(rejected.primary?.id, "uncertainty");
  assert.equal(rejected.pendingCorrection?.reconsideredHypothesisId, "uncertainty");
  assert.ok(rejected.rejected.includes("fear_of_error"));
  assert.equal(rejected.rejectedInterpretations.at(-1)?.insightId, "insight_error_self_trust");
  assert.equal(rejected.explorationActionCount, explorationCount);

  const revised = completeCorrectionFollowup(
    uncertainOutcomePack,
    rejected,
    "reconsidered_fits",
    "signal-correction-followup",
  );
  assert.equal(revised.correctionFollowupUsed, true);
  assert.equal(revised.insight?.hypothesisId, "uncertainty");
  assert.equal(revised.insight?.id, "insight_uncertainty_attention");
  assert.equal(revised.recognitionOutcome?.status, "INSIGHT_ELIGIBLE");
  assert.equal(revised.explorationActionCount, explorationCount);
  const stopped = completeCorrectionFollowup(
    uncertainOutcomePack,
    { ...revised, pendingCorrection: rejected.pendingCorrection },
    "reconsidered_fits",
    "second-followup",
  );
  assert.equal(stopped.state, "NO_VALID_INSIGHT");
});

test("F2 — Reject Recovery can end unresolved and never restores the rejected Insight", () => {
  const recognizedA = evaluateRecognition(
    uncertainOutcomePack,
    testDiscriminator("harder_if_i_was_wrong", "signal-reject-unresolved"),
  );
  const switchedToDisplayedAlternative = respondToInsight(
    uncertainOutcomePack,
    recognizedA,
    "prefer_alternative",
    "signal-prefer-alternative",
  );
  assert.equal(switchedToDisplayedAlternative.state, "RECOGNITION");
  assert.equal(switchedToDisplayedAlternative.primary?.id, "uncertainty");
  const unresolved = respondToInsight(
    uncertainOutcomePack,
    switchedToDisplayedAlternative,
    "rejected",
    "signal-recovery-unresolved",
  );
  assert.equal(unresolved.correctionRound, 2);
  assert.equal(unresolved.recognitionOutcome?.status, "NO_VALID_INSIGHT");
  assert.equal(unresolved.insight, undefined);
  assert.equal(unresolved.openQuestion, uncertainOutcomePack.openQuestion);
  assert.ok(unresolved.rejected.includes("fear_of_error"));
  assert.ok(unresolved.rejected.includes("uncertainty"));
  assert.equal(unresolved.explorationActionCount, recognizedA.explorationActionCount);
});

test("G — identical structured inputs produce identical Insight fingerprints", () => {
  const run = () => evaluateRecognition(
    uncertainOutcomePack,
    testDiscriminator("harder_if_i_was_wrong", "stable-insight-signal"),
  );
  assert.deepEqual(insightFingerprint(run()), insightFingerprint(run()));
});

test("H — later authoritative evidence replaces stronger old evidence in the same family", () => {
  let session = createCoreSession(uncertainOutcomePack, "authority");
  session = recordInteraction(uncertainOutcomePack, session, "context_delay", "waiting_longer", "old-strong-signal");
  session = recordInteraction(uncertainOutcomePack, session, "context_delay", "timeline_keeps_moving", "new-authoritative-signal");
  session = recordInteraction(uncertainOutcomePack, session, "clarify_focus", "outcome_unknown", "independent-signal");
  assert.equal(session.signals.some((signal) => signal.id === "old-strong-signal"), false);
  assert.equal(session.signals.some((signal) => signal.id === "new-authoritative-signal"), true);
  assert.equal(session.primary?.supportingSignalIds.includes("old-strong-signal"), false);
  assert.equal(session.primary?.supportingSignalIds.includes("new-authoritative-signal"), true);
});

test("G4/G5 — context escape and deeper-than-one-layer metadata are blocked", () => {
  const session = testDiscriminator("harder_if_i_was_wrong", "signal-scope-test");
  const candidate = buildInsightCandidate(uncertainOutcomePack, session);
  assert.ok(candidate);
  const outOfContext = evaluateInsightGate(
    uncertainOutcomePack,
    session,
    { ...candidate, contextScenarioId: "lifetime_personality" },
  );
  const tooDeep = evaluateInsightGate(
    uncertainOutcomePack,
    session,
    { ...candidate, inferenceDepth: 2 },
  );
  assert.equal(outOfContext.checks.context_bound, false);
  assert.equal(outOfContext.eligible, false);
  assert.equal(tooDeep.checks.one_layer, false);
  assert.equal(tooDeep.eligible, false);
});

test("G4 — same Pack cannot share Insight across different Life Context references", () => {
  const contextA = testDiscriminator(
    "harder_if_i_was_wrong",
    "shared-context-discriminator",
    "real-event-a",
  );
  const contextB = testDiscriminator(
    "harder_if_i_was_wrong",
    "shared-context-discriminator",
    "real-event-b",
  );
  const insightFromA = buildInsightCandidate(uncertainOutcomePack, contextA);
  assert.ok(insightFromA);
  assert.equal(contextA.lifeContext.scenarioId, contextB.lifeContext.scenarioId);
  assert.notEqual(contextA.lifeContext.referenceId, contextB.lifeContext.referenceId);

  const crossContextGate = evaluateInsightGate(
    uncertainOutcomePack,
    contextB,
    insightFromA,
  );
  assert.equal(crossContextGate.checks.context_bound, false);
  assert.deepEqual(crossContextGate.failedChecks, ["context_bound"]);
  assert.equal(crossContextGate.eligible, false);
});
