import {
  completeCorrectionFollowup,
  evaluateRecognition,
  respondToInsight,
  type CorrectionFollowupResponse,
} from "../core/insight-engine.ts";
import {
  createCoreSession,
  recordInteraction,
  recordRankingInteraction,
  stopWithoutInsight,
} from "../core/reasoning-engine.ts";
import type { InsightResponse, JourneyState, Session } from "../core/types.ts";
import type { InteractionDefinition, ScenarioPack } from "../packs/types.ts";

function requireState(session: Session, allowed: JourneyState[]) {
  if (!allowed.includes(session.state)) {
    throw new Error(`Journey action is not allowed from ${session.state}`);
  }
}

function interactionById(pack: ScenarioPack, interactionId: string) {
  const interaction = pack.interactions.find((item) => item.id === interactionId);
  if (!interaction) throw new Error(`Unknown interaction: ${interactionId}`);
  return interaction;
}

export function createJourneySession(pack: ScenarioPack, sessionId: string) {
  return createCoreSession(pack, sessionId);
}

export function enterJourney(session: Session): Session {
  requireState(session, ["ENTER"]);
  return { ...session, state: "CLARIFY", clarifyStepIndex: 0 };
}

export function currentJourneyInteraction(
  pack: ScenarioPack,
  session: Session,
): InteractionDefinition | undefined {
  if (session.state === "CLARIFY" || session.state === "DIFFERENTIATE") {
    const interactionId = pack.journey.clarifyInteractionIds[session.clarifyStepIndex];
    if (!interactionId || session.rejectedScenarios.includes(interactionId)) return undefined;
    return interactionById(pack, interactionId);
  }
  if (session.state === "EXPLORE" && session.activeDiscriminator) {
    return interactionById(pack, session.activeDiscriminator.interactionId);
  }
  return undefined;
}

function continueClarifying(pack: ScenarioPack, session: Session): Session {
  if (session.state === "NO_VALID_INSIGHT") return session;
  const nextIndex = session.clarifyStepIndex + 1;
  if (nextIndex < pack.journey.clarifyInteractionIds.length) {
    return {
      ...session,
      clarifyStepIndex: nextIndex,
      state: "DIFFERENTIATE",
      lastRevision: undefined,
    };
  }
  if (session.primary && session.activeAlternative && session.activeDiscriminator) {
    return {
      ...session,
      clarifyStepIndex: nextIndex,
      state: "FIRST_AGENT_MOMENT",
      lastRevision: undefined,
    };
  }
  return stopWithoutInsight(pack, session, "insufficient_signals");
}

export function answerJourneyInteraction(
  pack: ScenarioPack,
  session: Session,
  optionId: string,
  signalId: string,
): Session {
  requireState(session, ["CLARIFY", "DIFFERENTIATE", "EXPLORE"]);
  const interaction = currentJourneyInteraction(pack, session);
  if (!interaction) throw new Error(`No interaction is available from ${session.state}`);
  if (interaction.kind === "ranking") {
    const option = interaction.options.find((item) => item.id === optionId);
    if (!option?.isAbstain) throw new Error("Ranking interactions require an ordered value");
  }
  const next = recordInteraction(pack, session, interaction.id, optionId, signalId);
  return session.state === "EXPLORE" ? next : continueClarifying(pack, next);
}

export function answerJourneyRanking(
  pack: ScenarioPack,
  session: Session,
  orderedOptionIds: string[],
  signalId: string,
): Session {
  requireState(session, ["CLARIFY", "DIFFERENTIATE"]);
  const interaction = currentJourneyInteraction(pack, session);
  if (!interaction || interaction.kind !== "ranking") {
    throw new Error(`No ranking interaction is available from ${session.state}`);
  }
  const next = recordRankingInteraction(pack, session, interaction.id, orderedOptionIds, signalId);
  return continueClarifying(pack, next);
}

export function continueFromFirstAgentMoment(session: Session): Session {
  requireState(session, ["FIRST_AGENT_MOMENT"]);
  if (!session.primary || !session.activeAlternative || !session.activeDiscriminator) {
    throw new Error("A formed pair and valid discriminator are required");
  }
  return { ...session, state: "EXPLORE" };
}

export function continueFromRevision(session: Session): Session {
  requireState(session, ["REVISION"]);
  return { ...session, state: "GO_DEEPER" };
}

export function requestRecognition(pack: ScenarioPack, session: Session): Session {
  requireState(session, ["GO_DEEPER"]);
  if (session.pendingCorrection) {
    throw new Error("Pending correction must be answered before recognition");
  }
  return evaluateRecognition(pack, session);
}

export function answerRecognition(
  pack: ScenarioPack,
  session: Session,
  response: InsightResponse,
  signalId: string,
): Session {
  requireState(session, ["RECOGNITION"]);
  return respondToInsight(pack, session, response, signalId);
}

export function answerCorrectionFollowup(
  pack: ScenarioPack,
  session: Session,
  response: CorrectionFollowupResponse,
  signalId: string,
): Session {
  requireState(session, ["GO_DEEPER"]);
  if (!session.pendingCorrection) throw new Error("There is no correction to resolve");
  return completeCorrectionFollowup(pack, session, response, signalId);
}
