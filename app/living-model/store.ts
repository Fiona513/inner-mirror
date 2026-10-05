import { createDemoState, createEmptyState } from "./demo-data.ts";
import type { AnalyticsEvent, Evidence, Insight, InsightVersion, JourneyEvent, LivingAction, LivingModelState, ReflectionSession } from "./types";

export const LIVING_MODEL_STORAGE_KEY = "inner-mirror-living-model-v1";

function event(name: string, now: string, properties: AnalyticsEvent["properties"] = {}): AnalyticsEvent {
  return { id: `event-${name}-${now}`, name, properties, createdAt: now };
}

function nextVersion(state: LivingModelState, insightId: string): number {
  return state.versions.filter((item) => item.insightId === insightId).length + 1;
}

function findSession(state: LivingModelState, sessionId: string): ReflectionSession | undefined {
  return state.sessions.find((item) => item.id === sessionId);
}

function candidateEvidence(state: LivingModelState, session: ReflectionSession): Evidence[] {
  if (!session.candidate) return [];
  const ids = new Set([...session.candidate.supportingEvidenceIds, ...session.candidate.counterSignalIds]);
  return state.evidence.filter((item) => ids.has(item.id));
}

function materializeCandidate(state: LivingModelState, session: ReflectionSession, statement: string, status: Insight["status"], appliesWhen: string[], doesNotApplyWhen: string[], now: string, source: "agent" | "user") {
  if (!session.candidate) return state;
  const insightId = `insight-${session.candidate.id}`;
  const existing = state.insights.find((item) => item.id === insightId);
  const evidence = candidateEvidence(state, session);
  const evidenceIds = evidence.map((item) => item.id);
  const insight: Insight = {
    id: insightId,
    category: session.candidate.category,
    title: session.candidate.title,
    statement,
    status,
    appliesWhen,
    doesNotApplyWhen,
    evidenceIds,
    firstSeenAt: existing?.firstSeenAt ?? now,
    lastRevisedAt: now,
    createdSource: source,
    userConfirmed: true,
  };
  const version: InsightVersion = {
    id: `version-${insightId}-${nextVersion(state, insightId)}`,
    insightId,
    versionNumber: nextVersion(state, insightId),
    statement,
    appliesWhen,
    doesNotApplyWhen,
    changedBy: source,
    createdAt: now,
  };
  const journey: JourneyEvent = {
    id: `journey-${insightId}-${now}`,
    type: existing ? "refined_understanding" : "new_understanding",
    insightId,
    title: existing ? "You refined an understanding" : "A new understanding entered your mirror",
    summary: status === "context_dependent" ? "You kept the pattern and made its boundaries explicit." : "You decided this was useful enough to keep, without making it a fixed identity.",
    previousStatement: existing?.statement,
    currentStatement: statement,
    createdAt: now,
    changedBy: source,
  };
  return {
    ...state,
    hasPersonalUnderstanding: true,
    insights: existing ? state.insights.map((item) => item.id === insightId ? insight : item) : [insight, ...state.insights],
    evidence: state.evidence.map((item) => evidenceIds.includes(item.id) ? { ...item, insightId } : item),
    versions: [...state.versions, version],
    journey: [journey, ...state.journey],
    analytics: [...state.analytics, event("mirror_updated", now, { status }), event(existing ? "insight_revision_created" : "candidate_insight_generated", now)],
  };
}

export function livingModelReducer(state: LivingModelState, action: LivingAction): LivingModelState {
  switch (action.type) {
    case "HYDRATE":
      return action.state;
    case "SET_MODE":
      return { ...state, mode: action.mode };
    case "SET_AGENT_RUNTIME_STATUS":
      return { ...state, agentRuntimeStatus: action.status, agentStatusCheckedAt: action.checkedAt };
    case "COMPLETE_ONBOARDING": {
      const now = new Date().toISOString();
      const base = action.demoChoice === "sample" ? createDemoState() : createEmptyState();
      return {
        ...base,
        mode: state.mode,
        onboarded: true,
        onboardingReasons: action.reasons,
        preferences: action.preferences,
        analytics: [...base.analytics, event("onboarding_completed", now, { demo_choice: action.demoChoice })],
      };
    }
    case "START_REFLECTION": {
      const currentEvidence: Evidence = { id: `evidence-${action.session.id}-current`, sourceType: "reflection", sourceId: action.session.id, excerpt: action.session.input, relationship: "supporting", context: `${action.session.context} · current reflection`, createdAt: action.session.createdAt };
      return { ...state, sessions: [action.session, ...state.sessions], evidence: [currentEvidence, ...state.evidence], analytics: [...state.analytics, event("reflection_started", action.session.createdAt, { context: action.session.context })] };
    }
    case "UPDATE_SESSION":
      return { ...state, sessions: state.sessions.map((item) => item.id === action.sessionId ? { ...item, ...action.patch } : item) };
    case "UPSERT_STATE_SNAPSHOTS": {
      const metricKeys = new Set(action.snapshots.map((item) => item.metricKey));
      const retained = state.stateSnapshots.filter((item) => item.sessionId !== action.sessionId || !metricKeys.has(item.metricKey));
      return { ...state, stateSnapshots: [...action.snapshots, ...retained] };
    }
    case "DELETE_STATE_SNAPSHOTS":
      return { ...state, stateSnapshots: state.stateSnapshots.filter((item) => item.sessionId !== action.sessionId) };
    case "ACCEPT_CANDIDATE": {
      const session = findSession(state, action.sessionId);
      if (!session?.candidate) return state;
      const updated = state.memoryPaused ? state : materializeCandidate(state, session, session.candidate.statement, "user_confirmed", session.candidate.appliesWhen, session.candidate.doesNotApplyWhen, action.now, "agent");
      return { ...updated, sessions: updated.sessions.map((item) => item.id === action.sessionId ? { ...item, state: "COMPLETE", outcome: "accepted", updatedAt: action.now } : item), analytics: [...updated.analytics, event("insight_accepted", action.now)] };
    }
    case "CONTEXTUALIZE_CANDIDATE": {
      const session = findSession(state, action.sessionId);
      if (!session?.candidate) return state;
      const updated = state.memoryPaused ? state : materializeCandidate(state, session, session.candidate.statement, "context_dependent", action.appliesWhen, action.doesNotApplyWhen, action.now, "user");
      return { ...updated, sessions: updated.sessions.map((item) => item.id === action.sessionId ? { ...item, state: "COMPLETE", outcome: "contextualized", updatedAt: action.now } : item), analytics: [...updated.analytics, event("insight_contextualized", action.now)] };
    }
    case "REWRITE_CANDIDATE": {
      const session = findSession(state, action.sessionId);
      if (!session?.candidate || !action.statement.trim()) return state;
      const updated = state.memoryPaused ? state : materializeCandidate(state, session, action.statement.trim(), "user_confirmed", session.candidate.appliesWhen, session.candidate.doesNotApplyWhen, action.now, "user");
      return { ...updated, sessions: updated.sessions.map((item) => item.id === action.sessionId ? { ...item, state: "COMPLETE", outcome: "rewritten", updatedAt: action.now } : item), analytics: [...updated.analytics, event("insight_rewritten", action.now)] };
    }
    case "REJECT_CANDIDATE": {
      const session = findSession(state, action.sessionId);
      if (!session?.candidate) return state;
      return {
        ...state,
        sessions: state.sessions.map((item) => item.id === action.sessionId ? { ...item, state: "COMPLETE", outcome: "rejected", updatedAt: action.now } : item),
        rejectedInterpretations: [...state.rejectedInterpretations, { id: `rejection-${session.candidate.id}`, candidateId: session.candidate.id, statement: session.candidate.statement, context: session.input, rejectedAt: action.now }],
        analytics: [...state.analytics, event("insight_rejected", action.now)],
      };
    }
    case "EDIT_INSIGHT": {
      const insight = state.insights.find((item) => item.id === action.insightId);
      if (!insight || !action.statement.trim()) return state;
      const versionNumber = nextVersion(state, insight.id);
      const version: InsightVersion = { id: `version-${insight.id}-${versionNumber}`, insightId: insight.id, versionNumber, statement: action.statement.trim(), appliesWhen: insight.appliesWhen, doesNotApplyWhen: insight.doesNotApplyWhen, changedBy: "user", changeReason: action.reason, createdAt: action.now };
      const journey: JourneyEvent = { id: `journey-edit-${insight.id}-${action.now}`, type: "refined_understanding", insightId: insight.id, title: "You rewrote an understanding", summary: action.reason || "The wording now belongs more clearly to you.", previousStatement: insight.statement, currentStatement: action.statement.trim(), createdAt: action.now, changedBy: "user" };
      return { ...state, insights: state.insights.map((item) => item.id === insight.id ? { ...item, statement: action.statement.trim(), lastRevisedAt: action.now, createdSource: "user" } : item), versions: [...state.versions, version], journey: [journey, ...state.journey], analytics: [...state.analytics, event("insight_revision_created", action.now)] };
    }
    case "CONTEXTUALIZE_INSIGHT": {
      const insight = state.insights.find((item) => item.id === action.insightId);
      if (!insight) return state;
      const versionNumber = nextVersion(state, insight.id);
      const version: InsightVersion = { id: `version-${insight.id}-${versionNumber}`, insightId: insight.id, versionNumber, statement: insight.statement, appliesWhen: action.appliesWhen, doesNotApplyWhen: action.doesNotApplyWhen, changedBy: "user", changeReason: "Context made more specific", createdAt: action.now };
      return { ...state, insights: state.insights.map((item) => item.id === insight.id ? { ...item, status: "context_dependent", appliesWhen: action.appliesWhen, doesNotApplyWhen: action.doesNotApplyWhen, lastRevisedAt: action.now } : item), versions: [...state.versions, version], journey: [{ id: `journey-context-${insight.id}-${action.now}`, type: "context_changed", insightId: insight.id, title: "You made the context more precise", summary: "The understanding now includes where it does and does not fit.", currentStatement: insight.statement, createdAt: action.now, changedBy: "user" }, ...state.journey], analytics: [...state.analytics, event("insight_contextualized", action.now)] };
    }
    case "CONFIRM_CHANGE": {
      const insight = state.insights.find((item) => item.id === action.insightId);
      if (!insight || insight.status !== "changing") return state;
      return {
        ...state,
        insights: state.insights.map((item) => item.id === insight.id ? { ...item, status: "user_confirmed", userConfirmed: true, lastRevisedAt: action.now } : item),
        journey: [{ id: `journey-change-confirmed-${insight.id}-${action.now}`, type: "understanding_changed", insightId: insight.id, title: "You confirmed that an understanding has changed", summary: "New and counter evidence remain attached to the updated understanding.", currentStatement: insight.statement, createdAt: action.now, changedBy: "user" }, ...state.journey],
        analytics: [...state.analytics, event("change_confirmed", action.now), event("mirror_updated", action.now, { status: "user_confirmed" })],
      };
    }
    case "ARCHIVE_INSIGHT": {
      const insight = state.insights.find((item) => item.id === action.insightId);
      if (!insight) return state;
      const changed = action.reason === "changed";
      const journey = changed ? [{ id: `journey-archive-${insight.id}-${action.now}`, type: "understanding_changed" as const, insightId: insight.id, title: "An understanding no longer fits in the same way", summary: action.note || "You marked this as something that used to fit.", previousStatement: insight.statement, createdAt: action.now, changedBy: "user" as const }, ...state.journey] : state.journey;
      return { ...state, insights: state.insights.map((item) => item.id === insight.id ? { ...item, status: "archived", archivedReason: action.reason, lastRevisedAt: action.now } : item), journey };
    }
    case "EDIT_FACT":
      return { ...state, facts: state.facts.map((item) => item.id === action.factId ? { ...item, statement: action.statement, updatedAt: action.now } : item) };
    case "FORGET_FACT":
      return { ...state, facts: state.facts.map((item) => item.id === action.factId ? { ...item, forgotten: true } : item), evidence: state.evidence.map((item) => item.sourceId === action.factId ? { ...item, forgotten: true } : item), analytics: [...state.analytics, event("memory_forgotten", new Date().toISOString(), { kind: "fact" })] };
    case "FORGET_OBSERVATION":
      return { ...state, observations: state.observations.map((item) => item.id === action.observationId ? { ...item, forgotten: true } : item), evidence: state.evidence.map((item) => item.sourceId === action.observationId ? { ...item, forgotten: true } : item), analytics: [...state.analytics, event("memory_forgotten", new Date().toISOString(), { kind: "observation" })] };
    case "CHALLENGE_OBSERVATION":
      return { ...state, observations: state.observations.map((item) => item.id === action.observationId ? { ...item, disputed: true } : item) };
    case "TOGGLE_MEMORY":
      return { ...state, memoryPaused: action.paused, analytics: [...state.analytics, event("memory_paused", new Date().toISOString(), { paused: action.paused })] };
    case "UPDATE_PREFERENCES":
      return { ...state, preferences: action.preferences };
    case "UPDATE_DIRECTION": {
      const direction = state.directions.find((item) => item.id === action.directionId);
      if (!direction) return state;
      return { ...state, directions: state.directions.map((item) => item.id === action.directionId ? { ...item, status: action.status, updatedAt: action.now } : item), journey: [{ id: `journey-direction-${direction.id}-${action.now}`, type: "direction_changed", title: "A direction changed", summary: `“${direction.statement}” is now marked ${action.status.replaceAll("_", " ")}.`, createdAt: action.now, changedBy: "user" }, ...state.journey] };
    }
    case "RESET_DEMO":
      return createDemoState();
    default:
      return state;
  }
}

export function loadLivingState(raw: string | null): LivingModelState {
  if (!raw) return createDemoState();
  try {
    const parsed = JSON.parse(raw) as LivingModelState;
    if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.insights) || !Array.isArray(parsed.evidence)) return createDemoState();
    return {
      ...parsed,
      agentRuntimeStatus: parsed.agentRuntimeStatus ?? "unavailable",
      sampleDataLoaded: parsed.sampleDataLoaded ?? parsed.insights.some((item) => item.id === "insight-judgement"),
      hasPersonalUnderstanding: parsed.hasPersonalUnderstanding ?? parsed.insights.some((item) => item.id.startsWith("insight-candidate-")),
      sessions: parsed.sessions.map((session) => ({ ...session, agentTrace: session.agentTrace ?? [] })),
      stateSnapshots: parsed.stateSnapshots ?? [],
    };
  } catch {
    return createDemoState();
  }
}
