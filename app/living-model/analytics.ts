export const LIVING_ANALYTICS_EVENTS = [
  "onboarding_completed",
  "reflection_started",
  "reflection_completed",
  "reflection_tool_invoked",
  "reflection_tool_completed",
  "candidate_insight_generated",
  "insight_support_viewed",
  "counter_signal_viewed",
  "insight_accepted",
  "insight_contextualized",
  "insight_rewritten",
  "insight_rejected",
  "mirror_updated",
  "insight_revision_created",
  "change_candidate_generated",
  "change_confirmed",
  "journey_event_viewed",
  "memory_forgotten",
  "memory_paused",
] as const;

export type LivingAnalyticsEventName = (typeof LIVING_ANALYTICS_EVENTS)[number];

export function isActivationEvent(name: LivingAnalyticsEventName): boolean {
  return name === "insight_accepted" || name === "insight_contextualized" || name === "insight_rewritten";
}
