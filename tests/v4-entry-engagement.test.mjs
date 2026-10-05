import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  answerJourneyInteraction,
  createJourneySession,
  currentJourneyInteraction,
  enterJourney,
} from "../app/v4-core/journey/journey-machine.ts";
import { rankingLabels } from "../app/v4-core/display-labels.ts";
import { importantChoicePack } from "../app/v4-core/packs/important-choice.ts";
import { uncertainOutcomePack } from "../app/v4-core/packs/uncertain-outcome.ts";

function reachRanking(sessionId) {
  let session = enterJourney(createJourneySession(uncertainOutcomePack, sessionId));
  session = answerJourneyInteraction(uncertainOutcomePack, session, "waiting_longer", `${sessionId}:context`);
  session = answerJourneyInteraction(uncertainOutcomePack, session, "outcome_unknown", `${sessionId}:focus`);
  assert.equal(currentJourneyInteraction(uncertainOutcomePack, session)?.id, "current_need_priority");
  return session;
}

function candidateEvidenceSnapshot(session) {
  return session.candidates.map((candidate) => ({
    id: candidate.id,
    status: candidate.status,
    supportingSignalIds: candidate.supportingSignalIds,
    contradictingSignalIds: candidate.contradictingSignalIds,
  }));
}

test("ranking abstain is a real signal and contributes no candidate evidence", () => {
  const before = reachRanking("entry-single-abstain");
  const beforeCandidates = candidateEvidenceSnapshot(before);
  const after = answerJourneyInteraction(
    uncertainOutcomePack,
    before,
    "priority_abstain",
    "entry-single-abstain:priority",
  );
  const abstainSignal = after.signals.find((signal) => signal.id === "entry-single-abstain:priority");

  assert.equal(abstainSignal?.value, "priority_abstain");
  assert.equal(abstainSignal?.source, "relative_position");
  assert.equal(abstainSignal?.evidenceFamily, "current_need_priority");
  assert.equal(abstainSignal?.abstained, true);
  assert.equal(after.totalAbstainCount, 1);
  assert.equal(after.explorationActionCount, 3);
  assert.deepEqual(candidateEvidenceSnapshot(after), beforeCandidates);
  assert.ok(after.candidates.every((candidate) => !candidate.supportingSignalIds.includes(abstainSignal.id)));
  assert.ok(after.candidates.every((candidate) => !candidate.contradictingSignalIds.includes(abstainSignal.id)));
});

test("a ranking abstain still participates in the existing consecutive-abstain stop rule", () => {
  let session = enterJourney(createJourneySession(uncertainOutcomePack, "entry-consecutive-abstain"));
  session = answerJourneyInteraction(
    uncertainOutcomePack,
    session,
    "waiting_longer",
    "entry-consecutive-abstain:context",
  );
  session = answerJourneyInteraction(
    uncertainOutcomePack,
    session,
    "focus_abstain",
    "entry-consecutive-abstain:focus",
  );
  assert.equal(session.consecutiveAbstainCount, 1);
  session = answerJourneyInteraction(
    uncertainOutcomePack,
    session,
    "priority_abstain",
    "entry-consecutive-abstain:priority",
  );
  assert.equal(session.state, "NO_VALID_INSIGHT");
  assert.equal(session.consecutiveAbstainCount, 2);
  assert.equal(session.insight, undefined);
  assert.equal(session.noValidReason, "insufficient_signals");
  assert.equal(currentJourneyInteraction(uncertainOutcomePack, session), undefined);
});

test("Pack 01 life-language labels preserve the existing option ids and effects", () => {
  assert.deepEqual(rankingLabels, {
    certainty: "至少知道什么时候会有结果",
    agency: "至少还有一件我现在能做的事",
    performance: "就算结果不好，也不代表我当时做得很差",
    evaluation: "先不去想别人会怎么看我",
    avoid: "让我先别一直想着这件事",
  });
  const ranking = uncertainOutcomePack.interactions.find((item) => item.id === "current_need_priority");
  assert.ok(ranking);
  assert.deepEqual(
    ranking.options.filter((option) => !option.isAbstain).map((option) => ({
      id: option.id,
      label: option.label,
      effects: option.effects,
    })),
    [
      { id: "certainty", label: rankingLabels.certainty, effects: [{ hypothesisId: "uncertainty", weight: 0.45 }] },
      { id: "agency", label: rankingLabels.agency, effects: [{ hypothesisId: "control", weight: 0.45 }] },
      { id: "performance", label: rankingLabels.performance, effects: [{ hypothesisId: "self_evaluation", weight: 0.45 }, { hypothesisId: "fear_of_error", weight: 0.2 }] },
      { id: "evaluation", label: rankingLabels.evaluation, effects: [{ hypothesisId: "external_evaluation", weight: 0.45 }] },
      { id: "avoid", label: rankingLabels.avoid, effects: [{ hypothesisId: "uncertainty", weight: -0.15 }, { hypothesisId: "control", weight: -0.1 }] },
    ],
  );
  assert.equal(ranking.options.find((option) => option.isAbstain)?.label, "我现在还选不出来");
  for (const interaction of importantChoicePack.interactions) {
    for (const option of interaction.options) {
      assert.doesNotMatch(option.label, /掌控感|行动位置|自我价值/);
    }
  }
});

test("entry, holding, evidence continuity and native interaction contracts remain explicit", async () => {
  const [source, css] = await Promise.all([
    readFile(new URL("../app/v4-core/V4CoreJourney.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/v4-core/V4CoreJourney.module.css", import.meta.url), "utf8"),
  ]);

  for (const copy of [
    "先不用急着回答。",
    "有些事只是一直停在心里，还没有被说清。",
    "我们可以从一件具体的事，慢慢靠近。",
    "慢慢开始",
    "跳过开场",
    "目前开放的探索",
    "这一次，哪一种更接近你正在经历的？",
    "现在先从两个具体处境开始。都不贴近，也可以。",
    "这两种都不贴近",
    "那先不用把它放进这两个入口里。",
    "Inner Mirror 现在还不能对这些情况作出可靠理解。",
    "这次可以先停在这里，不需要为了继续而勉强选择。",
    "先留在这里",
    "返回看看",
    "如果还可以再留一个呢？",
    "刚才留下",
  ]) assert.match(source, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

  assert.match(source, /type="button" disabled=\{submitting\} onClick=\{abstainFromRanking\}/);
  assert.match(source, /<EvidenceTrace labels=\{previousEvidence\}/);
  assert.match(source, /data-preference-stage=\{firstChoice \? "SECOND" : "FIRST"\}/);
  assert.match(source, /entryStage === "HOLDING_ENDED"/);
  assert.match(source, /onReturn=\{\(\) => setEntryStage\("SELECTOR"\)\}/);
  assert.doesNotMatch(source, /setEntryStage\("HOLDING"\)[\s\S]{0,180}createJourneySession/);

  assert.match(css, /\.abstainAction\s*\{[\s\S]*?width:\s*100%;[\s\S]*?min-height:\s*52px;/);
  assert.match(css, /\.root button:focus-visible/);
  assert.match(css, /@media \(max-width: 480px\)[\s\S]*?\.preferenceActions \.abstainAction \{ min-height: 52px; \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.preludeBeat/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)[\s\S]*?animation: none; opacity: 1; transform: none;/);
  assert.match(css, /@keyframes preludeLineApproaches/);
  assert.match(css, /@keyframes evidenceTraceIn/);
  assert.doesNotMatch(source, /进度|百分比|confidence|Candidate score/i);
});
