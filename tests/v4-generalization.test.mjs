import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getDiscriminatorOutcomeSignatures,
  normalizeInteractionSignal,
  recordInteraction,
} from "../app/v4-core/core/reasoning-engine.ts";
import {
  answerCorrectionFollowup,
  answerJourneyInteraction,
  answerRecognition,
  continueFromFirstAgentMoment,
  continueFromRevision,
  createJourneySession,
  enterJourney,
  requestRecognition,
} from "../app/v4-core/journey/journey-machine.ts";
import { importantChoicePack } from "../app/v4-core/packs/important-choice.ts";
import { scenarioPacks } from "../app/v4-core/packs/registry.ts";
import { uncertainOutcomePack } from "../app/v4-core/packs/uncertain-outcome.ts";
import { deriveSpatialReasoningView } from "../app/v4-core/spatial/spatial-state.ts";

function reachChoicePair(sessionId = "choice-pair") {
  let session = createJourneySession(importantChoicePack, sessionId);
  session = enterJourney(session);
  session = answerJourneyInteraction(
    importantChoicePack,
    session,
    "established_foundation",
    `${sessionId}:loss`,
  );
  session = answerJourneyInteraction(
    importantChoicePack,
    session,
    "still_hard_if_reversible",
    `${sessionId}:relief`,
  );
  session = answerJourneyInteraction(
    importantChoicePack,
    session,
    "self_decided_matters",
    `${sessionId}:ownership`,
  );
  assert.equal(session.state, "FIRST_AGENT_MOMENT");
  assert.equal(session.primary?.id, "stability");
  assert.equal(session.activeAlternative?.id, "autonomy");
  assert.equal(session.activeDiscriminator?.id, "stability_vs_autonomy");
  return session;
}

function answerChoiceDiscriminator(optionId, sessionId) {
  const pair = reachChoicePair(sessionId);
  const exploring = continueFromFirstAgentMoment(pair);
  return answerJourneyInteraction(
    importantChoicePack,
    exploring,
    optionId,
    `${sessionId}:discriminator`,
  );
}

function recognizeChoice(optionId, sessionId) {
  const revision = answerChoiceDiscriminator(optionId, sessionId);
  return requestRecognition(importantChoicePack, continueFromRevision(revision));
}

test("P2 formation uses three independent families and preserves a real A/B competition", () => {
  const session = reachChoicePair("choice-formation");
  assert.deepEqual(session.formationGate.evidenceFamilies, ["choice_loss", "ownership", "relief_test"]);
  assert.equal(session.hypothesisPairFormed, true);
  const early = importantChoicePack.interactions
    .find((interaction) => interaction.id === "choice_loss")
    ?.options.find((option) => option.id === "established_foundation");
  assert.ok(early);
  assert.ok(early.effects.filter((effect) => effect.weight > 0).length >= 2);
});

test("P2-A Interpretation Holds — stability remains primary", () => {
  const revision = answerChoiceDiscriminator("known_position_still_matters", "choice-holds");
  assert.equal(revision.lastRevision?.type, "strengthened");
  assert.equal(revision.primary?.id, "stability");
  assert.equal(deriveSpatialReasoningView(revision).state, "A_DOMINANT");
});

test("P2-B Primary Switch — removing the stability difference promotes autonomy", () => {
  const revision = answerChoiceDiscriminator("own_direction_emerges", "choice-switch");
  assert.equal(revision.lastRevision?.type, "primary_switch");
  assert.equal(revision.lastRevision?.previousPrimary, "stability");
  assert.equal(revision.lastRevision?.newPrimary, "autonomy");
  assert.equal(revision.primary?.id, "autonomy");
  assert.equal(revision.activeAlternative?.id, "stability");
  assert.equal(deriveSpatialReasoningView(revision).state, "B_DOMINANT");
});

test("P2-C Both Weakened — neither proposed direction remains viable", () => {
  const revision = answerChoiceDiscriminator("neither_is_key", "choice-both-weakened");
  assert.equal(revision.lastRevision?.type, "both_weakened");
  assert.equal(revision.primary, undefined);
  assert.equal(revision.activeAlternative, undefined);
  assert.equal(deriveSpatialReasoningView(revision).state, "BOTH_WEAKENED");
});

test("P2-D Valid Insight — multi-source, alternative-tested and context-bound", () => {
  const recognition = recognizeChoice("own_direction_emerges", "choice-valid-insight");
  assert.equal(recognition.state, "RECOGNITION");
  assert.equal(recognition.recognitionOutcome?.status, "INSIGHT_ELIGIBLE");
  assert.equal(recognition.insight?.hypothesisId, "autonomy");
  assert.ok((recognition.insight?.evidenceFamilies.length ?? 0) >= 2);
  assert.equal(recognition.insight?.alternativeTested, true);
  assert.equal(recognition.insight?.contextReferenceId, recognition.lifeContext.referenceId);
  assert.doesNotMatch(recognition.insight?.statement ?? "", /应该选|更适合|核心价值|早就知道答案/);
});

test("P2-E No Insight — both weakened reaches an open question", () => {
  const revision = answerChoiceDiscriminator("neither_is_key", "choice-no-insight");
  const unresolved = requestRecognition(importantChoicePack, continueFromRevision(revision));
  assert.equal(unresolved.state, "NO_VALID_INSIGHT");
  assert.equal(unresolved.recognitionOutcome?.status, "NO_VALID_INSIGHT");
  assert.equal(unresolved.noValidReason, "both_weakened");
  assert.equal(
    unresolved.openQuestion,
    "如果安心和自己做决定都只说中了一部分，真正还拉住你的是什么？",
  );
  assert.doesNotMatch(unresolved.openQuestion ?? "", /后悔/);
  assert.equal(deriveSpatialReasoningView(unresolved).state, "OPEN");
});

test("NO_VALID_INSIGHT copy is bounded to the candidate pair actually formed and tested", () => {
  let session = enterJourney(createJourneySession(importantChoicePack, "choice-pair-bounded-copy"));
  session = answerJourneyInteraction(importantChoicePack, session, "important_expectations", "bounded:loss");
  session = answerJourneyInteraction(importantChoicePack, session, "preference_gets_clearer", "bounded:relief");
  session = answerJourneyInteraction(importantChoicePack, session, "others_expected_matters", "bounded:ownership");
  assert.deepEqual(session.presentedPair, {
    primaryId: "external_expectation",
    alternativeId: "internal_preference",
  });
  session = continueFromFirstAgentMoment(session);
  session = answerJourneyInteraction(
    importantChoicePack,
    session,
    "private_choice_another_factor",
    "bounded:discriminator",
  );
  const unresolved = requestRecognition(importantChoicePack, continueFromRevision(session));
  assert.equal(unresolved.state, "NO_VALID_INSIGHT");
  assert.equal(
    unresolved.openQuestion,
    "如果重要的人的期待和你自己的倾向都只说中了一部分，真正还拉住你的是什么？",
  );
  assert.doesNotMatch(unresolved.openQuestion ?? "", /安心|稳定|后悔/);
});

test("NO_VALID_INSIGHT before pair formation uses neutral copy without injecting candidates", () => {
  let session = enterJourney(createJourneySession(importantChoicePack, "choice-neutral-open-question"));
  session = answerJourneyInteraction(importantChoicePack, session, "choice_loss_abstain", "neutral:loss");
  session = answerJourneyInteraction(importantChoicePack, session, "reversibility_abstain", "neutral:relief");
  assert.equal(session.state, "NO_VALID_INSIGHT");
  assert.equal(session.presentedPair, undefined);
  assert.equal(session.openQuestion, "这次收集到的线索之外，真正还拉住你的可能是什么？");
  assert.doesNotMatch(session.openQuestion ?? "", /安心|稳定|自己做决定|期待|倾向|后悔/);
});

test("V4 cross-site brand navigation does not enable RSC Link prefetch", async () => {
  const source = await readFile(new URL("../app/v4-core/V4CoreJourney.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /from\s+["']next\/link["']/);
  assert.match(source, /<a className=\{styles\.brand\} href="\/"/);
});

test("P2-F Reject → Revised — rejection weakens A and one follow-up can recognize B", () => {
  const recognition = recognizeChoice("own_direction_emerges", "choice-reject-revised");
  const rejected = answerRecognition(
    importantChoicePack,
    recognition,
    "rejected",
    "choice-reject-revised:reject",
  );
  assert.equal(rejected.state, "GO_DEEPER");
  assert.equal(rejected.pendingCorrection?.reconsideredHypothesisId, "stability");
  assert.equal(deriveSpatialReasoningView(rejected).state, "B_REJECTED");
  const revised = answerCorrectionFollowup(
    importantChoicePack,
    rejected,
    "reconsidered_fits",
    "choice-reject-revised:fits",
  );
  assert.equal(revised.state, "RECOGNITION");
  assert.equal(revised.insight?.hypothesisId, "stability");
  assert.equal(revised.correctionFollowupUsed, true);
});

test("P2-G Reject → Unresolved — the second rejection stops inference", () => {
  const recognition = recognizeChoice("own_direction_emerges", "choice-reject-unresolved");
  const rejected = answerRecognition(
    importantChoicePack,
    recognition,
    "rejected",
    "choice-reject-unresolved:reject",
  );
  const unresolved = answerCorrectionFollowup(
    importantChoicePack,
    rejected,
    "still_not_fit",
    "choice-reject-unresolved:reject-again",
  );
  assert.equal(unresolved.state, "NO_VALID_INSIGHT");
  assert.equal(unresolved.noValidReason, "both_directions_rejected");
  assert.equal(unresolved.correctionRound, 2);
  assert.equal(deriveSpatialReasoningView(unresolved).state, "OPEN");
});

test("P2-H Abstain — two refusals stop without a forced pair or conclusion", () => {
  let session = enterJourney(createJourneySession(importantChoicePack, "choice-abstain"));
  session = answerJourneyInteraction(
    importantChoicePack,
    session,
    "choice_loss_abstain",
    "choice-abstain:loss",
  );
  session = answerJourneyInteraction(
    importantChoicePack,
    session,
    "reversibility_abstain",
    "choice-abstain:relief",
  );
  assert.equal(session.state, "NO_VALID_INSIGHT");
  assert.equal(session.hypothesisPairFormed, false);
  assert.equal(session.insight, undefined);
});

test("both Pack 02 discriminators pass the counterfactual signature test", () => {
  const stabilityPair = reachChoicePair("choice-counterfactual-a");
  const first = importantChoicePack.discriminators.find((item) => item.id === "stability_vs_autonomy");
  assert.ok(first);
  assert.deepEqual(
    new Set(getDiscriminatorOutcomeSignatures(importantChoicePack, stabilityPair, first)),
    new Set(["autonomy|stability", "stability|autonomy", "none|none"]),
  );

  let expectationPair = enterJourney(createJourneySession(importantChoicePack, "choice-counterfactual-b"));
  expectationPair = answerJourneyInteraction(importantChoicePack, expectationPair, "important_expectations", "expectation:loss");
  expectationPair = answerJourneyInteraction(importantChoicePack, expectationPair, "preference_gets_clearer", "expectation:relief");
  expectationPair = answerJourneyInteraction(importantChoicePack, expectationPair, "others_expected_matters", "expectation:ownership");
  assert.equal(expectationPair.primary?.id, "external_expectation");
  assert.equal(expectationPair.activeAlternative?.id, "internal_preference");
  const second = importantChoicePack.discriminators.find((item) => item.id === "expectation_vs_preference");
  assert.ok(second);
  assert.ok(new Set(getDiscriminatorOutcomeSignatures(importantChoicePack, expectationPair, second)).size >= 2);
});

test("X01-X05 — both packs share the same engines, Journey and spatial grammar", async () => {
  const packOneSource = await readFile(new URL("../app/v4-core/packs/uncertain-outcome.ts", import.meta.url), "utf8");
  const packTwoSource = await readFile(new URL("../app/v4-core/packs/important-choice.ts", import.meta.url), "utf8");
  for (const source of [packOneSource, packTwoSource]) {
    assert.doesNotMatch(source, /function\s+(score|formation|revision|insightGate|spatial|journey)/i);
  }
  assert.equal(scenarioPacks.length, 2);
  const packTwoSwitch = answerChoiceDiscriminator("own_direction_emerges", "choice-spatial-shared");
  assert.equal(deriveSpatialReasoningView(packTwoSwitch).state, "B_DOMINANT");
});

test("X06-X08 — sessions, context references and taxonomies remain isolated", () => {
  const first = createJourneySession(uncertainOutcomePack, "same-session-name");
  const second = createJourneySession(importantChoicePack, "same-session-name");
  assert.notEqual(first.lifeContext.referenceId, second.lifeContext.referenceId);
  assert.notEqual(first.lifeContext.scenarioId, second.lifeContext.scenarioId);
  assert.throws(
    () => normalizeInteractionSignal(importantChoicePack, "context_delay", "waiting_longer", "wrong-pack-signal"),
    /Unknown interaction/,
  );
  assert.throws(
    () => recordInteraction(importantChoicePack, first, "choice_loss", "established_foundation", "cross-pack"),
    /does not match session/,
  );
  assert.equal(first.signals.length, 0);
  assert.equal(second.signals.length, 0);
});

test("Pack 02 stays within the interaction budget and contains no recommendation language", () => {
  const revision = answerChoiceDiscriminator("own_direction_emerges", "choice-budget");
  assert.ok(revision.explorationActionCount <= 8);
  const visibleCopy = [
    importantChoicePack.entry.title,
    importantChoicePack.entry.support,
    ...importantChoicePack.hypotheses.map((item) => item.statement),
    ...importantChoicePack.insightRules.map((item) => item.statement),
  ].join("\n");
  assert.doesNotMatch(visibleCopy, /你应该选|更适合.*工作|核心价值是|容易后悔的人|一直在为别人活|早就知道答案/);
});
