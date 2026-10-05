import type { JourneyEvent } from "./types";

export function sortJourneyNewestFirst(events: JourneyEvent[]): JourneyEvent[] {
  return [...events].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

