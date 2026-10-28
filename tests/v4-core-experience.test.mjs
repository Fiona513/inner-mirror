import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  answerFeeling,
  answerNeedAndComplete,
  beginSession,
  continueExploration,
  correctFirstValue,
  createEmptyExperienceState,
  finishToday,
  getLatestFragment,
  recordVisit,
  reviewFragmentFeedback,
  reviewPreviousFragment,
  selectTodayReason,
  setOptionalNote,
  setThinkingPreference,
  showReturningState,
} from "../app/v4-core/experience/experience-machine.ts";
import {
  V4_EXPERIENCE_STORAGE_KEY,
  parseExperienceState,
  serializeExperienceState,
} from "../app/v4-core/experience/storage.ts";
import { TODAY_REASONS, getExplorationNeedOptions } from "../app/v4-core/experience/content.ts";
import {
  getThinkingStyle,
  preferenceExplorationQuestion,
  preferenceNeedQuestion,
} from "../app/v4-core/experience/preferences.ts";

let sequence = 0;
function meta({ signal = false, session = false, fragment = false, at } = {}) {
  sequence += 1;
  const stamp = at ?? `2026-09-${String(10 + Math.min(sequence, 19)).padStart(2, "0")}T08:00:00.000Z`;
  return {
    now: stamp,
    eventId: `event-${sequence}`,
    signalId: signal ? `signal-${sequence}` : undefined,
    sessionId: session ? `session-${sequence}` : undefined,
    fragmentId: fragment ? `fragment-${sequence}` : undefined,
  };
}

function sessionMeta(state, options = {}) {
  return { ...meta(options), sessionId: state.currentSession?.id };
}

function chooseReason(reasonId) {
  let state = createEmptyExperienceState();
  state = beginSession(state, meta({ session: true }));
  return selectTodayReason(state, reasonId, sessionMeta(state, { signal: true }));
}

test("CASE A — confused gives first value after one choice and early exit still creates one fragment", () => {
  let state = chooseReason("confused");
  assert.equal(state.currentState, "FIRST_VALUE");
  assert.equal(state.currentSession?.signals.length, 1);
  assert.match(state.currentSession?.firstValue?.observation ?? "", /几种在意的事同时靠得很近/);
  assert.deepEqual(
    state.events.slice(-2).map((event) => event.name),
    ["reason_selected", "first_value_seen"],
  );

  const completionMeta = sessionMeta(state, { fragment: true });
  state = finishToday(state, completionMeta);
  assert.equal(state.currentState, "COMPLETE");
  assert.equal(state.fragments.length, 1);
  assert.equal(state.sessions.at(-1)?.completionReason, "early_exit");
  assert.equal(state.innerWorld.revision, 1);
  assert.equal(state.fragments[0].sourceSignals[0].value, "confused");
  assert.match(state.fragments[0].observation, /我发现自己最近并不是完全没有方向/);
  assert.ok(state.events.some((event) => event.name === "early_exit"));
  assert.ok(state.events.some((event) => event.name === "fragment_created"));
  assert.equal(finishToday(state, completionMeta), state, "a repeated completion is idempotent");
});

test("CASE B/D — curious can opt in, finish two branched interactions and leave optional text empty", () => {
  let state = chooseReason("curious");
  state = continueExploration(state, sessionMeta(state));
  assert.equal(state.currentState, "EXPLORE_ONE");
  state = answerFeeling(state, "rushing", sessionMeta(state, { signal: true }));
  assert.equal(state.currentState, "EXPLORE_TWO");
  state = setOptionalNote(state, "", "2026-09-20T08:00:00.000Z");
  state = answerNeedAndComplete(state, "unhurried_space", sessionMeta(state, { signal: true, fragment: true }));
  assert.equal(state.currentState, "COMPLETE");
  assert.equal(state.sessions.at(-1)?.explorationActionCount, 2);
  assert.match(state.fragments[0].observation, /不被催促的位置/);
  assert.doesNotMatch(state.fragments[0].observation, /人格|类型|你应该|诊断|报告/);
  assert.ok(state.fragments[0].sourceSignals.some((signal) => signal.family === "current_feeling"));
  assert.ok(state.fragments[0].sourceSignals.some((signal) => signal.family === "current_need"));
  assert.equal(state.sessions.at(-1)?.optionalNote, "");
});

test("CASE C — unknown is valid, creates no default evidence and can finish without forced certainty", () => {
  let state = chooseReason("unknown");
  assert.deepEqual(state.currentSession?.signals.map((signal) => signal.value), ["unknown"]);
  assert.match(state.currentSession?.firstValue?.observation ?? "", /不需要急着/);
  state = continueExploration(state, sessionMeta(state));
  state = answerFeeling(state, "hard_to_name", sessionMeta(state, { signal: true }));
  state = answerNeedAndComplete(state, "not_sure_yet", sessionMeta(state, { signal: true, fragment: true }));
  assert.equal(state.fragments.length, 1);
  assert.match(state.fragments[0].observation, /仍然说不上来|还没有名字/);
  assert.doesNotMatch(state.fragments[0].observation, /其实|真正的你|答案是/);
});

test("correction removes the original interpretation from the saved fragment", () => {
  let state = chooseReason("others_first");
  const original = state.currentSession?.firstValue?.observation;
  state = correctFirstValue(state, sessionMeta(state, { signal: true }));
  assert.equal(state.currentSession?.firstValue?.userFeedback, "corrected");
  assert.equal(state.currentSession?.firstValue?.correctedFrom, original);
  assert.match(state.currentSession?.firstValue?.observation ?? "", /先只留下/);
  state = finishToday(state, sessionMeta(state, { fragment: true }));
  assert.equal(state.fragments[0].userFeedback, "corrected");
  assert.equal(state.fragments[0].observation, state.sessions[0].firstValue?.observation);
  assert.notEqual(state.fragments[0].observation, original);
});

test("CASE E — returning uses the newest fragment, references it and records change without restarting", () => {
  let state = chooseReason("changed");
  state = finishToday(state, sessionMeta(state, { fragment: true }));
  const first = state.fragments[0];

  state = beginSession(state, meta({ session: true, at: "2027-09-20T10:00:00.000Z" }));
  state = selectTodayReason(state, "curious", sessionMeta(state, { signal: true, at: "2027-09-20T10:01:00.000Z" }));
  state = finishToday(state, sessionMeta(state, { fragment: true, at: "2027-09-20T10:02:00.000Z" }));
  const latest = getLatestFragment(state);
  assert.ok(latest);
  assert.notEqual(latest.id, first.id);

  state = showReturningState(state);
  state = recordVisit(state, meta({ at: "2027-09-21T08:00:00.000Z" }), true);
  assert.equal(state.currentState, "RETURNING");
  state = reviewPreviousFragment(
    state,
    latest.id,
    "less",
    meta({ session: true, signal: true, at: "2027-09-21T08:01:00.000Z" }),
  );
  assert.equal(state.currentState, "RETURN_VALUE");
  assert.equal(state.currentSession?.previousFragmentId, latest.id);
  assert.equal(state.currentSession?.signals.find((signal) => signal.kind === "return_change")?.value, "less");
  assert.equal(state.currentSession?.signals.find((signal) => signal.kind === "previous_fragment")?.value, latest.id);
  assert.match(state.currentSession?.firstValue?.observation ?? "", /少了一点|不需要被固定/);
  assert.ok(state.events.some((event) => event.name === "return_visit"));
  assert.ok(state.events.some((event) => event.name === "previous_fragment_reviewed"));
});

test("CASE F — a Fragment can be marked inaccurate and is weakened in the Inner World", () => {
  let state = chooseReason("confused");
  state = finishToday(state, sessionMeta(state, { fragment: true }));
  const fragment = state.fragments[0];
  const revisionBefore = state.innerWorld.revision;
  state = reviewFragmentFeedback(state, fragment.id, "inaccurate", meta());
  assert.equal(state.fragments[0].userFeedback, "inaccurate");
  assert.equal(state.innerWorld.revision, revisionBefore + 1);
  assert.equal(state.events.at(-1)?.name, "fragment_reviewed");
  assert.equal(state.events.at(-1)?.properties?.feedback, "inaccurate");
  state = reviewFragmentFeedback(state, fragment.id, "fits", meta());
  assert.equal(state.fragments[0].userFeedback, "fits");
});

test("the second exploration interaction branches from the feeling signal", () => {
  const rushing = getExplorationNeedOptions("rushing").map((item) => item.label);
  const others = getExplorationNeedOptions("others_before_me").map((item) => item.label);
  assert.notDeepEqual(rushing, others);
  assert.ok(rushing.includes("时间总像是不够用"));
  assert.ok(others.includes("关系里"));
});

test("returning user can decline the topic without creating or overwriting a fragment", () => {
  let state = chooseReason("stuck");
  state = finishToday(state, sessionMeta(state, { fragment: true }));
  const previous = state.fragments[0];
  state = showReturningState(state);
  state = reviewPreviousFragment(state, previous.id, "not_today", meta({ session: true, signal: true }));
  assert.equal(state.currentState, "COMPLETE");
  assert.equal(state.fragments.length, 1);
  assert.equal(state.fragments[0].id, previous.id);
  assert.equal(state.sessions.at(-1)?.completionReason, "return_skipped");
});

test("rejecting a returning interpretation does not reuse the old reason copy", () => {
  let state = chooseReason("others_first");
  state = finishToday(state, sessionMeta(state, { fragment: true }));
  const previous = state.fragments[0];
  state = showReturningState(state);
  state = reviewPreviousFragment(state, previous.id, "more", meta({ session: true, signal: true }));
  state = correctFirstValue(state, sessionMeta(state, { signal: true }));
  assert.match(state.currentSession?.firstValue?.observation ?? "", /不把上次的线索延续到今天/);
  assert.doesNotMatch(state.currentSession?.firstValue?.observation ?? "", /顾及别人/);
});

test("storage is versioned, survives round-trip and rejects corrupt or foreign schemas", () => {
  let state = chooseReason("curious");
  state = finishToday(state, sessionMeta(state, { fragment: true }));
  const restored = parseExperienceState(serializeExperienceState(state));
  assert.equal(restored.fragments.length, 1);
  assert.equal(restored.fragments[0].observation, state.fragments[0].observation);
  assert.deepEqual(parseExperienceState("not-json"), createEmptyExperienceState());
  assert.deepEqual(parseExperienceState(JSON.stringify({ schemaVersion: 9 })), createEmptyExperienceState());
  assert.equal(V4_EXPERIENCE_STORAGE_KEY, "inner-mirror:v4-core:experience:v1");
  assert.doesNotMatch(V4_EXPERIENCE_STORAGE_KEY, /v3|living-model/);
});

test("MBTI is optional, self-reported and can be removed without creating evidence", () => {
  let state = chooseReason("curious");
  const signalIdsBefore = state.currentSession?.signals.map((signal) => signal.id);
  state = setThinkingPreference(state, "INFP", meta());

  assert.deepEqual(state.thinkingPreference, {
    mbtiType: "INFP",
    source: "self_reported",
    updatedAt: state.thinkingPreference?.updatedAt,
  });
  assert.deepEqual(state.currentSession?.signals.map((signal) => signal.id), signalIdsBefore);
  assert.equal(state.events.at(-1)?.properties?.preference, "INFP");

  state = setThinkingPreference(state, undefined, meta());
  assert.equal(state.thinkingPreference, undefined);
  assert.deepEqual(state.currentSession?.signals.map((signal) => signal.id), signalIdsBefore);
  assert.equal(state.events.at(-1)?.properties?.preference, "not_used");
});

test("MBTI changes the question framing, not the available evidence or conclusion", () => {
  const sensing = getThinkingStyle("ISTJ");
  const intuitive = getThinkingStyle("INFP");
  assert.equal(sensing?.informationFocus, "concrete");
  assert.equal(intuitive?.informationFocus, "patterns");
  assert.notEqual(
    preferenceExplorationQuestion("ISTJ", "fallback"),
    preferenceExplorationQuestion("INFP", "fallback"),
  );
  assert.notEqual(
    preferenceNeedQuestion("INTJ", "fallback"),
    preferenceNeedQuestion("INFJ", "fallback"),
  );

  let withoutPreference = chooseReason("curious");
  let withPreference = chooseReason("curious");
  withPreference = setThinkingPreference(withPreference, "ENTP", meta());
  withoutPreference = continueExploration(withoutPreference, sessionMeta(withoutPreference));
  withPreference = continueExploration(withPreference, sessionMeta(withPreference));
  withoutPreference = answerFeeling(withoutPreference, "rushing", sessionMeta(withoutPreference, { signal: true }));
  withPreference = answerFeeling(withPreference, "rushing", sessionMeta(withPreference, { signal: true }));
  withoutPreference = answerNeedAndComplete(withoutPreference, "unhurried_space", sessionMeta(withoutPreference, { signal: true, fragment: true }));
  withPreference = answerNeedAndComplete(withPreference, "unhurried_space", sessionMeta(withPreference, { signal: true, fragment: true }));

  assert.equal(withPreference.fragments[0].observation, withoutPreference.fragments[0].observation);
  assert.deepEqual(
    withPreference.fragments[0].sourceSignals.map(({ family, value, label }) => ({ family, value, label })),
    withoutPreference.fragments[0].sourceSignals.map(({ family, value, label }) => ({ family, value, label })),
  );
  assert.ok(withPreference.fragments[0].sourceSignals.every((signal) => !/mbti|entp/i.test(`${signal.family} ${signal.value} ${signal.label}`)));
});

test("MBTI preference persists safely and invalid stored values are ignored", () => {
  let state = createEmptyExperienceState();
  state = setThinkingPreference(state, "ISFP", meta());
  const restored = parseExperienceState(serializeExperienceState(state));
  assert.equal(restored.thinkingPreference?.mbtiType, "ISFP");

  const invalid = JSON.parse(serializeExperienceState(state));
  invalid.thinkingPreference.mbtiType = "MYSTERY";
  assert.equal(parseExperienceState(JSON.stringify(invalid)).thinkingPreference, undefined);
});

test("the UI contract keeps the first choice immediate, text optional and the world persistent", async () => {
  const [source, css, page, worldStage] = await Promise.all([
    readFile(new URL("../app/v4-core/experience/V4CoreExperience.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/v4-core/experience/V4CoreExperience.module.css", import.meta.url), "utf8"),
    readFile(new URL("../app/v4-core/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/v4-core/experience/InnerWorldStage.tsx", import.meta.url), "utf8"),
  ]);
  assert.equal(TODAY_REASONS.length, 7);
  for (const copy of [
    "看看最近的你，正在发生什么。",
    "不用一次说清自己。从今天的一个状态开始，慢慢看见你最近在意什么、被什么消耗，又在发生怎样的变化。",
    "看看今天的我",
    "我只是随便看看",
    "没有标准答案，不给你贴标签，也不是心理测试。",
    "隐私说明",
    "使用边界",
    "此刻，哪一句更接近你？",
    "让接下来的提问更贴近我",
    "暂不使用 MBTI",
    "它只调整提问方式，不参与结论，也不会成为 Fragment 证据。",
    "我也不知道",
    "为什么出现这个？",
    "刚刚留下了第一条线索。",
    "继续看看",
    "今天先到这里",
    "不太像我",
    "跳过",
    "不知道怎么说",
    "用选项继续",
    "今天，它有变化吗？",
    "今天想看看别的",
    "你留下了一块新的自己。",
    "这条观察现在像你吗？",
    "那就先不把它当成结论。",
    "下次再来时，我们可以从这里继续",
    "这里不会一次定义你",
  ]) assert.match(source, new RegExp(copy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(source, /<InnerWorldStage/);
  for (const mode of ["quiet", "signal", "exploring", "fragment", "returning", "corrected"]) {
    assert.match(worldStage, new RegExp(`${mode}: "/inner-mirror-room-${mode}-v3\\.jpg"`));
  }
  assert.match(worldStage, /data-active=\{roomMode === mode\}/);
  assert.match(css, /\.worldImage\[data-active="true"\]/);
  assert.match(source, /loadExperienceState/);
  assert.match(source, /data-stage=\{store\.currentState\}/);
  assert.match(css, /\.root\[data-stage="LANDING"\] \.worldStage/);
  assert.match(css, /@keyframes worldStageReveal/);
  assert.match(source, /maxLength=\{280\}/);
  assert.match(source, /<details className=\{styles\.thinkingPreference\}>/);
  assert.ok(source.indexOf("session.firstValue.observation") < source.indexOf("v4-mbti-preference"));
  assert.match(css, /@media \(max-width: 480px\)/);
  assert.match(css, /prefers-reduced-motion/);
  assert.doesNotMatch(css, /min-width:\s*1200px/);
  assert.match(page, /V4CoreExperience/);
  assert.doesNotMatch(source, /让选择，|几个轻量选择会逐步改变系统接下来的提问/);
  assert.doesNotMatch(source, /人格分析|开始测试|生成报告|confidence|百分比/i);
});
