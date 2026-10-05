import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createReflectionSession, hasImmediateSafetyRisk, orchestrateAgentStep, retrieveRelevantContext, structuredFallback, validateAgentDecision, validateStructuredAgentOutput } from "../app/living-model/agent.ts";
import { createDemoState, createEmptyState } from "../app/living-model/demo-data.ts";
import { sortJourneyNewestFirst } from "../app/living-model/journey.ts";
import { searchLivingModel } from "../app/living-model/search.ts";
import { livingModelReducer, loadLivingState } from "../app/living-model/store.ts";
import { LIVING_ANALYTICS_EVENTS, isActivationEvent } from "../app/living-model/analytics.ts";
import { createStateSnapshot, describeStateChange, getMostRelevantSnapshotGroup, getSnapshotMoments } from "../app/living-model/state-snapshots.ts";

const stamp = "2026-08-29T12:00:00.000Z";

function withSession(context = "decision") {
  let state = createDemoState();
  const session = createReflectionSession("I want to leave a stable role, but I keep trying to justify it to everyone first.", context, state, "reflection-test", stamp);
  state = livingModelReducer(state, { type: "START_REFLECTION", session });
  return { state, session };
}

test("demo data keeps facts, observations and interpretations as distinct records", () => {
  const state = createDemoState();
  assert.ok(state.facts.length >= 3);
  assert.ok(state.observations.length >= 2);
  assert.ok(state.insights.length >= 4);
  assert.equal(state.facts.some((item) => "userConfirmed" in item), false);
  assert.equal(state.observations.some((item) => "status" in item), false);
  assert.equal(state.insights.every((item) => typeof item.userConfirmed === "boolean"), true);
});

test("accepting a candidate creates a user-owned mirror insight, evidence link, version and Journey event", () => {
  let { state, session } = withSession();
  const beforeInsights = state.insights.length;
  const beforeJourney = state.journey.length;
  state = livingModelReducer(state, { type: "ACCEPT_CANDIDATE", sessionId: session.id, now: stamp });
  assert.equal(state.insights.length, beforeInsights + 1);
  const insight = state.insights[0];
  assert.equal(insight.status, "user_confirmed");
  assert.equal(insight.userConfirmed, true);
  assert.ok(insight.evidenceIds.includes(`evidence-${session.id}-current`));
  assert.equal(state.versions.at(-1).insightId, insight.id);
  assert.equal(state.journey.length, beforeJourney + 1);
  assert.equal(state.sessions.find((item) => item.id === session.id).outcome, "accepted");
});

test("candidate retrieval always looks for counter-signals instead of narrowing to supporting context only", () => {
  const { session } = withSession();
  assert.ok(session.candidate.supportingEvidenceIds.length >= 2);
  assert.ok(session.candidate.counterSignalIds.length >= 1);
});

test("contextualizing a candidate saves applies_when and does_not_apply_when", () => {
  let { state, session } = withSession();
  state = livingModelReducer(state, { type: "CONTEXTUALIZE_CANDIDATE", sessionId: session.id, appliesWhen: ["When a mentor is directly affected"], doesNotApplyWhen: ["When I can run a reversible test"], now: stamp });
  const insight = state.insights[0];
  assert.equal(insight.status, "context_dependent");
  assert.deepEqual(insight.appliesWhen, ["When a mentor is directly affected"]);
  assert.deepEqual(insight.doesNotApplyWhen, ["When I can run a reversible test"]);
});

test("rewriting a candidate stores the user's statement and source", () => {
  let { state, session } = withSession();
  const rewrite = "When someone's judgement matters to me, I sometimes treat their concern as a verdict before checking my own evidence.";
  state = livingModelReducer(state, { type: "REWRITE_CANDIDATE", sessionId: session.id, statement: rewrite, now: stamp });
  assert.equal(state.insights[0].statement, rewrite);
  assert.equal(state.insights[0].createdSource, "user");
  assert.equal(state.versions.at(-1).changedBy, "user");
});

test("rejecting a candidate never adds it to Mirror and blacklists it from future retrieval", () => {
  let { state, session } = withSession();
  const before = state.insights.length;
  state = livingModelReducer(state, { type: "REJECT_CANDIDATE", sessionId: session.id, now: stamp });
  assert.equal(state.insights.length, before);
  assert.equal(state.rejectedInterpretations.at(-1).statement, session.candidate.statement);
  state.insights.unshift({ id: "should-not-return", category: "patterns", title: "Rejected", statement: session.candidate.statement, status: "user_confirmed", appliesWhen: [], doesNotApplyWhen: [], evidenceIds: [], firstSeenAt: stamp, lastRevisedAt: stamp, createdSource: "agent", userConfirmed: true });
  assert.equal(retrieveRelevantContext(state, "another decision", "decision").insights.some((item) => item.id === "should-not-return"), false);
});

test("paused memory lets a session finish without writing an insight", () => {
  let { state, session } = withSession();
  state = livingModelReducer(state, { type: "TOGGLE_MEMORY", paused: true });
  const before = state.insights.length;
  state = livingModelReducer(state, { type: "ACCEPT_CANDIDATE", sessionId: session.id, now: stamp });
  assert.equal(state.insights.length, before);
  assert.equal(state.sessions.find((item) => item.id === session.id).outcome, "accepted");
});

test("forget removes a fact and its evidence from future retrieval", () => {
  let state = createDemoState();
  const factId = "fact-school";
  assert.ok(retrieveRelevantContext(state, "school decision", "decision").facts.some((item) => item.id === factId));
  state = livingModelReducer(state, { type: "FORGET_FACT", factId });
  assert.equal(retrieveRelevantContext(state, "school decision", "decision").facts.some((item) => item.id === factId), false);
  assert.equal(state.evidence.filter((item) => item.sourceId === factId).every((item) => item.forgotten), true);
});

test("editing an understanding preserves the previous version and creates a revision event", () => {
  let state = createDemoState();
  const insight = state.insights.find((item) => item.id === "insight-judgement");
  const versionCount = state.versions.filter((item) => item.insightId === insight.id).length;
  const old = insight.statement;
  state = livingModelReducer(state, { type: "EDIT_INSIGHT", insightId: insight.id, statement: "I can hear important disagreement without automatically surrendering my own evidence.", reason: "The older version made the response sound inevitable.", now: stamp });
  assert.equal(state.versions.filter((item) => item.insightId === insight.id).length, versionCount + 1);
  assert.ok(state.versions.some((item) => item.insightId === insight.id && item.statement === old));
  assert.equal(state.journey[0].type, "refined_understanding");
  assert.equal(state.journey[0].changedBy, "user");
});

test("changed and inaccurate archive paths have different Journey consequences", () => {
  let changed = createDemoState();
  const beforeChanged = changed.journey.length;
  changed = livingModelReducer(changed, { type: "ARCHIVE_INSIGHT", insightId: "insight-judgement", reason: "changed", now: stamp });
  assert.equal(changed.journey.length, beforeChanged + 1);
  assert.equal(changed.insights.find((item) => item.id === "insight-judgement").archivedReason, "changed");
  let inaccurate = createDemoState();
  const beforeInaccurate = inaccurate.journey.length;
  inaccurate = livingModelReducer(inaccurate, { type: "ARCHIVE_INSIGHT", insightId: "insight-judgement", reason: "inaccurate", now: stamp });
  assert.equal(inaccurate.journey.length, beforeInaccurate);
  assert.equal(inaccurate.insights.find((item) => item.id === "insight-judgement").archivedReason, "inaccurate");
});

test("structured output rejects arbitrary UI and sensitive identity inference, then falls back safely", () => {
  assert.equal(validateStructuredAgentOutput({ response: "x", ui: { type: "arbitrary_html" }, safety: { state: "normal" } }), null);
  assert.equal(validateStructuredAgentOutput({ intent: "sense_making", session_state: "reflect", response: "x", ui: { type: "reflection_text", data: {} }, candidate_insight: { statement: "You have a bipolar diagnosis" }, safety: { state: "normal" } }), null);
  assert.equal(structuredFallback().ui.type, "reflection_text");
});

test("Review 01 A — decision plus relevant history selects Contextual Tension and can propose a supported candidate", () => {
  const state = createDemoState();
  const session = createReflectionSession("I am deciding whether to leave the stable role even though people I trust expect me to stay.", "decision", state, "decision-agent", stamp);
  const explore = orchestrateAgentStep(state, session, "EXPLORE");
  const reflect = orchestrateAgentStep(state, session, "REFLECT");
  assert.equal(explore.ui.type, "contextual_tension");
  assert.ok(reflect.candidate_insight);
  assert.ok(reflect.candidate_insight.supportingEvidenceIds.length >= 2);
  assert.ok(reflect.candidate_insight.counterSignalIds.length >= 1);
  assert.equal(reflect.trace.persistenceAction, "candidate_proposed");
  assert.equal(validateAgentDecision(reflect, reflect)?.next_state, "REFLECT");
});

test("Review 01 B — explicit counterexample narrows or disputes the old interpretation", () => {
  const state = createDemoState();
  const session = createReflectionSession("I expected to surrender my judgement, but this time I kept my view after disagreement. This is a counterexample, not always the old pattern.", "decision", state, "counter-agent", stamp);
  const reflect = orchestrateAgentStep(state, session, "REFLECT");
  assert.ok(reflect.candidate_insight);
  assert.ok(["changing", "disputed", "context_dependent"].includes(reflect.candidate_insight.evidenceState));
  assert.match(reflect.candidate_insight.statement, /^In some situations,/);
  assert.ok(reflect.candidate_insight.doesNotApplyWhen.some((item) => item.includes("Current counterexample")));
});

test("Review 01 C — ordinary current feeling with insufficient evidence can end without a Self Model update", () => {
  const state = createEmptyState();
  const session = createReflectionSession("I feel unsettled after a long day and I do not know what it means yet.", "feeling", state, "feeling-agent", stamp);
  const explore = orchestrateAgentStep(state, session, "EXPLORE");
  const reflect = orchestrateAgentStep(state, session, "REFLECT");
  assert.equal(explore.ui.type, "perspective_split");
  assert.equal(reflect.candidate_insight, null);
  assert.equal(reflect.trace.persistenceAction, "session_only");
});

test("Agent Trace records state, component, retrieval exclusions, validation and persistence without becoming UI", async () => {
  const state = createDemoState();
  state.insights.push({ ...state.insights[0], id: "insight-archived-test", status: "archived" });
  state.insights.push({ ...state.insights[0], id: "insight-rejected-test", statement: state.rejectedInterpretations[0].statement });
  const session = createReflectionSession("A decision where validation matters", "decision", state, "trace-agent", stamp);
  const decision = orchestrateAgentStep(state, session, "REFLECT");
  assert.equal(decision.trace.currentState, "REFLECT");
  assert.equal(decision.trace.selectedComponentType, "candidate_understanding");
  assert.ok(decision.trace.retrievedSourceIds.length > 0);
  assert.ok(decision.trace.excludedArchivedIds.includes("insight-archived-test"));
  assert.ok(decision.trace.excludedRejectedIds.includes("insight-rejected-test"));
  assert.equal(decision.trace.schemaValidationResult, "passed");
  assert.equal(decision.trace.persistenceAction, "candidate_proposed");
  const reflectionUi = await readFile(new URL("../app/living-model/ReflectionPage.tsx", import.meta.url), "utf8");
  assert.match(reflectionUi, /console\.debug\("\[Inner Mirror Agent Trace\]"/);
  assert.doesNotMatch(reflectionUi, />\s*Agent Trace\s*</i);
});

test("user-edited understanding has retrieval priority over agent-authored material", () => {
  const state = createDemoState();
  const retrieved = retrieveRelevantContext(state, "validation decision", "decision");
  assert.equal(retrieved.insights[0].id, "insight-judgement");
});

test("Journey defaults to actual timestamp descending order and display numbering starts at newest", async () => {
  const sorted = sortJourneyNewestFirst(createDemoState().journey);
  assert.deepEqual(sorted.map((item) => item.createdAt.slice(5, 10)), ["08-26", "08-20", "08-12"]);
  const journeyUi = await readFile(new URL("../app/living-model/JourneyPage.tsx", import.meta.url), "utf8");
  assert.match(journeyUi, /String\(index \+ 1\)/);
  assert.match(journeyUi, /earliest to current/);
});

test("Search is case-insensitive and covers title, body, direction, context, revisions, facts, observations and reflections", () => {
  const state = createDemoState();
  assert.ok(searchLivingModel(state, "VALIDATION").some((item) => item.type === "Understanding" && item.title.includes("Judgement and validation")));
  assert.ok(searchLivingModel(state, "VALIDATION").some((item) => item.type === "Direction"));
  assert.ok(searchLivingModel(state, "expertise").some((item) => item.type === "Understanding"));
  assert.ok(searchLivingModel(state, "enough time to test").some((item) => item.type === "Understanding"));
  assert.ok(searchLivingModel(state, "I stop trusting").some((item) => item.type === "Journey revision"));
  assert.ok(searchLivingModel(state, "internship").some((item) => item.type === "Fact"));
  assert.ok(searchLivingModel(state, "External approval").some((item) => item.type === "Observation"));
  assert.ok(searchLivingModel(state, "mentor questioned").some((item) => item.type === "Reflection"));
});

test("Search excludes rejected, archived and forgotten records from active results", () => {
  const state = createDemoState();
  state.insights[0].status = "archived";
  state.facts[0].forgotten = true;
  state.insights.push({ ...state.insights[1], id: "rejected-search", title: "Rejected validation", statement: state.rejectedInterpretations[0].statement });
  assert.equal(searchLivingModel(state, "Judgement and validation").length, 0);
  assert.equal(searchLivingModel(state, "internship").length, 0);
  assert.equal(searchLivingModel(state, "Rejected validation").length, 0);
});

test("Onboarding starts with no goals and explicitly chooses empty or sample ownership", async () => {
  const empty = livingModelReducer(createDemoState(), { type: "COMPLETE_ONBOARDING", reasons: [], preferences: createEmptyState().preferences, demoChoice: "empty" });
  const sample = livingModelReducer(createEmptyState(), { type: "COMPLETE_ONBOARDING", reasons: [], preferences: createEmptyState().preferences, demoChoice: "sample" });
  assert.deepEqual(empty.onboardingReasons, []);
  assert.equal(empty.sampleDataLoaded, false);
  assert.equal(empty.insights.length, 0);
  assert.equal(sample.sampleDataLoaded, true);
  assert.equal(sample.hasPersonalUnderstanding, false);
  const onboarding = await readFile(new URL("../app/living-model/OnboardingFlow.tsx", import.meta.url), "utf8");
  const messages = await readFile(new URL("../app/locale/messages.ts", import.meta.url), "utf8");
  assert.match(onboarding, /useState<string\[]>\(\[\]\)/);
  for (const copy of ["Start empty", "Load sample mirror", "Sample person", "Example history"]) assert.ok(messages.includes(copy));
});

test("first accepted understanding unlocks personal ownership copy without erasing sample labelling", () => {
  let { state, session } = withSession();
  assert.equal(state.hasPersonalUnderstanding, false);
  state = livingModelReducer(state, { type: "ACCEPT_CANDIDATE", sessionId: session.id, now: stamp });
  assert.equal(state.hasPersonalUnderstanding, true);
  assert.equal(state.sampleDataLoaded, true);
});

test("Real endpoint keeps state, component, eligibility and persistence deterministic and only lets the model rephrase copy", async () => {
  const endpoint = await readFile(new URL("../app/api/living-reflection/route.ts", import.meta.url), "utf8");
  for (const state of ["LISTEN", "CLARIFY", "STRUCTURE", "EXPLORE", "RESOLVE", "REFLECT"]) assert.ok(endpoint.includes(state));
  for (const component of ["editable_summary", "contextual_tension", "perspective_split", "unsaid", "candidate_understanding"]) assert.ok(endpoint.includes(component));
  assert.match(endpoint, /OPENAI_API_KEY/);
  assert.match(endpoint, /INNER_MIRROR_LIVING_MODEL/);
  assert.match(endpoint, /deterministic plan already owns state, component selection, retrieval, candidate eligibility, exclusions, and persistence/);
  assert.doesNotMatch(endpoint, /dangerouslySetInnerHTML|arbitrary_html/);
  assert.match(endpoint, /export async function GET/);
  assert.match(endpoint, /falling_back/);
});

test("Real API status is explicit and Demo fallback is never presented as connected", async () => {
  let state = createEmptyState();
  state = livingModelReducer(state, { type: "SET_AGENT_RUNTIME_STATUS", status: "falling_back", checkedAt: stamp });
  assert.equal(state.agentRuntimeStatus, "falling_back");
  assert.equal(state.agentStatusCheckedAt, stamp);
  const [settings, shell] = await Promise.all([
    readFile(new URL("../app/living-model/CommunicationSettingsPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/living-model/LivingShell.tsx", import.meta.url), "utf8"),
  ]);
  for (const label of ["Connected", "Falling back", "Unavailable", "Demo fallback"]) assert.ok(settings.includes(label));
  assert.ok(shell.includes('t("shell.demoFallback")'));
});

test("Agent clarification changes with context and an under-evidenced feeling never receives the decision loss prompt", async () => {
  const reflection = await readFile(new URL("../app/living-model/ReflectionPage.tsx", import.meta.url), "utf8");
  assert.ok(reflection.includes("What feels hardest to lose here?"));
  assert.ok(reflection.includes("What would help you stay with this feeling without explaining it away?"));
  const feelingEntry = reflection.slice(reflection.indexOf("feeling:"), reflection.indexOf("repeating:"));
  assert.doesNotMatch(feelingEntry, /hardest to lose/);
});

test("Agent Trace is acceptance-gated and exposes the complete structured orchestration trace", async () => {
  const reflection = await readFile(new URL("../app/living-model/ReflectionPage.tsx", import.meta.url), "utf8");
  assert.match(reflection, /NODE_ENV !== "production" \|\| params\.get\("trace"\) === "1"/);
  for (const label of ["Current state", "Selected component", "Retrieved source IDs", "Excluded rejected IDs", "Excluded archived IDs", "Schema validation", "Persistence action"]) assert.ok(reflection.includes(label));
});

test("state snapshots are optional, user-authored, contextual, editable and removable", () => {
  let state = createEmptyState();
  assert.equal(state.stateSnapshots.length, 0);
  const session = createReflectionSession("I am weighing a move this week.", "decision", state, "snapshot-session", stamp);
  state = livingModelReducer(state, { type: "START_REFLECTION", session });
  const pressure = createStateSnapshot(session, "pressure", 4, stamp);
  assert.equal(pressure.source, "user_self_report");
  assert.equal(pressure.contextKey, "decision");
  assert.equal(pressure.sessionId, session.id);
  state = livingModelReducer(state, { type: "UPSERT_STATE_SNAPSHOTS", sessionId: session.id, snapshots: [pressure] });
  assert.equal(state.stateSnapshots.length, 1);
  const edited = createStateSnapshot(session, "pressure", 2, "2026-08-30T12:00:00.000Z");
  state = livingModelReducer(state, { type: "UPSERT_STATE_SNAPSHOTS", sessionId: session.id, snapshots: [edited] });
  assert.equal(state.stateSnapshots.length, 1);
  assert.equal(state.stateSnapshots[0].value, 2);
  state = livingModelReducer(state, { type: "DELETE_STATE_SNAPSHOTS", sessionId: session.id });
  assert.equal(state.stateSnapshots.length, 0);
});

test("one state snapshot remains a point while two related snapshots produce an honest comparison", () => {
  let state = createEmptyState();
  const first = createReflectionSession("The same decision feels heavy.", "decision", state, "state-one", "2026-08-20T12:00:00.000Z");
  state = livingModelReducer(state, { type: "START_REFLECTION", session: first });
  state = livingModelReducer(state, { type: "UPSERT_STATE_SNAPSHOTS", sessionId: first.id, snapshots: [createStateSnapshot(first, "pressure", 4, first.createdAt)] });
  assert.equal(getMostRelevantSnapshotGroup(state).count, 1);
  assert.equal(getMostRelevantSnapshotGroup(state).metrics.find((item) => item.metricKey === "pressure").previous, undefined);
  const second = createReflectionSession("The same decision is clearer now.", "decision", state, "state-two", stamp);
  state = livingModelReducer(state, { type: "START_REFLECTION", session: second });
  state = livingModelReducer(state, { type: "UPSERT_STATE_SNAPSHOTS", sessionId: second.id, snapshots: [createStateSnapshot(second, "pressure", 2, stamp)] });
  const group = getMostRelevantSnapshotGroup(state);
  assert.equal(group.count, 2);
  assert.equal(group.metrics.find((item) => item.metricKey === "pressure").previous.value, 4);
  assert.match(describeStateChange("pressure", 4, 2), /lower/);
  assert.deepEqual(getSnapshotMoments(state).map((item) => item.sessionId), ["state-one", "state-two"]);
});

test("sample person owns sample snapshots while an empty mirror starts without inferred state", () => {
  assert.equal(createDemoState().stateSnapshots.length, 6);
  assert.equal(createDemoState().stateSnapshots.every((item) => item.source === "user_self_report"), true);
  assert.equal(createEmptyState().stateSnapshots.length, 0);
});

test("Now, Mirror and Journey expose visual evidence through progressive, linked views without scores", async () => {
  const [now, mirror, journey, capture] = await Promise.all([
    readFile(new URL("../app/living-model/NowPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/living-model/MirrorPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/living-model/JourneyPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/living-model/StateSnapshotCapture.tsx", import.meta.url), "utf8"),
  ]);
  for (const phrase of ["Current state", "One snapshot · No trend yet", "Self-reported"]) assert.ok(now.includes(phrase));
  for (const phrase of ["Evidence balance", "Supporting", "Counter-signals", "How this formed"]) assert.ok(mirror.includes(phrase));
  for (const phrase of ["Self-reported state", "Understanding revision", "Open evidence"]) assert.ok(journey.includes(phrase));
  for (const phrase of ["How does this feel right now?", "Save snapshot", "Skip", "Edit", "Remove snapshot"]) assert.ok(capture.includes(phrase));
  assert.doesNotMatch(`${now}${mirror}${journey}`, /confidence|accuracy|growth score|% change/i);
});

test("internal navigation disables unstable RSC prefetch while preserving destinations", async () => {
  const files = await Promise.all(["JourneyPage.tsx", "MirrorPage.tsx", "SearchPage.tsx"].map((name) => readFile(new URL(`../app/living-model/${name}`, import.meta.url), "utf8")));
  assert.equal(files.every((source) => !source.includes("<Link ") || source.includes("prefetch={false}")), true);
  assert.ok(files.some((source) => source.includes('href="/reflection"')));
});

test("safety language pauses interpretation", () => {
  assert.equal(hasImmediateSafetyRisk("I want to kill myself"), true);
  assert.equal(hasImmediateSafetyRisk("I need to make a hard career decision"), false);
  const state = createDemoState();
  const session = createReflectionSession("我不想活了", "feeling", state, "risk", stamp);
  assert.equal(session.outcome, "safety");
  assert.equal(session.state, "COMPLETE");
});

test("analytics abstraction includes the full requested lifecycle and activation excludes signup", () => {
  for (const name of ["candidate_insight_generated", "counter_signal_viewed", "insight_contextualized", "mirror_updated", "memory_forgotten"]) assert.ok(LIVING_ANALYTICS_EVENTS.includes(name));
  assert.equal(isActivationEvent("insight_accepted"), true);
  assert.equal(isActivationEvent("reflection_started"), false);
});

test("corrupt local state falls back to complete demo data", () => {
  assert.equal(loadLivingState("not-json").schemaVersion, 1);
  assert.ok(loadLivingState(JSON.stringify({ schemaVersion: 99 })).insights.length >= 4);
});

test("routes and UI implement the requested IA without turning root or V4 into the new product", async () => {
  const [shell, reflection, mirror, memory, root] = await Promise.all([
    readFile(new URL("../app/living-model/LivingShell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/living-model/ReflectionPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/living-model/MirrorPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/living-model/MemoryPrivacyPage.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  ]);
  const messages = await readFile(new URL("../app/locale/messages.ts", import.meta.url), "utf8");
  for (const label of ["Now", "Mirror", "Journey", "New Reflection", "Search", "Memory & Privacy", "Settings"]) assert.ok(messages.includes(label));
  for (const action of ["This fits", "Only in some situations", "Not quite", "Rewrite", "I don\\u0027t agree", "Show me why"]) assert.ok(reflection.includes(action));
  for (const detail of ["Current understanding", "Seems true when", "Seems less true when", "View evidence", "This isn\\u0027t me anymore"]) assert.ok(mirror.includes(detail));
  for (const layer of ["Facts", "Observations", "Interpretations", "Rejected interpretations"]) assert.ok(memory.includes(layer));
  assert.match(root, /InnerMirrorPhase1|redirect\("\/onboarding"\)/);
});
