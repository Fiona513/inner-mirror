import { createDemoState } from './demo-data.ts';
import type { LivingModelState, ReflectionSession } from './types';

const sampleIds = new Set(createDemoState().sessions.map(item => item.id));

export function personalReflections(state: LivingModelState): ReflectionSession[] {
  return state.sessions.filter(item => !sampleIds.has(item.id) && item.outcome !== 'safety')
    .slice().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function validPrevious(state: LivingModelState, session: ReflectionSession): string | undefined {
  if (state.memoryPaused || session.outcome === 'safety' || !session.previousSessionId) return undefined;
  return personalReflections(state).find(item => item.id === session.previousSessionId && item.id !== session.id && Date.parse(item.createdAt) < Date.parse(session.createdAt))?.id;
}

export function reflectionChain(state: LivingModelState, session: ReflectionSession): ReflectionSession[] {
  const chain: ReflectionSession[] = [];
  const seen = new Set<string>();
  let current: ReflectionSession | undefined = session;
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.push(current);
    current = personalReflections(state).find(item => item.id === current?.previousSessionId);
  }
  return chain;
}
