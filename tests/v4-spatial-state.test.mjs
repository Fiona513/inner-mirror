import assert from "node:assert/strict";
import test from "node:test";

import {
  answerCorrectionFollowup,
  answerJourneyInteraction,
  answerJourneyRanking,
  answerRecognition,
  continueFromFirstAgentMoment,
  continueFromRevision,
  createJourneySession,
  enterJourney,
  requestRecognition,
} from "../app/v4-core/journey/journey-machine.ts";
import { deriveSpatialReasoningView } from "../app/v4-core/spatial/spatial-state.ts";
import { uncertainOutcomePack } from "../app/v4-core/packs/uncertain-outcome.ts";

const pack = uncertainOutcomePack;

function reachPair(sessionId) {
  let session = enterJourney(createJourneySession(pack, sessionId));
  session = answerJourneyInteraction(pack, session, "waiting_longer", `${sessionId}:context`);
  session = answerJourneyInteraction(pack, session, "outcome_unknown", `${sessionId}:focus`);
  return answerJourneyRanking(pack, session, ["certainty", "agency"], `${sessionId}:ranking`);
}

function reachRevision(optionId, sessionId) {
  let session = continueFromFirstAgentMoment(reachPair(sessionId));
  return answerJourneyInteraction(pack, session, optionId, `${sessionId}:discriminator`);
}

function reachRecognition(optionId, sessionId) {
  const revision = reachRevision(optionId, sessionId);
  return requestRecognition(pack, continueFromRevision(revision));
}

test("PAIR — the formed A/B pair maps to one continuous spatial pair", () => {
  const session = reachPair("spatial-pair");
  const view = deriveSpatialReasoningView(session);
  assert.equal(view.state, "PAIR");
  assert.equal(view.directionA.hypothesisId, session.presentedPair.primaryId);
  assert.equal(view.directionB.hypothesisId, session.presentedPair.alternativeId);
  assert.equal(view.directionA.status, "leading");
  assert.equal(view.directionB.status, "available");
  assert.equal(view.hasPair, true);
});

test("INTERPRETATION HOLDS — A stabilizes while B recedes", () => {
  const session = reachRevision("relief_even_if_bad", "spatial-holds");
  const view = deriveSpatialReasoningView(session);
  assert.equal(session.lastRevision.type, "strengthened");
  assert.equal(view.state, "A_DOMINANT");
  assert.equal(view.directionA.status, "dominant");
  assert.equal(view.directionB.status, "receded");
  assert.equal(view.triggerSignalId, "spatial-holds:discriminator");
});

test("PRIMARY SWITCH — the original B approaches and A recedes", () => {
  const session = reachRevision("harder_if_i_was_wrong", "spatial-switch");
  const view = deriveSpatialReasoningView(session);
  assert.equal(session.lastRevision.type, "primary_switch");
  assert.equal(session.primary.id, view.directionB.hypothesisId);
  assert.equal(view.state, "B_DOMINANT");
  assert.equal(view.directionA.status, "receded");
  assert.equal(view.directionB.status, "dominant");
});

test("BOTH WEAKENED — both directions recede without becoming an error state", () => {
  const revision = reachRevision("neither_changes", "spatial-both");
  const weakened = deriveSpatialReasoningView(revision);
  assert.equal(weakened.state, "BOTH_WEAKENED");
  assert.equal(weakened.directionA.status, "receded");
  assert.equal(weakened.directionB.status, "receded");

  const unresolved = requestRecognition(pack, continueFromRevision(revision));
  assert.equal(deriveSpatialReasoningView(unresolved).state, "OPEN");
});

test("RECOGNITION — one tested direction stabilizes and noise recedes", () => {
  const recognition = reachRecognition("relief_even_if_bad", "spatial-recognition");
  const view = deriveSpatialReasoningView(recognition);
  assert.equal(recognition.state, "RECOGNITION");
  assert.equal(view.state, "RECOGNITION");
  assert.equal(view.directionA.status, "stabilized");
  assert.equal(view.directionB.status, "receded");
});

test("REJECT — the rejected direction exits while the tested alternative remains", () => {
  const recognition = reachRecognition("harder_if_i_was_wrong", "spatial-reject");
  const rejectedId = recognition.primary.id;
  const recovery = answerRecognition(pack, recognition, "rejected", "spatial-reject:response");
  const view = deriveSpatialReasoningView(recovery);
  assert.equal(recovery.pendingCorrection.rejectedHypothesisId, rejectedId);
  assert.equal(view.state, "B_REJECTED");
  assert.equal(view.directionA.status, "remaining");
  assert.equal(view.directionB.status, "rejected");
});

test("REJECT TO UNRESOLVED — a second rejection leaves the space open", () => {
  const recognition = reachRecognition("harder_if_i_was_wrong", "spatial-unresolved");
  const recovery = answerRecognition(pack, recognition, "rejected", "spatial-unresolved:first");
  const unresolved = answerCorrectionFollowup(
    pack,
    recovery,
    "still_not_fit",
    "spatial-unresolved:second",
  );
  const view = deriveSpatialReasoningView(unresolved);
  assert.equal(unresolved.state, "NO_VALID_INSIGHT");
  assert.equal(view.state, "OPEN");
  assert.equal(view.directionA.status, "withdrawn");
  assert.equal(view.directionB.status, "withdrawn");
});

test("the same Session always produces the same spatial view", () => {
  const session = reachRevision("harder_if_i_was_wrong", "spatial-stable");
  assert.deepEqual(deriveSpatialReasoningView(session), deriveSpatialReasoningView(session));
});
