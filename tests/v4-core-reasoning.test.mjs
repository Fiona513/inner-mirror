import assert from "node:assert/strict";
import test from "node:test";

import {
  createCoreSession,
  getDiscriminatorOutcomeSignatures,
  isDiscriminatorValid,
  reasoningFingerprint,
  recordInteraction,
  rejectCurrentPrimary,
} from "../app/v4-core/core/reasoning-engine.ts";
import { uncertainOutcomePack } from "../app/v4-core/packs/uncertain-outcome.ts";

function formInitialPair(sessionId = "session") {
  let session = createCoreSession(uncertainOutcomePack, sessionId);
  session = recordInteraction(uncertainOutcomePack, session, "context_delay", "waiting_longer", "signal-context");
  session = recordInteraction(uncertainOutcomePack, session, "clarify_focus", "outcome_unknown", "signal-focus");
  return session;
}

test("Formation Gate blocks a visible pair until two evidence families exist", () => {
  let session = createCoreSession(uncertainOutcomePack);
  session = recordInteraction(uncertainOutcomePack, session, "context_delay", "waiting_longer", "one-family");
  assert.equal(session.formationGate.eligible, false);
  assert.equal(session.formationGate.reason, "needs_more_evidence_families");
  assert.equal(session.primary, undefined);
  assert.equal(session.activeAlternative, undefined);

  session = recordInteraction(uncertainOutcomePack, session, "clarify_focus", "outcome_unknown", "second-family");
  assert.equal(session.formationGate.eligible, true);
  assert.deepEqual(session.formationGate.evidenceFamilies, ["distress_focus", "outcome_timeline"]);
  assert.equal(session.primary?.id, "uncertainty");
  assert.equal(session.activeAlternative?.id, "fear_of_error");
});

test("Primary and Alternative are stable and evidence traceable after formation", () => {
  const session = formInitialPair();
  assert.equal(session.primary?.status, "supported");
  assert.deepEqual(session.primary?.supportingSignalIds, ["signal-context", "signal-focus"]);
  assert.equal(session.activeAlternative?.status, "emerging");
  assert.deepEqual(session.activeAlternative?.supportingSignalIds, ["signal-focus"]);
  assert.equal(session.activeDiscriminator?.id, "uncertainty_vs_fear_of_error");
});

test("Discriminator passes the counterfactual test", () => {
  const session = formInitialPair();
  const discriminator = session.activeDiscriminator;
  assert.ok(discriminator);
  const signatures = getDiscriminatorOutcomeSignatures(uncertainOutcomePack, session, discriminator);
  assert.ok(new Set(signatures).size >= 2);
  assert.equal(isDiscriminatorValid(uncertainOutcomePack, session, discriminator), true);
  assert.ok(signatures.some((item) => item.startsWith("uncertainty|")));
  assert.ok(signatures.some((item) => item.startsWith("fear_of_error|")));
  assert.ok(signatures.some((item) => item.startsWith("none|")));
});

test("PATH A — supporting discriminator evidence strengthens and keeps Primary", () => {
  const before = formInitialPair();
  const after = recordInteraction(
    uncertainOutcomePack,
    before,
    "result_arrives_counterfactual",
    "relief_even_if_bad",
    "signal-discriminator-holds",
  );
  assert.equal(before.primary?.id, "uncertainty");
  assert.equal(after.primary?.id, "uncertainty");
  assert.equal(after.lastRevision?.type, "strengthened");
  assert.deepEqual(after.lastRevision?.triggerSignalIds, ["signal-discriminator-holds"]);
  assert.ok(after.primary?.supportingSignalIds.includes("signal-discriminator-holds"));
});

test("PATH B — contradictory discriminator evidence causes a real Primary Switch", () => {
  const before = formInitialPair();
  const after = recordInteraction(
    uncertainOutcomePack,
    before,
    "result_arrives_counterfactual",
    "harder_if_i_was_wrong",
    "signal-discriminator-switch",
  );
  assert.equal(before.primary?.id, "uncertainty");
  assert.equal(before.activeAlternative?.id, "fear_of_error");
  assert.equal(after.primary?.id, "fear_of_error");
  assert.equal(after.activeAlternative?.id, "uncertainty");
  assert.equal(after.lastRevision?.type, "primary_switch");
  assert.equal(after.lastRevision?.previousPrimary, "uncertainty");
  assert.equal(after.lastRevision?.newPrimary, "fear_of_error");
  assert.deepEqual(after.lastRevision?.triggerSignalIds, ["signal-discriminator-switch"]);
  assert.ok(after.primary?.supportingSignalIds.includes("signal-discriminator-switch"));
  assert.ok(after.activeAlternative?.contradictingSignalIds.includes("signal-discriminator-switch"));
});

test("PATH C — one discriminator answer can weaken all candidates", () => {
  const before = formInitialPair();
  const after = recordInteraction(
    uncertainOutcomePack,
    before,
    "result_arrives_counterfactual",
    "neither_changes",
    "signal-discriminator-both-weakened",
  );
  assert.equal(before.primary?.id, "uncertainty");
  assert.equal(after.primary, undefined);
  assert.equal(after.activeAlternative, undefined);
  assert.equal(after.formationGate.eligible, false);
  assert.equal(after.formationGate.reason, "all_candidates_weakened");
  assert.equal(after.lastRevision?.type, "both_weakened");
  assert.ok(after.candidates.every((item) => item.status === "weakened"));
});

test("PATH D — user rejection removes the old Primary without consuming exploration budget", () => {
  const before = formInitialPair();
  const after = rejectCurrentPrimary(uncertainOutcomePack, before, "signal-user-reject");
  assert.equal(before.primary?.id, "uncertainty");
  assert.equal(after.candidates.find((item) => item.id === "uncertainty")?.status, "rejected");
  assert.equal(after.primary?.id, "fear_of_error");
  assert.equal(after.lastRevision?.type, "user_rejection");
  assert.equal(after.lastRevision?.previousPrimary, "uncertainty");
  assert.equal(after.lastRevision?.newPrimary, "fear_of_error");
  assert.deepEqual(after.lastRevision?.triggerSignalIds, ["signal-user-reject"]);
  assert.equal(after.explorationActionCount, before.explorationActionCount);
});

test("same structured evidence and rule version produce the same logical fingerprint", () => {
  const run = () => {
    const formed = formInitialPair("stable-session");
    return recordInteraction(
      uncertainOutcomePack,
      formed,
      "result_arrives_counterfactual",
      "harder_if_i_was_wrong",
      "stable-discriminator-signal",
    );
  };
  assert.deepEqual(reasoningFingerprint(run()), reasoningFingerprint(run()));
});

test("Evidence Family, not interaction count, owns independence", () => {
  let session = createCoreSession(uncertainOutcomePack);
  session = recordInteraction(uncertainOutcomePack, session, "context_delay", "waiting_longer", "first-answer");
  session = recordInteraction(uncertainOutcomePack, session, "context_delay", "timeline_keeps_moving", "replacement-answer");
  assert.equal(session.signals.length, 1);
  assert.equal(session.explorationActionCount, 1);
  assert.deepEqual(session.formationGate.evidenceFamilies, ["outcome_timeline"]);
  assert.equal(session.formationGate.eligible, false);
  assert.equal(session.signals[0].id, "replacement-answer");

  const invalidPack = {
    ...uncertainOutcomePack,
    interactions: [
      ...uncertainOutcomePack.interactions,
      {
        ...uncertainOutcomePack.interactions[0],
        id: "duplicate-family-interaction",
        key: "duplicate_family_key",
      },
    ],
  };
  assert.throws(
    () => createCoreSession(invalidPack),
    /exactly one mutually exclusive interaction/,
  );
});

test("unknown taxonomy values cannot enter the reasoning engine", () => {
  const session = createCoreSession(uncertainOutcomePack);
  assert.throws(
    () => recordInteraction(uncertainOutcomePack, session, "context_delay", "invented_option", "bad-signal"),
    /Unknown option/,
  );
});
