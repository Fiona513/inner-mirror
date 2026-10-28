import {
  EXPLORATION_FEELINGS,
  EXPLORATION_NEEDS,
  composeFragmentObservation,
  getExplorationNeedOptions,
  getReason,
  getReturnChange,
  returnObservation,
} from "./content.ts";
import {
  V4_EXPERIENCE_SCHEMA_VERSION,
  type ExperienceEvent,
  type ExperienceEventName,
  type ExperienceSession,
  type ExperienceSignal,
  type ExplorationFeelingId,
  type ExplorationNeedId,
  type FragmentFeedback,
  type MbtiType,
  type ReturnChangeId,
  type TodayFragment,
  type TodayReasonId,
  type V4ExperienceState,
} from "./types.ts";

const MAX_LOCAL_EVENTS = 80;

export interface TransitionMeta {
  now: string;
  eventId: string;
  signalId?: string;
  sessionId?: string;
  fragmentId?: string;
}

export function createEmptyExperienceState(): V4ExperienceState {
  return {
    schemaVersion: V4_EXPERIENCE_SCHEMA_VERSION,
    currentState: "LANDING",
    currentSignals: [],
    sessions: [],
    fragments: [],
    innerWorld: { revision: 0, fragmentIds: [] },
    events: [],
  };
}

function appendEvent(
  state: V4ExperienceState,
  name: ExperienceEventName,
  meta: TransitionMeta,
  properties?: Record<string, string>,
): V4ExperienceState {
  const event: ExperienceEvent = {
    id: meta.eventId,
    name,
    createdAt: meta.now,
    sessionId: state.currentSession?.id ?? meta.sessionId,
    fragmentId: meta.fragmentId,
    properties,
  };
  return { ...state, events: [...state.events, event].slice(-MAX_LOCAL_EVENTS) };
}

export function recordVisit(
  state: V4ExperienceState,
  meta: TransitionMeta,
  returning: boolean,
) {
  let next = appendEvent(state, "landing_view", meta, { visitor: returning ? "returning" : "new" });
  if (returning) next = appendEvent(next, "return_visit", { ...meta, eventId: `${meta.eventId}:return` });
  return { ...next, lastVisit: meta.now };
}

export function setThinkingPreference(
  state: V4ExperienceState,
  mbtiType: MbtiType | undefined,
  meta: TransitionMeta,
) {
  let next: V4ExperienceState = {
    ...state,
    thinkingPreference: mbtiType
      ? { mbtiType, source: "self_reported", updatedAt: meta.now }
      : undefined,
    lastVisit: meta.now,
  };
  next = appendEvent(next, "thinking_preference_updated", meta, {
    preference: mbtiType ?? "not_used",
  });
  return next;
}

export function beginSession(state: V4ExperienceState, meta: TransitionMeta) {
  if (!meta.sessionId) throw new Error("A session id is required");
  const session: ExperienceSession = {
    id: meta.sessionId,
    status: "active",
    stage: "REASON",
    startedAt: meta.now,
    updatedAt: meta.now,
    signals: [],
    explorationActionCount: 0,
  };
  const next: V4ExperienceState = {
    ...state,
    currentState: "REASON",
    currentSignals: [],
    currentSession: session,
    lastVisit: meta.now,
  };
  return appendEvent(next, "start_exploration", meta);
}

function activeSession(state: V4ExperienceState) {
  if (!state.currentSession || state.currentSession.status !== "active") {
    throw new Error("No active V4 experience session");
  }
  return state.currentSession;
}

function withSession(state: V4ExperienceState, session: ExperienceSession): V4ExperienceState {
  return {
    ...state,
    currentState: session.stage,
    currentSignals: session.signals,
    currentSession: session,
    lastVisit: session.updatedAt,
  };
}

function makeSignal(
  meta: TransitionMeta,
  input: Omit<ExperienceSignal, "id" | "createdAt">,
): ExperienceSignal {
  if (!meta.signalId) throw new Error("A signal id is required");
  return { ...input, id: meta.signalId, createdAt: meta.now };
}

export function selectTodayReason(
  state: V4ExperienceState,
  reasonId: TodayReasonId,
  meta: TransitionMeta,
) {
  const current = activeSession(state);
  const reason = getReason(reasonId);
  if (!reason) throw new Error(`Unknown today reason: ${reasonId}`);
  const signal = makeSignal(meta, {
    kind: "reason",
    family: "today_reason",
    value: reasonId,
    label: reason.label,
  });
  const session: ExperienceSession = {
    ...current,
    stage: "FIRST_VALUE",
    reasonId,
    signals: [signal],
    firstValue: {
      observation: reason.firstValue,
      basisSignalIds: [signal.id],
      userFeedback: "unreviewed",
    },
    updatedAt: meta.now,
  };
  let next = withSession(state, session);
  next = appendEvent(next, "reason_selected", meta, { reason: reasonId });
  next = appendEvent(next, "first_value_seen", { ...meta, eventId: `${meta.eventId}:value` }, { reason: reasonId });
  return next;
}

export function correctFirstValue(state: V4ExperienceState, meta: TransitionMeta) {
  const current = activeSession(state);
  if (!current.reasonId || !current.firstValue) return state;
  const reason = getReason(current.reasonId);
  if (!reason) return state;
  const correctedObservation = current.previousFragmentId
    ? "那就不把上次的线索延续到今天。只记下：刚才那种变化描述并不贴近你。"
    : reason.correctedValue;
  const signal = makeSignal(meta, {
    kind: "correction",
    family: "user_correction",
    value: "not_like_me",
    label: "刚才那种理解不太像我",
  });
  const session: ExperienceSession = {
    ...current,
    signals: [...current.signals, signal],
    firstValue: {
      observation: correctedObservation,
      correctedFrom: current.firstValue.observation,
      basisSignalIds: [...current.firstValue.basisSignalIds, signal.id],
      userFeedback: "corrected",
    },
    updatedAt: meta.now,
  };
  return withSession(state, session);
}

export function continueExploration(state: V4ExperienceState, meta: TransitionMeta) {
  const current = activeSession(state);
  const session = { ...current, stage: "EXPLORE_ONE" as const, updatedAt: meta.now };
  let next = withSession(state, session);
  next = appendEvent(next, "continue_exploration", meta);
  next = appendEvent(next, "deep_exploration_started", { ...meta, eventId: `${meta.eventId}:deep` });
  return next;
}

export function setOptionalNote(state: V4ExperienceState, note: string, now: string) {
  const current = activeSession(state);
  const session = { ...current, optionalNote: note.slice(0, 280), updatedAt: now };
  return withSession(state, session);
}

export function answerFeeling(
  state: V4ExperienceState,
  feelingId: ExplorationFeelingId,
  meta: TransitionMeta,
) {
  const current = activeSession(state);
  const choice = EXPLORATION_FEELINGS.find((item) => item.id === feelingId);
  if (!choice) throw new Error(`Unknown exploration feeling: ${feelingId}`);
  const signal = makeSignal(meta, {
    kind: "exploration",
    family: "current_feeling",
    value: feelingId,
    label: choice.label,
  });
  const session: ExperienceSession = {
    ...current,
    stage: "EXPLORE_TWO",
    signals: [...current.signals.filter((item) => item.family !== signal.family), signal],
    explorationActionCount: Math.min(3, current.explorationActionCount + 1),
    updatedAt: meta.now,
  };
  return withSession(state, session);
}

export function answerNeedAndComplete(
  state: V4ExperienceState,
  needId: ExplorationNeedId,
  meta: TransitionMeta,
) {
  if (!state.currentSession || state.currentSession.status !== "active") return state;
  const current = activeSession(state);
  const feelingId = current.signals.find((item) => item.family === "current_feeling")?.value as ExplorationFeelingId | undefined;
  const choice = getExplorationNeedOptions(feelingId).find((item) => item.id === needId)
    ?? EXPLORATION_NEEDS.find((item) => item.id === needId);
  if (!choice) throw new Error(`Unknown exploration need: ${needId}`);
  const signal = makeSignal(meta, {
    kind: "exploration",
    family: "current_need",
    value: needId,
    label: choice.label,
  });
  const session: ExperienceSession = {
    ...current,
    signals: [...current.signals.filter((item) => item.family !== signal.family), signal],
    explorationActionCount: Math.min(3, current.explorationActionCount + 1),
    updatedAt: meta.now,
  };
  return completeWithFragment(withSession(state, session), "explored", meta);
}

export function getLatestFragment(state: V4ExperienceState) {
  return [...state.fragments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

function completeSessionWithoutFragment(
  state: V4ExperienceState,
  completionReason: ExperienceSession["completionReason"],
  meta: TransitionMeta,
) {
  const current = activeSession(state);
  const completed: ExperienceSession = {
    ...current,
    status: "completed",
    stage: "COMPLETE",
    completionReason,
    completedAt: meta.now,
    updatedAt: meta.now,
  };
  let next: V4ExperienceState = {
    ...state,
    currentState: "COMPLETE",
    currentSignals: completed.signals,
    currentSession: undefined,
    sessions: [...state.sessions.filter((item) => item.id !== completed.id), completed],
    lastVisit: meta.now,
  };
  next = appendEvent(next, "session_complete", meta, { outcome: completionReason ?? "completed" });
  return next;
}

function completeWithFragment(
  state: V4ExperienceState,
  completionReason: "early_exit" | "explored",
  meta: TransitionMeta,
) {
  const current = activeSession(state);
  if (!meta.fragmentId) throw new Error("A fragment id is required");
  if (!current.reasonId || !current.firstValue) {
    return completeSessionWithoutFragment(state, completionReason, meta);
  }
  const existing = state.fragments.find((item) => item.sessionId === current.id);
  if (existing) return completeSessionWithoutFragment(state, completionReason, { ...meta, fragmentId: existing.id });
  const feelingId = current.signals.find((item) => item.family === "current_feeling")?.value as ExplorationFeelingId | undefined;
  const needId = current.signals.find((item) => item.family === "current_need")?.value as ExplorationNeedId | undefined;
  const observation = composeFragmentObservation(
    current.reasonId,
    feelingId,
    needId,
    current.firstValue.observation,
  );
  const fragment: TodayFragment = {
    id: meta.fragmentId,
    sessionId: current.id,
    date: meta.now.slice(0, 10),
    reasonId: current.reasonId,
    sourceSignals: current.signals.map((item) => ({ ...item })),
    observation,
    userFeedback: current.firstValue.userFeedback,
    createdAt: meta.now,
  };
  const completed: ExperienceSession = {
    ...current,
    status: "completed",
    stage: "COMPLETE",
    completionReason,
    fragmentId: fragment.id,
    completedAt: meta.now,
    updatedAt: meta.now,
  };
  let next: V4ExperienceState = {
    ...state,
    currentState: "COMPLETE",
    currentSignals: completed.signals,
    currentSession: undefined,
    sessions: [...state.sessions.filter((item) => item.id !== completed.id), completed],
    fragments: [...state.fragments, fragment],
    innerWorld: {
      revision: state.innerWorld.revision + 1,
      fragmentIds: [...state.innerWorld.fragmentIds, fragment.id],
    },
    lastVisit: meta.now,
  };
  if (completionReason === "early_exit") {
    next = appendEvent(next, "early_exit", meta, { stage: current.stage });
  }
  next = appendEvent(next, "fragment_created", { ...meta, eventId: `${meta.eventId}:fragment` }, { reason: current.reasonId });
  next = appendEvent(next, "session_complete", { ...meta, eventId: `${meta.eventId}:complete` }, { outcome: completionReason });
  return next;
}

export function finishToday(state: V4ExperienceState, meta: TransitionMeta) {
  if (!state.currentSession || state.currentSession.status !== "active") return state;
  return completeWithFragment(state, "early_exit", meta);
}

export function reviewFragmentFeedback(
  state: V4ExperienceState,
  fragmentId: string,
  feedback: Extract<FragmentFeedback, "fits" | "inaccurate">,
  meta: TransitionMeta,
) {
  const fragment = state.fragments.find((item) => item.id === fragmentId);
  if (!fragment) throw new Error(`Unknown fragment: ${fragmentId}`);
  if (fragment.userFeedback === feedback) return state;
  let next: V4ExperienceState = {
    ...state,
    fragments: state.fragments.map((item) => item.id === fragmentId ? { ...item, userFeedback: feedback } : item),
    innerWorld: feedback === "inaccurate"
      ? { ...state.innerWorld, revision: state.innerWorld.revision + 1 }
      : state.innerWorld,
    lastVisit: meta.now,
  };
  next = appendEvent(next, "fragment_reviewed", { ...meta, fragmentId }, { feedback });
  return next;
}

export function showReturningState(state: V4ExperienceState) {
  return {
    ...state,
    currentState: "RETURNING" as const,
    currentSignals: [],
    currentSession: undefined,
  };
}

export function reviewPreviousFragment(
  state: V4ExperienceState,
  fragmentId: string,
  changeId: ReturnChangeId,
  meta: TransitionMeta,
) {
  if (!meta.sessionId) throw new Error("A session id is required");
  const previous = state.fragments.find((item) => item.id === fragmentId);
  if (!previous) throw new Error(`Unknown fragment: ${fragmentId}`);
  const choice = getReturnChange(changeId);
  if (!choice) throw new Error(`Unknown return change: ${changeId}`);
  const signal = makeSignal(meta, {
    kind: "return_change",
    family: "previous_fragment_change",
    value: changeId,
    label: choice.label,
  });
  const previousSignal: ExperienceSignal = {
    id: `${meta.signalId}:previous`,
    kind: "previous_fragment",
    family: "previous_fragment",
    value: previous.id,
    label: previous.observation,
    createdAt: meta.now,
  };
  const session: ExperienceSession = {
    id: meta.sessionId,
    status: "active",
    stage: changeId === "not_today" ? "RETURNING" : "RETURN_VALUE",
    startedAt: meta.now,
    updatedAt: meta.now,
    reasonId: previous.reasonId,
    signals: [previousSignal, signal],
    explorationActionCount: 0,
    previousFragmentId: previous.id,
    firstValue: changeId === "not_today"
      ? undefined
      : {
          observation: returnObservation(changeId, previous.observation),
          basisSignalIds: [previousSignal.id, signal.id],
          userFeedback: "unreviewed",
        },
  };
  let next = withSession(state, session);
  next = appendEvent(next, "previous_fragment_reviewed", meta, { change: changeId });
  if (changeId === "not_today") {
    return completeSessionWithoutFragment(next, "return_skipped", { ...meta, eventId: `${meta.eventId}:complete` });
  }
  next = appendEvent(next, "first_value_seen", { ...meta, eventId: `${meta.eventId}:value` }, { source: "previous_fragment" });
  return next;
}

export function completeReturnValue(state: V4ExperienceState, meta: TransitionMeta) {
  if (!state.currentSession || state.currentSession.status !== "active") return state;
  const current = activeSession(state);
  if (!current.reasonId || !current.firstValue) return completeSessionWithoutFragment(state, "return_skipped", meta);
  return completeWithFragment(state, "early_exit", meta);
}
