# Inner Mirror｜内在镜像

Inner Mirror is a non-diagnostic self-reflection prototype. It keeps lived events, observations, candidate interpretations and user corrections distinct, so an understanding can be inspected and revised rather than treated as a fixed identity label.

The current Living Self Model experience opens in Simplified Chinese and has a persistent 中文 / EN switch. The interface, built-in sample history and deterministic demo responses follow the selected language. User-authored text is not translated automatically.

## Experience

- `/onboarding`: choose an empty mirror or clearly labelled sample history.
- `/now`: current state, retained understandings and directions.
- `/reflection`: a structured reflection with clarification, evidence and an optional candidate understanding.
- `/mirror`: inspect, contextualize, rewrite or archive confirmed understandings.
- `/journey`: revisit revisions and self-reported state over time.
- `/search` and `/settings`: find retained context and manage memory, privacy and communication preferences.

The sample history is illustrative, not a real user's transcript. A reflection can finish without adding a lasting understanding. Rejected interpretations are excluded from later active retrieval. The experience does not provide diagnosis or crisis care.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
npx tsc --noEmit
node --test tests/living-model.test.mjs
npm run build
```

The default demo uses local sample data and deterministic responses. The optional model-backed route requires server-side configuration; without it, the app reports a demo fallback instead of claiming a live AI connection. Local reflection data is stored in the current browser.

The repository also retains the earlier V3 Phase 1 and V4 prototype routes and their tests. The Living Self Model is the public entry experience.
