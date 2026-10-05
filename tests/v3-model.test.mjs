import assert from "node:assert/strict";
import test from "node:test";

async function model() { return import("../app/phase1-model.ts"); }

async function persona(kind) {
  const m = await model();
  let session = m.createSession(1000);
  if (kind === "A") {
    session = m.chooseIntent(session, "repeated_pattern");
    session = m.recordScan(session, "scan_state", ["prove", "tense"]);
    session = m.recordScan(session, "scan_attention", ["performance", "evaluation"]);
    session = m.recordScan(session, "scan_needs", ["recognition", "result", "certainty", "control"]);
    session = m.recordRanking(session, ["recognition", "result", "certainty", "control"]);
    session = m.answerQuestion(session, "result_scenario", "others");
  } else if (kind === "B") {
    session = m.chooseIntent(session, "specific_concern");
    session = m.recordScan(session, "scan_state", ["closer", "tense"]);
    session = m.recordScan(session, "scan_attention", ["relationship"]);
    session = m.recordScan(session, "scan_needs", ["understanding", "certainty", "rest", "control"]);
    session = m.recordRanking(session, ["understanding", "certainty", "rest", "control"]);
    session = m.answerQuestion(session, "relationship_scenario", "harmony");
  } else if (kind === "C") {
    session = m.chooseIntent(session, "current_state");
    session = m.recordScan(session, "scan_state", ["tired", "calm"]);
    session = m.recordScan(session, "scan_attention", ["recovery", "own_judgment"]);
    session = m.recordScan(session, "scan_needs", ["rest", "certainty", "understanding", "control"]);
    session = m.recordRanking(session, ["rest", "certainty", "understanding", "control"]);
    session = m.answerQuestion(session, "rest_tradeoff", "rest");
  } else {
    session = m.chooseIntent(session, "find_direction");
    session = m.recordScan(session, "scan_state", ["calm", "motivated"]);
    session = m.recordScan(session, "scan_attention", ["future", "choice"]);
    session = m.recordScan(session, "scan_needs", ["freedom", "direction", "certainty", "result"]);
    session = m.recordRanking(session, ["freedom", "direction", "result", "certainty"]);
    session = m.answerQuestion(session, "direction_tradeoff", "alive");
  }
  return session;
}

test("approved question bank contains distinct scenario, tradeoff and verification evidence", async () => {
  const m = await model();
  const types = new Set(m.QUESTION_BANK.map((item) => item.type));
  for (const type of ["scenario", "tradeoff", "verification"]) assert.ok(types.has(type));
  assert.ok(m.QUESTION_BANK.every((item) => item.informationValue > 0 && item.options.every((option) => Object.hasOwn(item.signalEffects, option.id))));
});

test("Persona A and B receive different primary models and next questions", async () => {
  const m = await model();
  const [a, b] = await Promise.all([persona("A"), persona("B")]);
  assert.equal(a.primaryKey, "result_self");
  assert.equal(b.primaryKey, "relationship_safety");
  const aBeforeQuestion = m.recordRanking(
    m.recordScan(m.recordScan(m.recordScan(m.chooseIntent(m.createSession(), "repeated_pattern"), "scan_state", ["prove"]), "scan_attention", ["performance"]), "scan_needs", ["recognition", "result", "certainty"]),
    ["recognition", "result", "certainty"],
  );
  const bBeforeQuestion = m.recordRanking(
    m.recordScan(m.recordScan(m.recordScan(m.chooseIntent(m.createSession(), "specific_concern"), "scan_state", ["closer"]), "scan_attention", ["relationship"]), "scan_needs", ["understanding", "certainty", "rest"]),
    ["understanding", "certainty", "rest"],
  );
  assert.equal(aBeforeQuestion.agentDecision.nextQuestionId, "result_scenario");
  assert.equal(bBeforeQuestion.agentDecision.nextQuestionId, "relationship_scenario");
  assert.notEqual(aBeforeQuestion.agentDecision.nextQuestionId, bBeforeQuestion.agentDecision.nextQuestionId);
});

test("Persona C remains State / Rest and is not problematized as Self", async () => {
  const c = await persona("C");
  assert.equal(c.primaryKey, "rest_recovery");
  assert.notEqual(c.primaryKey, "result_self");
  assert.match(c.hypotheses.find((item) => item.key === c.primaryKey).statement, /恢复/);
});

test("Persona D receives a stable, non-problematic Direction map", async () => {
  const d = await persona("D");
  assert.equal(d.primaryKey, "direction_values");
  assert.match(d.hypotheses.find((item) => item.key === d.primaryKey).statement, /没有明显失衡/);
  assert.ok(d.currentInnerMap.nodes.some((node) => node.domain === "direction"));
});

test("contradictory independent sources trigger VERIFY", async () => {
  const m = await model();
  let session = m.chooseIntent(m.createSession(), "current_state");
  session = m.recordScan(session, "scan_state", ["calm"]);
  session = m.recordScan(session, "scan_attention", ["own_judgment"]);
  session = m.recordScan(session, "scan_needs", ["recognition", "result", "certainty"]);
  session = m.recordRanking(session, ["recognition", "result", "certainty"]);
  assert.ok(session.contradictions.some((item) => item.trait === "external_validation"));
  assert.equal(session.agentDecision.action, "VERIFY");
  assert.equal(session.agentDecision.nextQuestionId, "recognition_verify");
});

test("rejecting Primary lowers support, changes branch, map and next question", async () => {
  const m = await model();
  const before = m.revealMap(await persona("A"));
  const oldPrimary = before.primaryKey;
  const oldQuestionIds = new Set(before.askedQuestionIds);
  const oldNodes = before.currentInnerMap.nodes.map((item) => item.id).join(",");
  const after = m.confirmHypothesis(before, "rejected");
  assert.equal(after.userCorrections[oldPrimary], "rejected");
  assert.notEqual(after.primaryKey, oldPrimary);
  assert.equal(after.currentStep, "adaptive");
  assert.equal(after.agentDecision.action, "REWEIGHT");
  assert.ok(!oldQuestionIds.has(after.agentDecision.nextQuestionId));
  assert.notEqual(after.currentInnerMap.nodes.map((item) => item.id).join(","), oldNodes);
});

test("Current Inner Map forms progressively and preserves traceable uncertainty", async () => {
  const m = await model();
  let session = m.chooseIntent(m.createSession(), "current_state");
  const emptyVersion = session.currentInnerMap.version;
  session = m.recordScan(session, "scan_state", ["tired"]);
  const stateMap = session.currentInnerMap;
  session = m.recordScan(session, "scan_attention", ["recovery"]);
  const attentionMap = session.currentInnerMap;
  session = m.recordScan(session, "scan_needs", ["rest", "certainty", "understanding"]);
  const needMap = session.currentInnerMap;
  session = m.recordRanking(session, ["rest", "certainty", "understanding"]);
  assert.ok(stateMap.version > emptyVersion);
  assert.ok(attentionMap.nodes.length > stateMap.nodes.length);
  assert.ok(needMap.nodes.length >= attentionMap.nodes.length);
  assert.ok(session.currentInnerMap.edges.length >= 1);
  assert.ok(session.currentInnerMap.nodes.every((node) => node.evidence.length >= 1));
  assert.ok(session.currentInnerMap.nodes.some((node) => node.status === "uncertain"));
  assert.doesNotMatch(JSON.stringify(session.currentInnerMap), /%/);
});

test("confirmation ends Phase 1 only after a clear direction and an open direction coexist", async () => {
  const m = await model();
  let session = m.revealMap(await persona("A"));
  session = m.confirmHypothesis(session, "confirmed");
  assert.equal(session.currentStep, "complete");
  assert.equal(m.stopCondition(session), true);
  assert.ok(session.currentInnerMap.nodes.some((node) => node.status === "clear"));
  assert.ok(session.currentInnerMap.nodes.some((node) => node.status === "uncertain"));
});

test("Phase 1 can complete without any free text", async () => {
  const { readFile } = await import("node:fs/promises");
  const m = await model();
  let session = m.revealMap(await persona("B"));
  session = m.confirmHypothesis(session, "partial");
  assert.equal(session.currentStep, "complete");
  const source = await readFile(new URL("../app/InnerMirrorPhase1.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /<textarea|contentEditable|type="text"/);
});

test("schema v3 persistence restores valid sessions and safely rejects incompatible data", async () => {
  const m = await model();
  const session = await persona("D");
  assert.equal(m.restoreSession(JSON.stringify(session)).sessionId, session.sessionId);
  assert.equal(m.restoreSession("{broken"), null);
  assert.equal(m.restoreSession(JSON.stringify({ schemaVersion: 2, sessionId: "old" })), null);
  assert.equal(m.restoreSession(JSON.stringify({ schemaVersion: 3, sessionId: "old", signals: [], currentInnerMap: { nodes: [] } })), null);
});

test("required local analytics are implemented without free-text payloads", async () => {
  const { readFile } = await import("node:fs/promises");
  const source = await readFile(new URL("../app/phase1-model.ts", import.meta.url), "utf8");
  for (const event of ["session_started", "entry_selected", "signal_added", "ranking_completed", "agent_action_selected", "branch_changed", "contradiction_detected", "hypothesis_shown", "hypothesis_confirmed", "hypothesis_partially_confirmed", "hypothesis_rejected", "inner_map_first_node_shown", "inner_map_updated", "inner_map_revealed", "phase1_completed"]) assert.match(source, new RegExp(event));
  assert.doesNotMatch(source, /free.?text/i);
});

export { persona };
