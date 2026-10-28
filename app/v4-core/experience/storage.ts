import { createEmptyExperienceState } from "./experience-machine.ts";
import {
  V4_EXPERIENCE_SCHEMA_VERSION,
  type ExperienceSession,
  type MbtiType,
  type TodayFragment,
  type V4ExperienceState,
} from "./types.ts";

export const V4_EXPERIENCE_STORAGE_KEY = "inner-mirror:v4-core:experience:v1";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSession(value: unknown): value is ExperienceSession {
  return isRecord(value)
    && typeof value.id === "string"
    && (value.status === "active" || value.status === "completed")
    && typeof value.stage === "string"
    && Array.isArray(value.signals)
    && typeof value.startedAt === "string"
    && typeof value.updatedAt === "string";
}

function isFragment(value: unknown): value is TodayFragment {
  return isRecord(value)
    && typeof value.id === "string"
    && typeof value.sessionId === "string"
    && typeof value.observation === "string"
    && typeof value.createdAt === "string"
    && Array.isArray(value.sourceSignals);
}

const MBTI_TYPES = new Set([
  "ENFJ", "ENFP", "ENTJ", "ENTP", "ESFJ", "ESFP", "ESTJ", "ESTP",
  "INFJ", "INFP", "INTJ", "INTP", "ISFJ", "ISFP", "ISTJ", "ISTP",
]);

function isMbtiType(value: unknown): value is MbtiType {
  return typeof value === "string" && MBTI_TYPES.has(value);
}

export function parseExperienceState(raw: string | null): V4ExperienceState {
  if (!raw) return createEmptyExperienceState();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.schemaVersion !== V4_EXPERIENCE_SCHEMA_VERSION) {
      return createEmptyExperienceState();
    }
    const sessions = Array.isArray(parsed.sessions) ? parsed.sessions.filter(isSession) : [];
    const fragments = Array.isArray(parsed.fragments) ? parsed.fragments.filter(isFragment) : [];
    const currentSession = isSession(parsed.currentSession) && parsed.currentSession.status === "active"
      ? parsed.currentSession
      : undefined;
    const events = Array.isArray(parsed.events)
      ? parsed.events.filter((item) => isRecord(item) && typeof item.id === "string" && typeof item.name === "string")
      : [];
    const innerWorld = isRecord(parsed.innerWorld)
      ? {
          revision: typeof parsed.innerWorld.revision === "number" ? parsed.innerWorld.revision : fragments.length,
          fragmentIds: Array.isArray(parsed.innerWorld.fragmentIds)
            ? parsed.innerWorld.fragmentIds.filter((item): item is string => typeof item === "string")
            : fragments.map((item) => item.id),
        }
      : { revision: fragments.length, fragmentIds: fragments.map((item) => item.id) };
    const currentState = currentSession?.stage ?? (fragments.length ? "RETURNING" : "LANDING");
    const thinkingPreference = isRecord(parsed.thinkingPreference)
      && isMbtiType(parsed.thinkingPreference.mbtiType)
      && parsed.thinkingPreference.source === "self_reported"
      && typeof parsed.thinkingPreference.updatedAt === "string"
      ? {
          mbtiType: parsed.thinkingPreference.mbtiType,
          source: "self_reported" as const,
          updatedAt: parsed.thinkingPreference.updatedAt,
        }
      : undefined;
    return {
      schemaVersion: V4_EXPERIENCE_SCHEMA_VERSION,
      currentState,
      currentSignals: currentSession?.signals ?? [],
      currentSession,
      sessions,
      fragments,
      innerWorld,
      thinkingPreference,
      lastVisit: typeof parsed.lastVisit === "string" ? parsed.lastVisit : undefined,
      events: events as V4ExperienceState["events"],
    };
  } catch {
    return createEmptyExperienceState();
  }
}

export function serializeExperienceState(state: V4ExperienceState) {
  return JSON.stringify(state);
}

export function loadExperienceState() {
  if (typeof window === "undefined") return createEmptyExperienceState();
  return parseExperienceState(window.localStorage.getItem(V4_EXPERIENCE_STORAGE_KEY));
}

export function saveExperienceState(state: V4ExperienceState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(V4_EXPERIENCE_STORAGE_KEY, serializeExperienceState(state));
}

