import type { LivingModelState, ReflectionSession, StateMetricKey, StateSnapshot } from "./types";

export const STATE_METRICS: Record<StateMetricKey, { label: string; low: string; high: string }> = {
  pressure: { label: "Pressure", low: "Low", high: "High" },
  clarity: { label: "Clarity", low: "Unclear", high: "Clear" },
};

export function createStateSnapshot(session: ReflectionSession, metricKey: StateMetricKey, value: 1 | 2 | 3 | 4 | 5, capturedAt: string): StateSnapshot {
  return {
    id: `snapshot-${session.id}-${metricKey}`,
    sessionId: session.id,
    metricKey,
    label: STATE_METRICS[metricKey].label,
    value,
    source: "user_self_report",
    context: contextLabel(session),
    contextKey: session.context,
    capturedAt,
  };
}

export function contextLabel(session: ReflectionSession): string {
  const prefix = session.context === "decision" ? "Decision" : session.context === "feeling" ? "Current feeling" : session.context === "repeating" ? "Recurring situation" : "Open reflection";
  const excerpt = session.input.trim().replace(/\s+/g, " ").slice(0, 48);
  return excerpt ? `${prefix} · ${excerpt}${session.input.trim().length > 48 ? "…" : ""}` : prefix;
}

export function getMostRelevantSnapshotGroup(state: LivingModelState) {
  const byContext = new Map<string, StateSnapshot[]>();
  for (const snapshot of state.stateSnapshots) {
    const key = snapshot.contextKey;
    byContext.set(key, [...(byContext.get(key) ?? []), snapshot]);
  }
  const group = [...byContext.values()].sort((a, b) => latestTime(b) - latestTime(a))[0] ?? [];
  if (!group.length) return null;
  const latest = [...group].sort((a, b) => Date.parse(b.capturedAt) - Date.parse(a.capturedAt))[0];
  const metrics = (["pressure", "clarity"] as const).map((metricKey) => {
    const values = group.filter((item) => item.metricKey === metricKey).sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt));
    return { metricKey, previous: values.at(-2), current: values.at(-1), count: values.length };
  });
  return { context: latest.context, contextKey: latest.contextKey, sessionId: latest.sessionId, metrics, count: new Set(group.map((item) => item.sessionId)).size };
}

export function getSnapshotMoments(state: LivingModelState, limit = 4) {
  const moments = new Map<string, { sessionId: string; capturedAt: string; context: string; pressure?: StateSnapshot; clarity?: StateSnapshot }>();
  for (const snapshot of state.stateSnapshots) {
    const moment = moments.get(snapshot.sessionId) ?? { sessionId: snapshot.sessionId, capturedAt: snapshot.capturedAt, context: snapshot.context };
    moment[snapshot.metricKey] = snapshot;
    if (Date.parse(snapshot.capturedAt) > Date.parse(moment.capturedAt)) moment.capturedAt = snapshot.capturedAt;
    moments.set(snapshot.sessionId, moment);
  }
  return [...moments.values()].sort((a, b) => Date.parse(a.capturedAt) - Date.parse(b.capturedAt)).slice(-limit);
}

export function describeStateChange(metricKey: StateMetricKey, previous: number, current: number, locale = "en"): string {
  if (locale === "zh-CN") {
    const label = metricKey === "pressure" ? "压力" : "清晰度";
    if (previous === current) return `最近两次自报的${label}处于同一水平。`;
    return `最近一次自报的${label}${current > previous ? "更高" : "更低"}。`;
  }
  if (previous === current) return `${STATE_METRICS[metricKey].label} stayed at the same self-reported level.`;
  const direction = current > previous ? "higher" : "lower";
  return `${STATE_METRICS[metricKey].label} is ${direction} in the latest self-report.`;
}

function latestTime(items: StateSnapshot[]): number {
  return Math.max(...items.map((item) => Date.parse(item.capturedAt)));
}
