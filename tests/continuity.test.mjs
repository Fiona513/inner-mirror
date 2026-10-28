import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyState, createDemoState } from '../app/living-model/demo-data.ts';
import { createReflectionSession } from '../app/living-model/agent.ts';
import { livingModelReducer, loadLivingState } from '../app/living-model/store.ts';
import { personalReflections, reflectionChain } from '../app/living-model/continuity.ts';

function pair() {
  let state = createEmptyState();
  const first = createReflectionSession('I agreed to another task at work.', 'repeating', state, 'personal-a', '2026-10-01T12:00:00Z');
  state = livingModelReducer(state, { type: 'START_REFLECTION', session: first });
  const second = createReflectionSession('This time I asked for time before answering.', 'repeating', state, 'personal-b', '2026-10-02T12:00:00Z');
  second.previousSessionId = first.id;
  return { state, first, second };
}
test('personal continuity excludes all sample and safety sessions', () => {
  assert.deepEqual(personalReflections(createDemoState()), []);
  const { state } = pair();
  state.sessions[0].outcome = 'safety';
  assert.equal(personalReflections(state).length, 0);
});
test('explicit link and note survive reload without changing insights', () => {
  let { state, second } = pair();
  state = livingModelReducer(state, { type: 'START_REFLECTION', session: second });
  const before = JSON.stringify(state.insights);
  state = livingModelReducer(state, { type: 'SET_RETURN_NOTE', sessionId: second.id, note: 'Work only, not with friends.', now: '2026-10-03T12:00:00Z' });
  const restored = loadLivingState(JSON.stringify(state));
  assert.equal(reflectionChain(restored, restored.sessions[0]).length, 2);
  assert.equal(restored.sessions[0].returnNote, 'Work only, not with friends.');
  assert.equal(JSON.stringify(restored.insights), before);
});
test('invalid, self, sample, future links and paused memory do not form threads', () => {
  for (const target of ['missing', 'personal-b', 'session-career-aug29']) {
    const { state, second } = pair(); second.previousSessionId = target;
    assert.equal(livingModelReducer(state, { type: 'START_REFLECTION', session: second }).sessions[0].previousSessionId, undefined);
  }
  const { state, second } = pair(); state.memoryPaused = true;
  assert.equal(livingModelReducer(state, { type: 'START_REFLECTION', session: second }).sessions[0].previousSessionId, undefined);
  state.memoryPaused = false; second.createdAt = '2026-09-01T12:00:00Z';
  assert.equal(livingModelReducer(state, { type: 'START_REFLECTION', session: second }).sessions[0].previousSessionId, undefined);
});
test('chain traversal terminates on corrupt cycles', () => {
  const { state, first, second } = pair(); first.previousSessionId = second.id; state.sessions = [first, second];
  assert.equal(reflectionChain(state, first).length, 2);
});
