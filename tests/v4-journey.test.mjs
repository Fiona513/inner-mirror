import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  answerCorrectionFollowup,
  answerJourneyInteraction,
  answerJourneyRanking,
  answerRecognition,
  continueFromFirstAgentMoment,
  continueFromRevision,
  createJourneySession,
  currentJourneyInteraction,
  enterJourney,
  requestRecognition,
} from "../app/v4-core/journey/journey-machine.ts";
import {
  rankingKeys,
  rankingLabel,
  rankingMoveLabel,
} from "../app/v4-core/display-labels.ts";
import { uncertainOutcomePack } from "../app/v4-core/packs/uncertain-outcome.ts";

const TOP_TWO = ["certainty", "agency"];

function reachFirstAgent(sessionId = "journey-test") {
  let session = createJourneySession(uncertainOutcomePack, sessionId);
  assert.equal(session.state, "ENTER");
  session = enterJourney(session);
  assert.equal(currentJourneyInteraction(uncertainOutcomePack, session)?.id, "context_delay");
  session = answerJourneyInteraction(uncertainOutcomePack, session, "waiting_longer", `${sessionId}:context`);
  assert.equal(session.state, "DIFFERENTIATE");
  assert.equal(currentJourneyInteraction(uncertainOutcomePack, session)?.id, "clarify_focus");
  session = answerJourneyInteraction(uncertainOutcomePack, session, "outcome_unknown", `${sessionId}:focus`);
  assert.equal(session.state, "DIFFERENTIATE");
  assert.equal(currentJourneyInteraction(uncertainOutcomePack, session)?.id, "current_need_priority");
  session = answerJourneyRanking(uncertainOutcomePack, session, TOP_TWO, `${sessionId}:ranking`);
  assert.equal(session.state, "FIRST_AGENT_MOMENT");
  assert.equal(session.primary?.id, "uncertainty");
  assert.equal(session.activeAlternative?.id, "fear_of_error");
  return session;
}

function reachRevision(optionId, sessionId) {
  const firstAgent = reachFirstAgent(sessionId);
  const shownPair = {
    primaryId: firstAgent.primary.id,
    alternativeId: firstAgent.activeAlternative.id,
  };
  let session = continueFromFirstAgentMoment(firstAgent);
  assert.equal(session.state, "EXPLORE");
  assert.equal(currentJourneyInteraction(uncertainOutcomePack, session)?.id, "result_arrives_counterfactual");
  session = answerJourneyInteraction(
    uncertainOutcomePack,
    session,
    optionId,
    `${sessionId}:discriminator`,
  );
  return { session, shownPair };
}

test("A — Primary Switch is restricted to the A/B pair already shown", () => {
  const { session: revision, shownPair } = reachRevision("harder_if_i_was_wrong", "journey-switch");
  assert.equal(revision.state, "REVISION");
  assert.equal(revision.lastRevision?.type, "primary_switch");
  assert.equal(revision.lastRevision?.previousPrimary, shownPair.primaryId);
  assert.equal(revision.lastRevision?.previousAlternative, shownPair.alternativeId);
  assert.equal(revision.lastRevision?.newPrimary, shownPair.alternativeId);
  assert.equal(revision.primary?.id, shownPair.alternativeId);
  assert.equal(revision.activeAlternative?.id, shownPair.primaryId);
  assert.equal(
    revision.signals.find((signal) => signal.id.endsWith(":discriminator"))?.value,
    "harder_if_i_was_wrong",
  );

  const recognition = requestRecognition(uncertainOutcomePack, continueFromRevision(revision));
  assert.equal(recognition.state, "RECOGNITION");
  const displayedAlternativeId = recognition.activeAlternative?.id;
  const corrected = answerRecognition(
    uncertainOutcomePack,
    recognition,
    "prefer_alternative",
    "journey-switch:prefer-visible-b",
  );
  assert.equal(corrected.state, "RECOGNITION");
  assert.equal(corrected.primary?.id, displayedAlternativeId);
  assert.ok([shownPair.primaryId, shownPair.alternativeId].includes(corrected.primary?.id));
});

test("B — two consecutive Clarify abstains stop at explicit NO_VALID_INSIGHT", () => {
  let session = enterJourney(createJourneySession(uncertainOutcomePack, "journey-abstain"));
  session = answerJourneyInteraction(
    uncertainOutcomePack,
    session,
    "context_abstain",
    "journey-abstain:context",
  );
  assert.equal(session.state, "DIFFERENTIATE");
  assert.equal(session.primary, undefined);
  session = answerJourneyInteraction(
    uncertainOutcomePack,
    session,
    "focus_abstain",
    "journey-abstain:focus",
  );
  assert.equal(session.state, "NO_VALID_INSIGHT");
  assert.equal(session.noValidReason, "insufficient_signals");
  assert.equal(session.recognitionOutcome?.status, "NO_VALID_INSIGHT");
  assert.equal(session.insight, undefined);
  assert.equal(session.primary, undefined);
  assert.equal(session.activeAlternative, undefined);
  assert.equal(session.consecutiveAbstainCount, 2);
  assert.ok(session.signals.every((signal) => signal.abstained));
  assert.deepEqual(session.rejectedScenarios, ["context_delay", "clarify_focus"]);
  assert.equal(currentJourneyInteraction(uncertainOutcomePack, session), undefined);
});

test("B2 — every Clarify interaction offers abstain and top-two preference never fabricates unselected values", () => {
  for (const interactionId of uncertainOutcomePack.journey.clarifyInteractionIds) {
    const interaction = uncertainOutcomePack.interactions.find((item) => item.id === interactionId);
    assert.ok(interaction?.options.some((option) => option.isAbstain));
  }
  const firstAgent = reachFirstAgent("journey-ranking");
  const rankingSignal = firstAgent.signals.find((signal) => signal.key === "need_priority");
  assert.deepEqual(rankingSignal?.value, TOP_TWO);
  assert.equal(rankingSignal?.value.length, 2);
  assert.ok(!rankingSignal?.value.includes("performance"));
  assert.ok(!rankingSignal?.value.includes("evaluation"));
  assert.ok(!rankingSignal?.value.includes("avoid"));
  assert.equal(rankingSignal?.source, "relative_position");
  assert.equal(rankingSignal?.abstained, false);

  let incomplete = createJourneySession(uncertainOutcomePack, "journey-one-choice");
  incomplete = enterJourney(incomplete);
  incomplete = answerJourneyInteraction(uncertainOutcomePack, incomplete, "waiting_longer", "one:context");
  incomplete = answerJourneyInteraction(uncertainOutcomePack, incomplete, "outcome_unknown", "one:focus");
  assert.throws(
    () => answerJourneyRanking(uncertainOutcomePack, incomplete, ["certainty"], "one:ranking"),
    /Invalid ranking/,
  );
});

test("B3 — rejecting the discriminator pair reaches NO_VALID without repeating it", () => {
  const { session: revision, shownPair } = reachRevision("neither_changes", "journey-no-valid");
  assert.equal(revision.state, "REVISION");
  assert.equal(revision.lastRevision?.type, "both_weakened");
  assert.ok(revision.rejectedDirections.includes(shownPair.primaryId));
  assert.ok(revision.rejectedDirections.includes(shownPair.alternativeId));
  assert.ok(revision.rejectedScenarios.includes("result_arrives_counterfactual"));
  const completed = requestRecognition(uncertainOutcomePack, continueFromRevision(revision));
  assert.equal(completed.state, "NO_VALID_INSIGHT");
  assert.equal(completed.recognitionOutcome?.status, "NO_VALID_INSIGHT");
  assert.equal(completed.insight, undefined);
  assert.equal(currentJourneyInteraction(uncertainOutcomePack, completed), undefined);
});

test("C — Reject Recovery stops after the second explicit rejection", () => {
  const recognition = requestRecognition(
    uncertainOutcomePack,
    continueFromRevision(reachRevision("harder_if_i_was_wrong", "journey-reject").session),
  );
  const firstRejectedId = recognition.primary?.id;
  const displayedAlternativeId = recognition.activeAlternative?.id;
  const recovery = answerRecognition(
    uncertainOutcomePack,
    recognition,
    "rejected",
    "journey-reject:reject-first",
  );
  assert.equal(recovery.state, "GO_DEEPER");
  assert.equal(recovery.correctionRound, 1);
  assert.equal(recovery.pendingCorrection?.mode, "reconsider_alternative");
  assert.equal(recovery.primary?.id, displayedAlternativeId);
  assert.ok(recovery.rejectedDirections.includes(firstRejectedId));

  const stopped = answerCorrectionFollowup(
    uncertainOutcomePack,
    recovery,
    "still_not_fit",
    "journey-reject:reject-second",
  );
  assert.equal(stopped.state, "NO_VALID_INSIGHT");
  assert.equal(stopped.correctionRound, 2);
  assert.equal(stopped.pendingCorrection, undefined);
  assert.equal(stopped.primary, undefined);
  assert.ok(stopped.rejectedDirections.includes(firstRejectedId));
  assert.ok(stopped.rejectedDirections.includes(displayedAlternativeId));
  assert.equal(currentJourneyInteraction(uncertainOutcomePack, stopped), undefined);
});

test("D — ranking labels and accessible names never expose internal enums", () => {
  for (const key of rankingKeys) {
    const label = rankingLabel(key);
    assert.ok(label.length > 4);
    assert.doesNotMatch(label, new RegExp(`^${key}$`, "i"));
    assert.doesNotMatch(label, /undefined|avoid|performance|evaluation/i);
    assert.equal(rankingMoveLabel("up", key), `上移「${label}」`);
    assert.equal(rankingMoveLabel("down", key), `下移「${label}」`);
    assert.doesNotMatch(rankingMoveLabel("up", key), /undefined|avoid|performance|evaluation/i);
  }
});

test("Basic Journey UI remains bounded, accessible and non-survey-like", async () => {
  const [source, css, spatialSource] = await Promise.all([
    readFile(new URL("../app/v4-core/V4CoreJourney.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/v4-core/V4CoreJourney.module.css", import.meta.url), "utf8"),
    readFile(new URL("../app/v4-core/spatial/spatial-state.ts", import.meta.url), "utf8"),
  ]);
  for (const state of [
    "ENTER",
    "CLARIFY",
    "DIFFERENTIATE",
    "FIRST_AGENT_MOMENT",
    "EXPLORE",
    "REVISION",
    "GO_DEEPER",
    "RECOGNITION",
    "NO_VALID_INSIGHT",
    "CORRECT_AND_LEAVE",
  ]) assert.match(source, new RegExp(`\\b${state}\\b`));
  assert.match(source, /跳到本次探索/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /更像刚才另一种/);
  assert.match(source, /两个都不像/);
  assert.match(source, /如果还可以再留一个呢/);
  assert.match(source, /刚才那个答案，让另一种可能更像了/);
  assert.match(source, /刚才那个不太像，那这一种呢/);
  assert.match(source, /这次还不用急着给它一个答案/);
  assert.match(source, /这次比较清楚的一点/);
  assert.match(source, /目前比较接近的是/);
  assert.match(source, /<details className=\{styles\.explanation\}>/);
  assert.match(source, /<SpatialJourney pack=\{pack\} session=\{session\} view=\{spatialView\}>/);
  assert.match(source, /data-spatial-state=\{view\.state\}/);
  assert.match(source, /你刚才选择/);
  assert.match(spatialSource, /deriveSpatialReasoningView/);
  for (const spatialState of [
    "PAIR",
    "A_DOMINANT",
    "B_DOMINANT",
    "BOTH_WEAKENED",
    "A_REJECTED",
    "B_REJECTED",
    "RECOGNITION",
    "OPEN",
  ]) assert.match(spatialSource, new RegExp(`\\b${spatialState}\\b`));
  assert.match(css, /data-direction-status="dominant"/);
  assert.match(css, /data-direction-status="rejected"/);
  assert.match(css, /data-spatial-state="OPEN"/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /max-height: 760px/);
  assert.doesNotMatch(css, /min-width:\s*1200px/);
  for (const removedCopy of [
    "NO VALID INSIGHT",
    "停止推断",
    "理解已重新计算",
    "第一轮理解",
    "备选方向",
    "主方向",
    "系统不会",
    "心理分数",
    "相对位置信号",
    "Insight Gate",
    "继续区分",
  ]) assert.doesNotMatch(source, new RegExp(removedCopy, "i"));
  assert.doesNotMatch(source, /确认这个相对顺序|上移「|下移「/);
  assert.doesNotMatch(source, /DirectionPair|RevisionDirection|revisionField/);
  assert.doesNotMatch(source, /String\(index \+ 1\)/);
  assert.doesNotMatch(source, /Question\s*\d|问题\s*\d\s*\/\s*\d|localStorage|\/api\/agent|analytics/i);
  assert.doesNotMatch(source, /[—–]/);
});
