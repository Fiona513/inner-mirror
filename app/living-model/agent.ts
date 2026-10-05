import type { AgentComponentType, AgentState, AgentTraceEntry, CandidateUnderstanding, Evidence, LivingModelState, ReflectionContext, ReflectionSession, ReflectionStructure, ReflectionTool, ToolData } from "./types";

const CRISIS_PATTERNS = ["kill myself", "suicide", "end my life", "hurt myself", "自杀", "轻生", "伤害自己", "不想活"];
const SENSITIVE_IDENTITY_PATTERNS = ["diagnosis", "bipolar", "adhd", "depression", "性取向", "宗教", "政治立场", "种族"];

export function hasImmediateSafetyRisk(input: string): boolean {
  const normalized = input.toLowerCase();
  return CRISIS_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function containsSensitiveIdentityInference(statement: string): boolean {
  const normalized = statement.toLowerCase();
  return SENSITIVE_IDENTITY_PATTERNS.some((pattern) => normalized.includes(pattern));
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function getStructure(input: string, context: ReflectionContext): ReflectionStructure {
  const trimmed = input.trim();
  const map: Record<ReflectionContext, ReflectionStructure> = {
    decision: {
      reality: trimmed || "There is a real decision in front of me, and neither direction is cost-free.",
      expectation: "Other people's needs or expectations may be present, but they are not the whole decision.",
      selfDoubt: "I am unsure which concern belongs to the situation and which one is making me distrust myself.",
    },
    feeling: {
      reality: trimmed || "Something happened and the feeling has not settled yet.",
      expectation: "Part of me is already managing how this feeling might affect someone else.",
      selfDoubt: "I am not yet sure whether I can trust what the feeling is asking for.",
    },
    repeating: {
      reality: trimmed || "A similar kind of tension has appeared more than once.",
      expectation: "I may be trying to handle it in the way that creates the least disruption.",
      selfDoubt: "I am unsure what is actually repeating: the situation, my response, or the meaning I give it.",
    },
    explore: {
      reality: trimmed || "Something is taking up space, even if I cannot name its shape yet.",
      expectation: "I do not need to make this coherent for anyone else yet.",
      selfDoubt: "Not knowing what it means is allowed to be part of the reflection.",
    },
  };
  return map[context];
}

function getTool(context: ReflectionContext, input = ""): ReflectionTool {
  if (context === "decision") return "contextual_tension";
  if (context === "explore") return "unsaid";
  if (context === "repeating" && /say|said|tell|told|reaction|conversation|表达|说出口|回应/i.test(input)) return "unsaid";
  return "perspective_split";
}

function getToolData(context: ReflectionContext): ToolData {
  return {
    tensionPosition: 50,
    leftLabel: context === "decision" ? "What feels like mine" : "What I can name",
    rightLabel: context === "decision" ? "What feels secure" : "What I am managing",
    leftContext: "When I have enough room to test what I actually prefer.",
    rightContext: "When the consequences affect people or commitments I care about.",
    difference: "This time, the tension may be less about the options and more about who gets to define a valid reason.",
    think: "I should be able to explain this clearly before I act.",
    feel: "Pulled in more than one direction.",
    fear: "That saying it plainly will create a reaction I cannot manage.",
    want: "To know what is mine before deciding what to do with it.",
    unsaid: "",
    keepUnsaidPrivate: true,
  };
}

export function buildCandidate(context: ReflectionContext, evidence: Evidence[]): CandidateUnderstanding {
  const byContext: Record<ReflectionContext, Pick<CandidateUnderstanding, "category" | "title" | "statement" | "appliesWhen" | "doesNotApplyWhen">> = {
    decision: {
      category: "tensions",
      title: "Preference and permission",
      statement: "When your own preference and an important expectation pull apart, you may start evaluating whether your preference is valid before asking what it needs.",
      appliesWhen: ["Someone whose judgement matters is affected by the choice"],
      doesNotApplyWhen: ["You can test the choice without needing immediate approval"],
    },
    feeling: {
      category: "patterns",
      title: "Feeling and reaction",
      statement: "When naming a feeling could change an important relationship, you may begin managing the other person's reaction before you finish understanding your own experience.",
      appliesWhen: ["The relationship feels important and the response is hard to predict"],
      doesNotApplyWhen: ["The relationship can hold disagreement without requiring immediate repair"],
    },
    repeating: {
      category: "patterns",
      title: "Explanation before preference",
      statement: "In recurring high-stakes situations, you may look for a defensible explanation before giving your own preference equal weight.",
      appliesWhen: ["The decision will be visible to people whose judgement matters"],
      doesNotApplyWhen: ["You have direct experience and room to revise"],
    },
    explore: {
      category: "what_i_need",
      title: "Room before meaning",
      statement: "When something is still unclear, keeping it private for a moment may help you notice what is true before you decide how to explain it.",
      appliesWhen: ["The experience is new or not ready to be shared"],
      doesNotApplyWhen: ["Privacy turns into avoiding support you actually want"],
    },
  };
  const selected = byContext[context];
  const supporting = evidence.filter((item) => item.relationship === "supporting").slice(0, 3).map((item) => item.id);
  const counter = evidence.filter((item) => item.relationship === "counter_signal").slice(0, 2).map((item) => item.id);
  return {
    id: createId("candidate"),
    ...selected,
    evidenceState: supporting.length >= 2 ? "recurring_signal" : "single_signal",
    supportingEvidenceIds: supporting,
    counterSignalIds: counter,
  };
}

export function createReflectionSession(input: string, context: ReflectionContext, state: LivingModelState, id = createId("reflection"), now = new Date().toISOString()): ReflectionSession {
  const relevant = retrieveRelevantContext(state, input, context);
  const historicalSupport = relevant.evidence.filter((item) => item.relationship === "supporting");
  const explicitCounter = hasExplicitCounterexample(input);
  const candidate = historicalSupport.length ? buildCandidate(context, relevant.evidence) : undefined;
  if (candidate) {
    candidate.supportingEvidenceIds = [`evidence-${id}-current`, ...candidate.supportingEvidenceIds].slice(0, 3);
    if (explicitCounter) narrowCandidateForCounterexample(candidate, input, historicalSupport.length);
  }
  return {
    id,
    input: input.trim(),
    context,
    state: hasImmediateSafetyRisk(input) ? "COMPLETE" : "LISTEN",
    structure: getStructure(input, context),
    tool: getTool(context, input),
    toolData: getToolData(context),
    nextStep: context === "decision" ? "Name one small test that gives you information without pretending the whole decision is final." : "Write one sentence that is true before making it useful to anyone else.",
    candidate,
    agentTrace: [],
    outcome: hasImmediateSafetyRisk(input) ? "safety" : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

export function retrieveRelevantContext(state: LivingModelState, input: string, context: ReflectionContext) {
  const words = new Set(input.toLowerCase().split(/\W+/).filter((word) => word.length > 3));
  const isRejected = (statement: string) => state.rejectedInterpretations.some((item) => item.statement === statement);
  const rejectedStatements = new Set(state.rejectedInterpretations.map((item) => item.statement));
  const excludedRejectedIds = state.insights.filter((item) => rejectedStatements.has(item.statement)).map((item) => item.id);
  const excludedArchivedIds = state.insights.filter((item) => item.status === "archived").map((item) => item.id);
  const facts = state.facts.filter((item) => !item.forgotten).sort((a, b) => relevanceScore(b.statement, b.context, words) - relevanceScore(a.statement, a.context, words)).slice(0, 4);
  const observations = state.observations.filter((item) => !item.forgotten && !item.disputed).sort((a, b) => relevanceScore(b.statement, "", words) - relevanceScore(a.statement, "", words)).slice(0, 4);
  const insights = state.insights
    .filter((item) => item.status !== "archived" && item.status !== "disputed" && item.userConfirmed && !isRejected(item.statement))
    .sort((a, b) => Number(lastChangedByUser(state, b.id)) - Number(lastChangedByUser(state, a.id)))
    .slice(0, 4);
  const allowedSourceIds = new Set([...facts.map((item) => item.id), ...observations.map((item) => item.id), ...state.sessions.map((item) => item.id)]);
  const allowedInsightIds = new Set(insights.map((item) => item.id));
  const rejectedSessionIds = new Set(state.sessions.filter((item) => item.outcome === "rejected").map((item) => item.id));
  const evidence = state.evidence.filter((item) => !item.forgotten && allowedSourceIds.has(item.sourceId) && !rejectedSessionIds.has(item.sourceId) && (!item.insightId || allowedInsightIds.has(item.insightId)));
  const contextTerm = context === "decision" ? "career" : context === "repeating" ? "school" : "reflection";
  const contextualSupporting = evidence.filter((item) => item.relationship === "supporting" && (item.context.toLowerCase().includes(contextTerm) || relevanceScore(item.excerpt, item.context, words) > 0));
  const supportingFallback = context === "decision" || context === "repeating"
    ? evidence.filter((item) => item.relationship === "supporting")
    : evidence.filter((item) => item.relationship === "supporting" && relevanceScore(item.excerpt, item.context, words) > 0);
  const supporting = (contextualSupporting.length ? contextualSupporting : supportingFallback).slice(0, 3);
  const counterSignals = evidence.filter((item) => item.relationship === "counter_signal").slice(0, 2);
  const selectedEvidence = [...supporting, ...counterSignals].filter((item, index, list) => list.findIndex((other) => other.id === item.id) === index);
  return { facts, observations, insights, evidence: selectedEvidence, excludedRejectedIds, excludedArchivedIds };
}

function relevanceScore(statement: string, context: string, words: Set<string>): number {
  const haystack = `${statement} ${context}`.toLowerCase();
  return [...words].reduce((score, word) => score + Number(haystack.includes(word)), 0);
}

function lastChangedByUser(state: LivingModelState, insightId: string): boolean {
  const versions = state.versions.filter((item) => item.insightId === insightId).sort((a, b) => b.versionNumber - a.versionNumber);
  return versions[0]?.changedBy === "user" || state.insights.find((item) => item.id === insightId)?.createdSource === "user";
}

export function hasExplicitCounterexample(input: string): boolean {
  return /counterexample|not always|except when|but this time|actually i did|that wasn't true|反例|并不总是|但这次|其实我有|不符合/i.test(input);
}

function narrowCandidateForCounterexample(candidate: CandidateUnderstanding, input: string, historicalSupportCount: number) {
  candidate.evidenceState = historicalSupportCount >= 2 ? "changing" : "disputed";
  if (!candidate.appliesWhen.includes("The earlier supporting conditions are present")) {
    candidate.appliesWhen = [...candidate.appliesWhen, "The earlier supporting conditions are present"];
  }

  const counterexample = `Current counterexample: ${input.trim().slice(0, 180)}`;
  if (!candidate.doesNotApplyWhen.includes(counterexample)) {
    candidate.doesNotApplyWhen = [...candidate.doesNotApplyWhen, counterexample];
  }

  if (!candidate.statement.startsWith("In some situations,")) {
    candidate.statement = `In some situations, ${candidate.statement.charAt(0).toLowerCase()}${candidate.statement.slice(1)}`;
  }
}

export interface AgentDecision {
  current_state: AgentState;
  next_state: AgentState;
  response: string;
  ui: { type: AgentComponentType; data: Record<string, unknown> };
  candidate_insight: CandidateUnderstanding | null;
  safety: { state: "normal" | "high_risk" };
  trace: AgentTraceEntry;
}

const STATE_COMPONENT: Record<AgentState, AgentComponentType> = {
  LISTEN: "reflection_text",
  CLARIFY: "reflection_text",
  STRUCTURE: "editable_summary",
  EXPLORE: "perspective_split",
  RESOLVE: "reflection_text",
  REFLECT: "candidate_understanding",
  COMPLETE: "reflection_text",
};

function componentFor(session: ReflectionSession, nextState: AgentState): AgentComponentType {
  if (nextState !== "EXPLORE") return STATE_COMPONENT[nextState];
  return session.tool;
}

export function orchestrateAgentStep(state: LivingModelState, session: ReflectionSession, nextState: AgentState): AgentDecision {
  const retrieved = retrieveRelevantContext(state, session.input, session.context);
  const selectedComponentType = componentFor(session, nextState);
  const historicalSupport = retrieved.evidence.filter((item) => item.relationship === "supporting");
  const counterSignals = retrieved.evidence.filter((item) => item.relationship === "counter_signal");
  let candidate = session.candidate ? structuredClone(session.candidate) : null;
  if (nextState === "REFLECT") {
    if (!historicalSupport.length) candidate = null;
    else if (!candidate) {
      candidate = buildCandidate(session.context, retrieved.evidence);
      candidate.supportingEvidenceIds = [`evidence-${session.id}-current`, ...candidate.supportingEvidenceIds].slice(0, 3);
    }
    if (candidate && hasExplicitCounterexample(session.input)) narrowCandidateForCounterexample(candidate, session.input, historicalSupport.length);
    if (candidate && counterSignals.length >= candidate.supportingEvidenceIds.length && historicalSupport.length < 2) candidate = null;
  }
  const persistenceAction: AgentTraceEntry["persistenceAction"] = nextState === "REFLECT"
    ? candidate ? "candidate_proposed" : "session_only"
    : nextState === "COMPLETE" ? "session_completed_without_insight" : "session_updated";
  const trace: AgentTraceEntry = {
    currentState: nextState,
    selectedComponentType: nextState === "REFLECT" && !candidate ? "reflection_text" : selectedComponentType,
    retrievedSourceIds: retrieved.evidence.map((item) => item.sourceId),
    excludedRejectedIds: retrieved.excludedRejectedIds,
    excludedArchivedIds: retrieved.excludedArchivedIds,
    schemaValidationResult: "passed",
    persistenceAction,
  };
  const data: Record<string, unknown> = selectedComponentType === "editable_summary"
    ? { reality: session.structure.reality, expectation: session.structure.expectation, self_doubt: session.structure.selfDoubt }
    : selectedComponentType === "contextual_tension"
      ? { ...session.toolData }
      : selectedComponentType === "perspective_split" || selectedComponentType === "unsaid" ? { ...session.toolData } : {};
  return {
    current_state: session.state,
    next_state: nextState,
    response: nextState === "REFLECT" && !candidate
      ? "There is not enough independent evidence to add a self-understanding. The current reflection can still be complete."
      : "Stay with the current situation and use this canvas only as a revisable working view.",
    ui: { type: trace.selectedComponentType, data },
    candidate_insight: nextState === "REFLECT" ? candidate : null,
    safety: { state: hasImmediateSafetyRisk(session.input) ? "high_risk" : "normal" },
    trace,
  };
}

export function validateAgentDecision(value: unknown, expected?: AgentDecision): AgentDecision | null {
  if (!value || typeof value !== "object") return null;
  const decision = value as Partial<AgentDecision>;
  const states: AgentState[] = ["LISTEN", "CLARIFY", "STRUCTURE", "EXPLORE", "RESOLVE", "REFLECT", "COMPLETE"];
  const components: AgentComponentType[] = ["reflection_text", "editable_summary", "contextual_tension", "perspective_split", "unsaid", "candidate_understanding"];
  if (!states.includes(decision.current_state as AgentState) || !states.includes(decision.next_state as AgentState)) return null;
  if (typeof decision.response !== "string" || !decision.ui || !components.includes(decision.ui.type) || !decision.safety || !decision.trace) return null;
  if (!Array.isArray(decision.trace.retrievedSourceIds) || !Array.isArray(decision.trace.excludedRejectedIds) || !Array.isArray(decision.trace.excludedArchivedIds)) return null;
  if (decision.candidate_insight && containsSensitiveIdentityInference(decision.candidate_insight.statement)) return null;
  if (expected && (decision.next_state !== expected.next_state || decision.ui.type !== expected.ui.type || decision.trace.persistenceAction !== expected.trace.persistenceAction)) return null;
  return decision as AgentDecision;
}

export interface StructuredAgentOutput {
  intent: "decision_support" | "sense_making" | "emotional_clarity" | "open_reflection";
  session_state: "structure" | "explore" | "resolve" | "reflect";
  response: string;
  ui: { type: AgentComponentType; data: Record<string, unknown> };
  candidate_insight: CandidateUnderstanding | null;
  safety: { state: "normal" | "high_risk" };
}

const ALLOWED_UI = new Set<AgentComponentType>(["reflection_text", "editable_summary", "contextual_tension", "perspective_split", "unsaid", "candidate_understanding"]);

export function validateStructuredAgentOutput(value: unknown): StructuredAgentOutput | null {
  if (!value || typeof value !== "object") return null;
  const output = value as Partial<StructuredAgentOutput>;
  if (typeof output.response !== "string" || !output.ui || !ALLOWED_UI.has(output.ui.type) || !output.safety) return null;
  if (output.candidate_insight && containsSensitiveIdentityInference(output.candidate_insight.statement)) return null;
  return output as StructuredAgentOutput;
}

export function structuredFallback(): StructuredAgentOutput {
  return {
    intent: "sense_making",
    session_state: "structure",
    response: "I couldn't shape this into a new canvas right now. We can stay with what you shared and structure it together.",
    ui: { type: "reflection_text", data: {} },
    candidate_insight: null,
    safety: { state: "normal" },
  };
}
