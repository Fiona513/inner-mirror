import type { Hypothesis, Session } from "../core/types.ts";

export type SpatialReasoningState =
  | "PAIR"
  | "A_DOMINANT"
  | "B_DOMINANT"
  | "BOTH_WEAKENED"
  | "A_REJECTED"
  | "B_REJECTED"
  | "RECOGNITION"
  | "OPEN";

export type SpatialDirectionStatus =
  | "leading"
  | "available"
  | "dominant"
  | "receded"
  | "rejected"
  | "remaining"
  | "stabilized"
  | "withdrawn";

export interface SpatialDirection {
  slot: "a" | "b";
  hypothesisId?: string;
  statement?: string;
  status: SpatialDirectionStatus;
}

export interface SpatialReasoningView {
  state: SpatialReasoningState;
  directionA: SpatialDirection;
  directionB: SpatialDirection;
  triggerSignalId?: string;
  announcement: string;
  hasPair: boolean;
}

const announcements: Record<SpatialReasoningState, string> = {
  PAIR: "两个方向同时出现，目前第一种稍微更靠近。",
  A_DOMINANT: "第一种方向更稳定，另一种方向暂时退后。",
  B_DOMINANT: "第二种方向靠近，第一种方向暂时退后。",
  BOTH_WEAKENED: "两个方向都退开，中间仍然保持开放。",
  A_REJECTED: "第一种方向被放下，第二种方向重新回到注意范围。",
  B_REJECTED: "第二种方向被放下，第一种方向重新回到注意范围。",
  RECOGNITION: "一个方向暂时稳定下来，其他内容退到背景。",
  OPEN: "两个方向都没有被固定下来，空间继续保持开放。",
};

function candidate(session: Session, hypothesisId?: string): Hypothesis | undefined {
  return session.candidates.find((item) => item.id === hypothesisId);
}

function direction(
  session: Session,
  slot: "a" | "b",
  hypothesisId: string | undefined,
  status: SpatialDirectionStatus,
): SpatialDirection {
  return {
    slot,
    hypothesisId,
    statement: candidate(session, hypothesisId)?.statement,
    status,
  };
}

function dominantState(session: Session, aId?: string, bId?: string): SpatialReasoningState {
  if (session.primary?.id === bId) return "B_DOMINANT";
  if (session.primary?.id === aId) return "A_DOMINANT";
  return "PAIR";
}

function resolveSpatialState(session: Session, aId?: string, bId?: string): SpatialReasoningState {
  if (session.state === "NO_VALID_INSIGHT" || session.recognitionOutcome?.status === "NO_VALID_INSIGHT") {
    return "OPEN";
  }

  if (session.pendingCorrection?.mode === "both_rejected") return "OPEN";
  if (session.pendingCorrection) {
    if (session.pendingCorrection.rejectedHypothesisId === aId) return "A_REJECTED";
    if (session.pendingCorrection.rejectedHypothesisId === bId) return "B_REJECTED";
  }

  if (session.state === "RECOGNITION" || session.state === "CORRECT_AND_LEAVE") {
    return "RECOGNITION";
  }

  if (session.lastRevision?.type === "both_weakened") return "BOTH_WEAKENED";
  if (session.lastRevision?.type === "user_rejection") {
    const rejectedId = session.lastRevision.previousPrimary;
    if (rejectedId === aId) return "A_REJECTED";
    if (rejectedId === bId) return "B_REJECTED";
  }
  if (session.lastRevision?.type === "primary_switch" || session.lastRevision?.type === "strengthened") {
    return dominantState(session, aId, bId);
  }

  return "PAIR";
}

function statusesFor(
  state: SpatialReasoningState,
  stableHypothesisId: string | undefined,
  aId: string | undefined,
  bId: string | undefined,
): [SpatialDirectionStatus, SpatialDirectionStatus] {
  switch (state) {
    case "PAIR": return ["leading", "available"];
    case "A_DOMINANT": return ["dominant", "receded"];
    case "B_DOMINANT": return ["receded", "dominant"];
    case "BOTH_WEAKENED": return ["receded", "receded"];
    case "A_REJECTED": return ["rejected", "remaining"];
    case "B_REJECTED": return ["remaining", "rejected"];
    case "RECOGNITION":
      if (stableHypothesisId === bId) return ["receded", "stabilized"];
      if (stableHypothesisId === aId) return ["stabilized", "receded"];
      return ["withdrawn", "withdrawn"];
    case "OPEN": return ["withdrawn", "withdrawn"];
  }
}

export function deriveSpatialReasoningView(session: Session): SpatialReasoningView {
  const originalRevision = session.revisions.find(
    (revision) => revision.type !== "user_rejection" && revision.previousPrimary && revision.previousAlternative,
  );
  const aId = originalRevision?.previousPrimary ?? session.presentedPair?.primaryId;
  const bId = originalRevision?.previousAlternative ?? session.presentedPair?.alternativeId;
  const state = resolveSpatialState(session, aId, bId);
  const stableHypothesisId = session.insight?.hypothesisId ?? session.primary?.id;
  const [aStatus, bStatus] = statusesFor(state, stableHypothesisId, aId, bId);

  return {
    state,
    directionA: direction(session, "a", aId, aStatus),
    directionB: direction(session, "b", bId, bStatus),
    triggerSignalId: session.lastRevision?.triggerSignalIds[0],
    announcement: announcements[state],
    hasPair: Boolean(aId && bId),
  };
}
