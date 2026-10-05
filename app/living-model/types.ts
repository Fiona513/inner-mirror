export type AgentState = "LISTEN" | "CLARIFY" | "STRUCTURE" | "EXPLORE" | "RESOLVE" | "REFLECT" | "COMPLETE";

export type EvidenceState =
  | "single_signal"
  | "recurring_signal"
  | "user_confirmed"
  | "context_dependent"
  | "changing"
  | "disputed"
  | "archived";

export type InsightCategory = "what_matters" | "what_i_need" | "patterns" | "tensions" | "boundaries" | "directions";
export type EvidenceRelationship = "supporting" | "counter_signal";
export type KnowledgeKind = "fact" | "observation" | "interpretation";
export type ReflectionContext = "decision" | "feeling" | "repeating" | "explore";
export type ReflectionTool = "contextual_tension" | "perspective_split" | "unsaid";
export type AgentRuntimeStatus = "connected" | "unavailable" | "falling_back";
export type StateMetricKey = "pressure" | "clarity";
export type AgentComponentType = "reflection_text" | "editable_summary" | "contextual_tension" | "perspective_split" | "unsaid" | "candidate_understanding";
export type JourneyEventType =
  | "new_understanding"
  | "refined_understanding"
  | "context_changed"
  | "contradiction_found"
  | "understanding_changed"
  | "direction_changed";

export interface CommunicationPreferences {
  tone: number;
  depth: number;
  practicalSuggestions: boolean;
  notes: string;
}

export interface Fact {
  id: string;
  statement: string;
  context: string;
  createdAt: string;
  updatedAt: string;
  forgotten: boolean;
}

export interface Observation {
  id: string;
  statement: string;
  sourceSessionIds: string[];
  createdAt: string;
  disputed: boolean;
  forgotten: boolean;
}

export interface Evidence {
  id: string;
  insightId?: string;
  sourceType: "reflection" | "fact" | "observation";
  sourceId: string;
  excerpt: string;
  relationship: EvidenceRelationship;
  context: string;
  createdAt: string;
  forgotten?: boolean;
}

export interface InsightVersion {
  id: string;
  insightId: string;
  versionNumber: number;
  statement: string;
  appliesWhen: string[];
  doesNotApplyWhen: string[];
  changedBy: "agent" | "user";
  changeReason?: string;
  createdAt: string;
}

export interface Insight {
  id: string;
  category: InsightCategory;
  title: string;
  statement: string;
  status: EvidenceState;
  appliesWhen: string[];
  doesNotApplyWhen: string[];
  evidenceIds: string[];
  firstSeenAt: string;
  lastRevisedAt: string;
  createdSource: "agent" | "user";
  userConfirmed: boolean;
  archivedReason?: "changed" | "inaccurate" | "user_archived";
}

export interface CandidateUnderstanding {
  id: string;
  category: InsightCategory;
  title: string;
  statement: string;
  evidenceState: EvidenceState;
  supportingEvidenceIds: string[];
  counterSignalIds: string[];
  appliesWhen: string[];
  doesNotApplyWhen: string[];
}

export interface ReflectionStructure {
  reality: string;
  expectation: string;
  selfDoubt: string;
}

export interface ToolData {
  tensionPosition: number;
  leftLabel: string;
  rightLabel: string;
  leftContext: string;
  rightContext: string;
  difference: string;
  think: string;
  feel: string;
  fear: string;
  want: string;
  unsaid: string;
  keepUnsaidPrivate: boolean;
}

export interface ReflectionSession {
  id: string;
  input: string;
  context: ReflectionContext;
  state: AgentState;
  clarification?: string;
  structure: ReflectionStructure;
  tool: ReflectionTool;
  toolData: ToolData;
  nextStep: string;
  candidate?: CandidateUnderstanding;
  agentTrace?: AgentTraceEntry[];
  outcome?: "accepted" | "contextualized" | "rewritten" | "rejected" | "resolved_only" | "safety";
  createdAt: string;
  updatedAt: string;
}

export interface StateSnapshot {
  id: string;
  sessionId: string;
  metricKey: StateMetricKey;
  label: string;
  value: 1 | 2 | 3 | 4 | 5;
  source: "user_self_report";
  context: string;
  contextKey: ReflectionContext;
  capturedAt: string;
}

export interface AgentTraceEntry {
  currentState: AgentState;
  selectedComponentType: AgentComponentType;
  retrievedSourceIds: string[];
  excludedRejectedIds: string[];
  excludedArchivedIds: string[];
  schemaValidationResult: "passed" | "fallback";
  persistenceAction: "session_updated" | "candidate_proposed" | "session_only" | "session_completed_without_insight";
}

export interface RejectedInterpretation {
  id: string;
  candidateId: string;
  statement: string;
  context: string;
  rejectedAt: string;
}

export interface JourneyEvent {
  id: string;
  type: JourneyEventType;
  insightId?: string;
  title: string;
  summary: string;
  previousStatement?: string;
  currentStatement?: string;
  createdAt: string;
  changedBy: "agent" | "user";
}

export interface Direction {
  id: string;
  statement: string;
  status: "exploring" | "still_matters" | "unsure" | "no_longer";
  updatedAt: string;
}

export interface AnalyticsEvent {
  id: string;
  name: string;
  properties: Record<string, string | number | boolean>;
  createdAt: string;
}

export interface LivingModelState {
  schemaVersion: 1;
  mode: "demo" | "real";
  agentRuntimeStatus: AgentRuntimeStatus;
  agentStatusCheckedAt?: string;
  onboarded: boolean;
  onboardingReasons: string[];
  sampleDataLoaded: boolean;
  hasPersonalUnderstanding: boolean;
  memoryPaused: boolean;
  preferences: CommunicationPreferences;
  sessions: ReflectionSession[];
  stateSnapshots: StateSnapshot[];
  facts: Fact[];
  observations: Observation[];
  insights: Insight[];
  evidence: Evidence[];
  versions: InsightVersion[];
  rejectedInterpretations: RejectedInterpretation[];
  journey: JourneyEvent[];
  directions: Direction[];
  analytics: AnalyticsEvent[];
}

export type LivingAction =
  | { type: "HYDRATE"; state: LivingModelState }
  | { type: "SET_MODE"; mode: LivingModelState["mode"] }
  | { type: "SET_AGENT_RUNTIME_STATUS"; status: AgentRuntimeStatus; checkedAt: string }
  | { type: "COMPLETE_ONBOARDING"; reasons: string[]; preferences: CommunicationPreferences; demoChoice: "empty" | "sample" }
  | { type: "START_REFLECTION"; session: ReflectionSession }
  | { type: "UPDATE_SESSION"; sessionId: string; patch: Partial<ReflectionSession> }
  | { type: "UPSERT_STATE_SNAPSHOTS"; sessionId: string; snapshots: StateSnapshot[] }
  | { type: "DELETE_STATE_SNAPSHOTS"; sessionId: string }
  | { type: "ACCEPT_CANDIDATE"; sessionId: string; now: string }
  | { type: "CONTEXTUALIZE_CANDIDATE"; sessionId: string; appliesWhen: string[]; doesNotApplyWhen: string[]; now: string }
  | { type: "REWRITE_CANDIDATE"; sessionId: string; statement: string; now: string }
  | { type: "REJECT_CANDIDATE"; sessionId: string; now: string }
  | { type: "EDIT_INSIGHT"; insightId: string; statement: string; reason?: string; now: string }
  | { type: "CONTEXTUALIZE_INSIGHT"; insightId: string; appliesWhen: string[]; doesNotApplyWhen: string[]; now: string }
  | { type: "CONFIRM_CHANGE"; insightId: string; now: string }
  | { type: "ARCHIVE_INSIGHT"; insightId: string; reason: "changed" | "inaccurate" | "user_archived"; note?: string; now: string }
  | { type: "EDIT_FACT"; factId: string; statement: string; now: string }
  | { type: "FORGET_FACT"; factId: string }
  | { type: "FORGET_OBSERVATION"; observationId: string }
  | { type: "CHALLENGE_OBSERVATION"; observationId: string }
  | { type: "TOGGLE_MEMORY"; paused: boolean }
  | { type: "UPDATE_PREFERENCES"; preferences: CommunicationPreferences }
  | { type: "UPDATE_DIRECTION"; directionId: string; status: Direction["status"]; now: string }
  | { type: "RESET_DEMO" };
