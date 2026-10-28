export const V4_EXPERIENCE_SCHEMA_VERSION = 1 as const;

export type ExperienceStage =
  | "LANDING"
  | "REASON"
  | "FIRST_VALUE"
  | "EXPLORE_ONE"
  | "EXPLORE_TWO"
  | "RETURNING"
  | "RETURN_VALUE"
  | "COMPLETE";

export type TodayReasonId =
  | "confused"
  | "curious"
  | "stuck"
  | "changed"
  | "others_first"
  | "browsing"
  | "unknown";

export type ExplorationFeelingId =
  | "rushing"
  | "effort_without_meaning"
  | "others_before_me"
  | "quiet_change"
  | "nothing_obvious"
  | "hard_to_name";

export type ExplorationNeedId =
  | "unhurried_space"
  | "clearer_attention"
  | "my_own_position"
  | "loosen_attention"
  | "keep_observing"
  | "not_sure_yet";

export type ReturnChangeId = "more" | "same" | "less" | "not_today";

export type FragmentFeedback = "unreviewed" | "fits" | "partial" | "inaccurate" | "corrected";

export type MbtiType =
  | "ENFJ" | "ENFP" | "ENTJ" | "ENTP"
  | "ESFJ" | "ESFP" | "ESTJ" | "ESTP"
  | "INFJ" | "INFP" | "INTJ" | "INTP"
  | "ISFJ" | "ISFP" | "ISTJ" | "ISTP";

export interface ThinkingPreference {
  mbtiType: MbtiType;
  source: "self_reported";
  updatedAt: string;
}

export interface ExperienceSignal {
  id: string;
  kind: "reason" | "exploration" | "return_change" | "previous_fragment" | "correction";
  family: string;
  value: string;
  label: string;
  createdAt: string;
}

export interface FirstValue {
  observation: string;
  basisSignalIds: string[];
  userFeedback: FragmentFeedback;
  correctedFrom?: string;
}

export interface TodayFragment {
  id: string;
  sessionId: string;
  date: string;
  reasonId: TodayReasonId;
  sourceSignals: ExperienceSignal[];
  observation: string;
  userFeedback: FragmentFeedback;
  createdAt: string;
}

export interface ExperienceSession {
  id: string;
  status: "active" | "completed";
  stage: ExperienceStage;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  completionReason?: "early_exit" | "explored" | "return_skipped";
  reasonId?: TodayReasonId;
  signals: ExperienceSignal[];
  firstValue?: FirstValue;
  optionalNote?: string;
  explorationActionCount: number;
  previousFragmentId?: string;
  fragmentId?: string;
}

export const V4_ANALYTICS_EVENTS = [
  "landing_view",
  "start_exploration",
  "reason_selected",
  "first_value_seen",
  "continue_exploration",
  "early_exit",
  "deep_exploration_started",
  "fragment_created",
  "fragment_reviewed",
  "session_complete",
  "return_visit",
  "previous_fragment_reviewed",
  "thinking_preference_updated",
] as const;

export type ExperienceEventName = (typeof V4_ANALYTICS_EVENTS)[number];

export interface ExperienceEvent {
  id: string;
  name: ExperienceEventName;
  createdAt: string;
  sessionId?: string;
  fragmentId?: string;
  properties?: Record<string, string>;
}

export interface V4ExperienceState {
  schemaVersion: typeof V4_EXPERIENCE_SCHEMA_VERSION;
  currentState: ExperienceStage;
  currentSignals: ExperienceSignal[];
  currentSession?: ExperienceSession;
  sessions: ExperienceSession[];
  fragments: TodayFragment[];
  innerWorld: {
    revision: number;
    fragmentIds: string[];
  };
  thinkingPreference?: ThinkingPreference;
  lastVisit?: string;
  events: ExperienceEvent[];
}
