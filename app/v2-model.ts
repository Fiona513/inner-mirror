export const SCHEMA_VERSION = 2 as const;

export type Dimension = "state" | "needs" | "self" | "relationship" | "direction";
export type SignalSource = "choice" | "multi_choice" | "ranking" | "scenario" | "tradeoff" | "verification" | "user_confirmation";
export type ConfirmationState = "unknown" | "confirmed" | "partial" | "rejected";
export type ExplorationIntent = "current_state" | "specific_concern" | "repeated_pattern" | "find_direction";
export type NeedKey = "safety" | "recognition" | "connection" | "freedom" | "achievement" | "rest" | "control" | "exploration";
export type SessionStep = "entry" | "scan_state" | "scan_attention" | "scan_needs" | "prioritize" | "agent_transition" | "adaptive" | "verify" | "alternative" | "room_reveal" | "room" | "mirror_interaction" | "window_interaction" | "letter_interaction" | "reflection" | "inner_map" | "safety";

export interface Signal { id: string; dimension: Dimension; trait: string; value: number; source: SignalSource; reliability: number; questionId?: string; createdAt: number }
export interface SignalEffect { dimension: Dimension; trait: string; value: number; reliability?: number }
export interface RankedNeed { need: NeedKey; rank: number; weight: number }
export interface QuestionOption { id: string; label: string; detail?: string; effects: SignalEffect[] }
export interface QuestionDefinition { id: string; type: "single" | "multi" | "ranking" | "scenario" | "tradeoff" | "verification"; dimensions: Dimension[]; discriminatesBetween?: string[]; prompt: string; support: string; options: QuestionOption[]; informationValue: number }
export interface Hypothesis { id: string; key: string; statement: string; relatedDimensions: Dimension[]; supportingSignalIds: string[]; contradictingSignalIds: string[]; confidence: number; confirmation: ConfirmationState; evidence: string[]; createdAt: number; updatedAt: number }
export interface AgentDecision { nextAction: "ask_question" | "verify_hypothesis" | "reveal_room"; selectedQuestionId?: string; focusDimensions: Dimension[]; primaryHypothesisKey?: string; alternativeHypothesisKey?: string; transitionCopy: string; reasonCode: string; engine: "structured_fallback" | "llm_assisted" }
export interface RoomState {
  mirror: { state: "stable" | "blurred" | "fragmented" | "restored"; intensity: number };
  window: { state: "open" | "fogged" | "closed"; intensity: number };
  light: { level: number };
  letter: { state: "quiet" | "present" | "unspoken" | "kept"; intensity: number; keptText?: string };
  space: { openness: number; order: number };
  completedInteractions: { mirror: boolean; window: boolean; letter: boolean };
  recommendedInteractions: Array<"mirror" | "window" | "letter">;
  evidence: Record<"mirror" | "window" | "light" | "letter", string[]>;
}
export interface ReflectionResult { certain: string; learning: string; unclear: string; evidence: string[]; takeaways: string[] }
export interface InnerMapEntry { id: string; createdAt: number; explorationIntent: ExplorationIntent; topStateSignals: string[]; topNeeds: string[]; confirmedInsights: string[]; openQuestions: string[]; roomSnapshot: RoomState; completedInteractions: string[]; takeaway: string; migratedFromLegacy?: boolean }
export type AnalyticsEventName = "session_started" | "entry_selected" | "scan_completed" | "ranking_completed" | "adaptive_question_answered" | "hypothesis_shown" | "hypothesis_confirmed" | "hypothesis_partially_confirmed" | "hypothesis_rejected" | "room_revealed" | "interaction_started" | "interaction_completed" | "reflection_viewed" | "inner_map_saved" | "session_completed";
export interface AnalyticsEvent { name: AnalyticsEventName; createdAt: number; payload?: Record<string, string | number | boolean> }
export interface V2Session {
  schemaVersion: typeof SCHEMA_VERSION; sessionId: string; createdAt: number; currentSessionStep: SessionStep;
  explorationIntent?: ExplorationIntent; selections: Record<string, string[]>; rankings: RankedNeed[]; signals: Signal[]; hypotheses: Hypothesis[];
  primaryHypothesisKey?: string; alternativeHypothesisKey?: string; adaptiveQuestionIds: string[]; agentDecision?: AgentDecision;
  userConfirmations: Record<string, ConfirmationState>; verificationAttempts: number; roomState?: RoomState; restoredMirrorShards: string[];
  completedInteractions: string[]; reflection?: ReflectionResult; selectedTakeaway?: string; analytics: AnalyticsEvent[]; safetyExit?: boolean;
}

export const intentOptions: Array<{ id: ExplorationIntent; label: string; detail: string }> = [
  { id: "current_state", label: "看看最近的自己", detail: "从此刻的能量、压力与需要开始" },
  { id: "specific_concern", label: "理清一件正在困扰我的事", detail: "看看它真正牵动了什么" },
  { id: "repeated_pattern", label: "理解一个反复出现的自己", detail: "辨认熟悉的反应与关系位置" },
  { id: "find_direction", label: "想清楚我真正想要什么", detail: "从取舍里看见价值优先级" },
];

export const needLabels: Record<NeedKey, string> = { safety: "更确定", recognition: "被认可", connection: "被理解", freedom: "更自由", achievement: "有结果", rest: "休息", control: "掌控感", exploration: "找到方向" };

export const stateOptions: QuestionOption[] = [
  { id: "tired", label: "有点累", effects: [{ dimension: "state", trait: "energy", value: -0.8 }, { dimension: "state", trait: "mental_load", value: 0.55 }] },
  { id: "tense", label: "有点紧绷", effects: [{ dimension: "state", trait: "stress", value: 0.8 }, { dimension: "state", trait: "tension", value: 0.75 }] },
  { id: "driven", label: "很有动力", effects: [{ dimension: "state", trait: "energy", value: 0.75 }, { dimension: "direction", trait: "achievement", value: 0.45 }] },
  { id: "lost", label: "有点迷茫", effects: [{ dimension: "state", trait: "clarity", value: -0.75 }, { dimension: "direction", trait: "exploration", value: 0.5 }] },
  { id: "calm", label: "很平静", effects: [{ dimension: "state", trait: "stress", value: -0.7 }, { dimension: "state", trait: "clarity", value: 0.6 }] },
  { id: "avoid", label: "想躲开一些事情", effects: [{ dimension: "state", trait: "avoidance", value: 0.85 }, { dimension: "state", trait: "mental_load", value: 0.55 }] },
  { id: "prove", label: "很想证明自己", effects: [{ dimension: "self", trait: "external_validation", value: 0.72 }, { dimension: "self", trait: "self_demand", value: 0.7 }] },
  { id: "closer", label: "想和某个人靠近", effects: [{ dimension: "needs", trait: "connection", value: 0.78 }, { dimension: "relationship", trait: "distance", value: -0.4 }] },
  { id: "alone", label: "想一个人待会儿", effects: [{ dimension: "needs", trait: "rest", value: 0.7 }, { dimension: "relationship", trait: "distance", value: 0.45 }] },
  { id: "none", label: "都不太像", effects: [] },
];

export const attentionOptions: QuestionOption[] = [
  { id: "work", label: "工作 / 学习", effects: [{ dimension: "direction", trait: "achievement", value: 0.55 }, { dimension: "state", trait: "mental_load", value: 0.4 }] },
  { id: "relationship", label: "一段关系", effects: [{ dimension: "direction", trait: "relationship", value: 0.6 }, { dimension: "needs", trait: "connection", value: 0.55 }] },
  { id: "performance", label: "自己的表现", effects: [{ dimension: "self", trait: "self_demand", value: 0.65 }, { dimension: "self", trait: "self_worth", value: -0.45 }] },
  { id: "future", label: "未来", effects: [{ dimension: "needs", trait: "safety", value: 0.5 }, { dimension: "direction", trait: "growth", value: 0.48 }] },
  { id: "others_view", label: "别人怎么看我", effects: [{ dimension: "self", trait: "external_validation", value: 0.82 }, { dimension: "self", trait: "self_doubt", value: 0.55 }] },
  { id: "recovery", label: "休息和恢复", effects: [{ dimension: "needs", trait: "rest", value: 0.82 }, { dimension: "state", trait: "energy", value: -0.55 }] },
  { id: "choice", label: "一个正在做的选择", effects: [{ dimension: "needs", trait: "control", value: 0.48 }, { dimension: "direction", trait: "freedom", value: 0.4 }] },
  { id: "unclear", label: "我也说不清", effects: [{ dimension: "state", trait: "clarity", value: -0.65 }] },
];

export const needOptions: QuestionOption[] = (Object.keys(needLabels) as NeedKey[]).map((need) => ({ id: need, label: needLabels[need], effects: [{ dimension: "needs", trait: need, value: 0.7 }] }));

export const QUESTION_BANK: QuestionDefinition[] = [
  {
    id: "outcome_first_response", type: "scenario", dimensions: ["self", "state", "needs"], discriminatesBetween: ["self_result", "restoration_load", "direction_growth"], informationValue: 0.94,
    prompt: "一个重要机会没有得到想要的结果，你最先出现的反应更接近哪一个？", support: "选最先浮现的，不必选择最理性的。",
    options: [
      { id: "adjust", label: "先想哪里可以调整", detail: "把注意力放回行动", effects: [{ dimension: "direction", trait: "growth", value: 0.72 }, { dimension: "self", trait: "self_worth", value: 0.35 }] },
      { id: "not_enough", label: "是不是我本来就不够好", detail: "结果很快变成对自己的评价", effects: [{ dimension: "self", trait: "self_doubt", value: 0.9 }, { dimension: "self", trait: "self_worth", value: -0.82 }] },
      { id: "others_react", label: "别人会怎么看我", detail: "评价比结果更先出现", effects: [{ dimension: "self", trait: "external_validation", value: 0.92 }, { dimension: "needs", trait: "recognition", value: 0.62 }] },
      { id: "step_away", label: "先不想，暂时躲开", detail: "需要从负荷里退开", effects: [{ dimension: "state", trait: "avoidance", value: 0.82 }, { dimension: "needs", trait: "rest", value: 0.58 }] },
      { id: "none", label: "都不太像", effects: [] },
    ],
  },
  {
    id: "uncertainty_or_evaluation", type: "scenario", dimensions: ["needs", "self", "state"], discriminatesBetween: ["safety_certainty", "self_result"], informationValue: 0.98,
    prompt: "当一个重要结果迟迟没有确定，哪件事更让你难受？", support: "这一步用来区分“未知”与“评价”带来的重量。",
    options: [
      { id: "unknown", label: "不知道最后会发生什么", effects: [{ dimension: "needs", trait: "safety", value: 0.88 }, { dimension: "needs", trait: "control", value: 0.64 }] },
      { id: "ability", label: "怕结果证明自己不够好", effects: [{ dimension: "self", trait: "self_doubt", value: 0.88 }, { dimension: "self", trait: "self_worth", value: -0.72 }] },
      { id: "reputation", label: "担心别人改变对我的评价", effects: [{ dimension: "self", trait: "external_validation", value: 0.9 }, { dimension: "needs", trait: "recognition", value: 0.65 }] },
      { id: "none", label: "其实都不是", effects: [] },
    ],
  },
  {
    id: "expression_tradeoff", type: "tradeoff", dimensions: ["relationship", "needs"], discriminatesBetween: ["relational_expression", "safety_certainty"], informationValue: 0.9,
    prompt: "如果只能选一个，你现在更愿意怎么做？", support: "没有正确选项，也可以选择都不贴近。",
    options: [
      { id: "speak", label: "把真实感受说出来，即使可能有冲突", effects: [{ dimension: "relationship", trait: "expression", value: -0.72 }, { dimension: "relationship", trait: "boundary", value: 0.62 }, { dimension: "relationship", trait: "trust", value: 0.48 }] },
      { id: "stabilize", label: "先维持关系稳定，暂时不说", effects: [{ dimension: "relationship", trait: "expression", value: 0.82 }, { dimension: "relationship", trait: "conflict", value: 0.76 }, { dimension: "needs", trait: "safety", value: 0.52 }] },
      { id: "distance", label: "先拉开一点距离，再决定", effects: [{ dimension: "relationship", trait: "distance", value: 0.72 }, { dimension: "needs", trait: "freedom", value: 0.45 }] },
      { id: "none", label: "都不贴近", effects: [] },
    ],
  },
  {
    id: "rest_or_finish", type: "tradeoff", dimensions: ["state", "needs", "direction"], discriminatesBetween: ["restoration_load", "self_result"], informationValue: 0.82,
    prompt: "今天只剩一小段力气，你更想把它用在哪里？", support: "选择此刻，而不是理想中的自己。",
    options: [
      { id: "rest", label: "真正停下来，让身体先恢复", effects: [{ dimension: "needs", trait: "rest", value: 0.9 }, { dimension: "state", trait: "energy", value: -0.62 }] },
      { id: "finish", label: "再完成一件事，才允许自己休息", effects: [{ dimension: "self", trait: "self_demand", value: 0.84 }, { dimension: "direction", trait: "achievement", value: 0.62 }, { dimension: "state", trait: "mental_load", value: 0.5 }] },
      { id: "connect", label: "留给一个真正想见的人", effects: [{ dimension: "needs", trait: "connection", value: 0.75 }, { dimension: "direction", trait: "relationship", value: 0.6 }] },
      { id: "none", label: "都不太像", effects: [] },
    ],
  },
  {
    id: "direction_tradeoff", type: "tradeoff", dimensions: ["direction", "needs"], discriminatesBetween: ["direction_growth", "safety_certainty"], informationValue: 0.9,
    prompt: "如果暂时不能两者兼得，你更愿意先选择哪一个？", support: "这不是长期承诺，只是此刻的优先级。",
    options: [
      { id: "stable", label: "更确定、更稳定的结果", effects: [{ dimension: "direction", trait: "stability", value: 0.82 }, { dimension: "needs", trait: "safety", value: 0.7 }] },
      { id: "alive", label: "真正想做、但风险更高的方向", effects: [{ dimension: "direction", trait: "freedom", value: 0.75 }, { dimension: "direction", trait: "exploration", value: 0.72 }, { dimension: "direction", trait: "creativity", value: 0.55 }] },
      { id: "grow", label: "能让我持续成长的选择", effects: [{ dimension: "direction", trait: "growth", value: 0.82 }, { dimension: "needs", trait: "achievement", value: 0.45 }] },
      { id: "none", label: "现在还无法取舍", effects: [{ dimension: "state", trait: "clarity", value: -0.4 }] },
    ],
  },
  {
    id: "boundary_scenario", type: "scenario", dimensions: ["relationship", "self"], discriminatesBetween: ["relational_expression", "stable_direction"], informationValue: 0.84,
    prompt: "别人提出一件让你为难的事，你更可能先做什么？", support: "选最熟悉的反应。",
    options: [
      { id: "agree", label: "先答应，再想办法消化", effects: [{ dimension: "relationship", trait: "boundary", value: -0.82 }, { dimension: "relationship", trait: "conflict", value: 0.62 }] },
      { id: "explain", label: "解释很多，希望对方不要失望", effects: [{ dimension: "self", trait: "external_validation", value: 0.62 }, { dimension: "relationship", trait: "boundary", value: -0.55 }] },
      { id: "limit", label: "说明我能做到哪里", effects: [{ dimension: "relationship", trait: "boundary", value: 0.82 }, { dimension: "relationship", trait: "trust", value: 0.45 }] },
      { id: "none", label: "都不太像", effects: [] },
    ],
  },
];

type HypothesisDefinition = { key: string; statement: string; dimensions: Dimension[]; traits: Record<string, number>; evidenceLabel: string };
const HYPOTHESIS_DEFINITIONS: HypothesisDefinition[] = [
  { key: "self_result", statement: "你最近在意的不只是结果本身，结果也可能影响你怎么看待自己的表现。", dimensions: ["self", "needs"], traits: { self_doubt: 1, external_validation: 0.9, self_demand: 0.65, self_worth: -0.9, recognition: 0.55 }, evidenceLabel: "结果、评价与自我感受之间出现了关联" },
  { key: "safety_certainty", statement: "你此刻可能更需要确定感与可掌控的边界，而不只是更快得到结果。", dimensions: ["needs", "state"], traits: { safety: 1, control: 0.82, stress: 0.45, clarity: -0.45 }, evidenceLabel: "你多次把确定感或掌控感放在较前位置" },
  { key: "relational_expression", statement: "你可能很在意连接，同时也会在表达真实需要前先保护关系的稳定。", dimensions: ["relationship", "needs"], traits: { expression: 1, conflict: 0.8, boundary: -0.75, connection: 0.65, distance: 0.35 }, evidenceLabel: "连接需要与表达上的保留同时出现" },
  { key: "restoration_load", statement: "比起再把事情想清楚一点，你此刻也许更需要先从持续的负荷里恢复。", dimensions: ["state", "needs"], traits: { rest: 1, energy: -0.9, mental_load: 0.8, stress: 0.62, avoidance: 0.35 }, evidenceLabel: "低能量与恢复需要在不同选择中重复出现" },
  { key: "direction_growth", statement: "你正在寻找的可能不是唯一正确答案，而是一个更符合成长、自由与生命力的方向。", dimensions: ["direction", "needs"], traits: { growth: 0.9, freedom: 0.82, exploration: 0.85, creativity: 0.62, achievement: 0.35 }, evidenceLabel: "成长、自由或探索被你放在更重要的位置" },
  { key: "stable_direction", statement: "你此刻有一些稳定的内在判断，探索更像是在确认下一步，而不是修复自己。", dimensions: ["self", "direction", "state"], traits: { self_worth: 0.75, clarity: 0.72, stress: -0.6, boundary: 0.52, growth: 0.42 }, evidenceLabel: "你的选择里同时出现清晰度、边界和稳定自我评价" },
];

const sourceWeight: Record<SignalSource, number> = { choice: 0.14, multi_choice: 0.16, ranking: 0.21, scenario: 0.18, tradeoff: 0.19, verification: 0.18, user_confirmation: 0.25 };
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, Number(value.toFixed(3))));

export function createSession(now = Date.now()): V2Session {
  const suffix = new Date(now).toISOString().replace(/\D/g, "").slice(-12);
  const sessionId = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `inner-mirror-${suffix}`;
  return { schemaVersion: SCHEMA_VERSION, sessionId, createdAt: now, currentSessionStep: "entry", selections: {}, rankings: [], signals: [], hypotheses: [], adaptiveQuestionIds: [], userConfirmations: {}, verificationAttempts: 0, restoredMirrorShards: [], completedInteractions: [], analytics: [] };
}

export function track(session: V2Session, name: AnalyticsEventName, payload?: AnalyticsEvent["payload"]): V2Session { return { ...session, analytics: [...session.analytics, { name, createdAt: Date.now(), payload }] }; }
export function detectSafetyRisk(text: string) { return /自杀|轻生|不想活|结束生命|伤害自己|杀了自己|活不下去|suicid|kill myself|end my life|self[- ]?harm|hurt myself|do not want to live/i.test(text.trim()); }

function addEffects(session: V2Session, questionId: string, effects: SignalEffect[], source: SignalSource) {
  const retained = session.signals.filter((signal) => signal.questionId !== questionId);
  const createdAt = Date.now();
  const added = effects.map((effect, index): Signal => ({ id: `${questionId}:${effect.dimension}:${effect.trait}:${index}`, dimension: effect.dimension, trait: effect.trait, value: effect.value, source, reliability: effect.reliability ?? (source === "ranking" ? 0.9 : source === "scenario" || source === "tradeoff" ? 0.82 : 0.72), questionId, createdAt }));
  return { ...session, signals: [...retained, ...added] };
}

export function recordSelections(session: V2Session, questionId: string, selectedIds: string[], options: QuestionOption[], source: "choice" | "multi_choice" = "multi_choice") {
  const effects = selectedIds.flatMap((id) => options.find((option) => option.id === id)?.effects ?? []);
  return refreshHypotheses(addEffects({ ...session, selections: { ...session.selections, [questionId]: selectedIds } }, questionId, effects, source));
}

export function rankNeeds(session: V2Session, orderedNeeds: NeedKey[]) {
  const rankings = orderedNeeds.map((need, index): RankedNeed => ({ need, rank: index + 1, weight: clamp(1 - index * 0.18, 0.42, 1) }));
  return refreshHypotheses(addEffects({ ...session, rankings }, "need_ranking", rankings.map((item) => ({ dimension: "needs", trait: item.need, value: item.weight, reliability: 0.92 })), "ranking"));
}

function scoreSignal(signal: Signal, definition: HypothesisDefinition) { const traitWeight = definition.traits[signal.trait]; return traitWeight == null ? 0 : signal.value * traitWeight * signal.reliability; }
function evidenceFromSignal(signal: Signal) {
  if (signal.source === "ranking") return `你把“${needLabels[signal.trait as NeedKey] ?? signal.trait}”放在了较高位置。`;
  const labels: Record<string, string> = {
    outcome_first_response: "在结果受挫的情境里，你的第一反应提供了一条独立线索。",
    uncertainty_or_evaluation: "在等待结果的情境里，你区分了未知、能力与评价的重量。",
    expression_tradeoff: "在表达与关系稳定之间，你做出了一次明确取舍。",
    rest_or_finish: "在有限精力的取舍里，你留下了关于负荷与需要的线索。",
    direction_tradeoff: "在稳定与探索之间，你标记了此刻更重要的方向。",
    boundary_scenario: "在边界情境里，你选择了更熟悉的反应。",
  };
  return labels[signal.questionId ?? ""] ?? "你在不同的轻量选择里留下了相互关联的线索。";
}

export function buildHypotheses(signals: Signal[], confirmations: Record<string, ConfirmationState> = {}, now = Date.now()): Hypothesis[] {
  return HYPOTHESIS_DEFINITIONS.map((definition) => {
    const scored = signals.map((signal) => ({ signal, score: scoreSignal(signal, definition) })).filter((item) => Math.abs(item.score) >= 0.12);
    const supporting = scored.filter((item) => item.score > 0.12);
    const contradicting = scored.filter((item) => item.score < -0.12);
    const sources = [...new Set(supporting.map((item) => item.signal.source))];
    let confidence = 0.16;
    for (const source of sources) {
      const strongest = Math.max(...supporting.filter((item) => item.signal.source === source).map((item) => Math.abs(item.score)), 0);
      confidence += sourceWeight[source] * clamp(strongest, 0.35, 1);
    }
    confidence += Math.min(0.14, Math.max(0, supporting.length - sources.length) * 0.035);
    confidence -= Math.min(0.24, contradicting.length * 0.16);
    const confirmation = confirmations[definition.key] ?? "unknown";
    if (confirmation === "confirmed") confidence += 0.25;
    if (confirmation === "partial") confidence += 0.1;
    if (confirmation === "rejected") confidence = Math.min(confidence - 0.32, 0.12);
    const evidence = [...new Set(supporting.sort((a, b) => b.score - a.score).map((item) => evidenceFromSignal(item.signal)))].slice(0, 3);
    if (confirmation === "confirmed") evidence.push("你确认这个理解很贴近。内容由你的确认而不是系统单方面决定。");
    if (confirmation === "partial") evidence.push("你认为这个理解有一点像，因此它仍保留不确定性。");
    return { id: `hypothesis:${definition.key}`, key: definition.key, statement: definition.statement, relatedDimensions: definition.dimensions, supportingSignalIds: supporting.map((item) => item.signal.id), contradictingSignalIds: contradicting.map((item) => item.signal.id), confidence: clamp(confidence, 0.05, 0.94), confirmation, evidence: evidence.length ? evidence : [definition.evidenceLabel], createdAt: now, updatedAt: now };
  }).sort((a, b) => b.confidence - a.confidence);
}

export function refreshHypotheses(session: V2Session): V2Session {
  const hypotheses = buildHypotheses(session.signals, session.userConfirmations);
  return { ...session, hypotheses, primaryHypothesisKey: hypotheses[0]?.key, alternativeHypothesisKey: hypotheses.find((item) => item.key !== hypotheses[0]?.key)?.key };
}
export function getHypothesis(session: V2Session, key = session.primaryHypothesisKey) { return session.hypotheses.find((item) => item.key === key); }

const intentBias: Record<ExplorationIntent, Dimension[]> = { current_state: ["state", "needs"], specific_concern: ["state", "self", "relationship"], repeated_pattern: ["self", "relationship"], find_direction: ["direction", "needs"] };

export function selectNextQuestion(session: V2Session): QuestionDefinition | null {
  const primary = getHypothesis(session); const alternative = getHypothesis(session, session.alternativeHypothesisKey); const asked = new Set(session.adaptiveQuestionIds); const preferred = session.explorationIntent ? intentBias[session.explorationIntent] : [];
  const candidates = QUESTION_BANK.filter((question) => !asked.has(question.id)).map((question) => {
    let score = question.informationValue;
    if (primary && question.discriminatesBetween?.includes(primary.key)) score += 0.28;
    if (alternative && question.discriminatesBetween?.includes(alternative.key)) score += 0.24;
    score += question.dimensions.filter((dimension) => preferred.includes(dimension)).length * 0.08;
    if ((primary?.contradictingSignalIds.length ?? 0) > 0 && question.dimensions.some((dimension) => primary?.relatedDimensions.includes(dimension))) score += 0.12;
    return { question, score };
  });
  candidates.sort((a, b) => b.score - a.score || a.question.id.localeCompare(b.question.id));
  return candidates[0]?.question ?? null;
}

export function shortHypothesisName(key: string) {
  const labels: Record<string, string> = { self_result: "结果与自我评价", safety_certainty: "确定感与掌控", relational_expression: "连接与表达", restoration_load: "负荷与恢复", direction_growth: "方向与成长", stable_direction: "稳定判断与下一步" };
  return labels[key] ?? "当前需要";
}

export function makeAgentDecision(session: V2Session, selectedQuestionId?: string, engine: AgentDecision["engine"] = "structured_fallback"): AgentDecision {
  const primary = getHypothesis(session); const alternative = getHypothesis(session, session.alternativeHypothesisKey); const localQuestion = selectNextQuestion(session);
  const allowed = QUESTION_BANK.find((question) => question.id === selectedQuestionId && !session.adaptiveQuestionIds.includes(question.id));
  const selected = allowed ?? localQuestion; const enoughQuestions = session.adaptiveQuestionIds.length >= (session.verificationAttempts > 0 ? 3 : 2);
  const transitionCopy = primary && alternative ? `目前“${shortHypothesisName(primary.key)}”与“${shortHypothesisName(alternative.key)}”都留下了线索，我想用一次具体取舍把它们分开。` : "我开始看到一个方向了，还想用一个具体情境确认它。";
  return { nextAction: enoughQuestions ? "verify_hypothesis" : selected ? "ask_question" : "reveal_room", selectedQuestionId: enoughQuestions ? undefined : selected?.id, focusDimensions: [...new Set([...(primary?.relatedDimensions ?? []), ...(alternative?.relatedDimensions ?? [])])].slice(0, 3), primaryHypothesisKey: primary?.key, alternativeHypothesisKey: alternative?.key, transitionCopy, reasonCode: selected ? "max_information_gain_between_top_hypotheses" : "question_bank_exhausted", engine };
}

export function answerAdaptiveQuestion(session: V2Session, questionId: string, optionId: string): V2Session {
  const question = QUESTION_BANK.find((item) => item.id === questionId); const option = question?.options.find((item) => item.id === optionId); if (!question || !option) return session;
  const source = question.type === "tradeoff" ? "tradeoff" : "scenario";
  const next = addEffects({ ...session, selections: { ...session.selections, [questionId]: [optionId] }, adaptiveQuestionIds: session.adaptiveQuestionIds.includes(questionId) ? session.adaptiveQuestionIds : [...session.adaptiveQuestionIds, questionId], agentDecision: undefined }, questionId, option.effects, source);
  return track(refreshHypotheses(next), "adaptive_question_answered", { question_id: questionId, option_id: optionId });
}

export function verifyHypothesis(session: V2Session, state: Exclude<ConfirmationState, "unknown">, alternativeKey?: string): V2Session {
  const targetKey = alternativeKey ?? session.primaryHypothesisKey; if (!targetKey) return session;
  const next = refreshHypotheses({ ...session, userConfirmations: { ...session.userConfirmations, [targetKey]: state }, verificationAttempts: session.verificationAttempts + 1, agentDecision: undefined });
  const eventName = state === "confirmed" ? "hypothesis_confirmed" : state === "partial" ? "hypothesis_partially_confirmed" : "hypothesis_rejected";
  return track(next, eventName, { hypothesis_key: targetKey });
}

function positiveSignals(session: V2Session, traits: string[]) { return session.signals.filter((signal) => traits.includes(signal.trait) && signal.value * signal.reliability >= 0.28); }
function negativeSignals(session: V2Session, traits: string[]) { return session.signals.filter((signal) => traits.includes(signal.trait) && signal.value * signal.reliability <= -0.28); }
function distinctEvidence(signals: Signal[]) { return new Set(signals.map((signal) => `${signal.questionId}:${signal.source}`)).size; }

export function composeRoomState(session: V2Session): RoomState {
  const selfSignals = [...positiveSignals(session, ["self_doubt", "external_validation", "self_demand"]), ...negativeSignals(session, ["self_worth"])];
  const relationshipSignals = [...positiveSignals(session, ["expression", "conflict", "distance"]), ...negativeSignals(session, ["boundary", "trust"])];
  const loadSignals = [...positiveSignals(session, ["stress", "mental_load", "avoidance"]), ...negativeSignals(session, ["energy", "clarity"])];
  const connectionSignals = positiveSignals(session, ["connection", "relationship"]);
  const selfHypothesis = getHypothesis(session, "self_result"); const relationshipHypothesis = getHypothesis(session, "relational_expression"); const safetyHypothesis = getHypothesis(session, "safety_certainty");
  const selfEvidence = distinctEvidence(selfSignals); const relationshipEvidence = distinctEvidence(relationshipSignals);
  const mirrorState: RoomState["mirror"]["state"] = selfEvidence >= 2 && ((selfHypothesis?.confidence ?? 0) >= 0.56 || selfHypothesis?.confirmation === "confirmed") ? "fragmented" : selfEvidence >= 1 ? "blurred" : "stable";
  const windowState: RoomState["window"]["state"] = relationshipEvidence >= 2 && (relationshipHypothesis?.confirmation === "confirmed" || (relationshipHypothesis?.confidence ?? 0) >= 0.55) ? "closed" : relationshipEvidence >= 1 || (safetyHypothesis?.confidence ?? 0) >= 0.5 ? "fogged" : "open";
  const stressLoad = loadSignals.reduce((sum, signal) => sum + Math.abs(signal.value * signal.reliability), 0) / Math.max(1, loadSignals.length);
  const lightLevel = clamp(0.84 - stressLoad * 0.55, 0.27, 0.9); const unspoken = (relationshipEvidence >= 1 && connectionSignals.length >= 1) || relationshipHypothesis?.confirmation === "confirmed";
  const letterState: RoomState["letter"]["state"] = unspoken ? "unspoken" : connectionSignals.length ? "present" : "quiet";
  const recommended: Array<"mirror" | "window" | "letter"> = [];
  if (mirrorState === "fragmented") recommended.push("mirror"); if (windowState !== "open") recommended.push("window"); if (letterState === "unspoken") recommended.push("letter");
  if (!recommended.length) recommended.push(session.explorationIntent === "find_direction" ? "window" : "mirror"); if (recommended.length === 1) recommended.push(recommended[0] === "letter" ? "window" : "letter");
  return {
    mirror: { state: mirrorState, intensity: clamp(selfEvidence / 3, 0.15, 1) }, window: { state: windowState, intensity: clamp((relationshipEvidence + (safetyHypothesis?.confidence ?? 0)) / 3, 0.15, 1) }, light: { level: lightLevel },
    letter: { state: letterState, intensity: clamp((connectionSignals.length + relationshipEvidence) / 3, 0.15, 1) }, space: { openness: windowState === "open" ? 0.84 : windowState === "fogged" ? 0.52 : 0.32, order: mirrorState === "fragmented" ? 0.42 : mirrorState === "blurred" ? 0.66 : 0.84 },
    completedInteractions: { mirror: false, window: false, letter: false }, recommendedInteractions: recommended.slice(0, 2),
    evidence: {
      mirror: selfEvidence ? ["至少两条独立的 Self 线索共同决定镜面状态。", ...(selfHypothesis?.evidence ?? []).slice(0, 2)] : ["目前没有足够线索让镜面出现明显破损。"],
      window: relationshipEvidence ? ["表达、边界或距离的线索共同影响了窗的状态。", ...(relationshipHypothesis?.evidence ?? []).slice(0, 2)] : ["目前没有足够的关系线索让窗关闭。"],
      light: loadSignals.length ? ["能量、压力与心智负荷共同影响了房间亮度。"] : ["当前状态线索较稳定，房间保留了较多自然光。"],
      letter: unspoken ? ["连接需要与表达上的保留同时出现，因此信件处于未说出口的状态。"] : ["目前没有足够线索把表达标记为未说出口。"],
    },
  };
}

export function completeInteraction(session: V2Session, kind: "mirror" | "window" | "letter", keptText?: string): V2Session {
  const room = session.roomState ?? composeRoomState(session); const completedInteractions = session.completedInteractions.includes(kind) ? session.completedInteractions : [...session.completedInteractions, kind];
  const roomState: RoomState = { ...room,
    mirror: kind === "mirror" && room.mirror.state === "fragmented" ? { ...room.mirror, state: "restored", intensity: 0.22 } : room.mirror,
    window: kind === "window" ? { ...room.window, state: "open", intensity: 0.18 } : room.window,
    light: kind === "window" ? { level: clamp(room.light.level + 0.16, 0.27, 0.94) } : room.light,
    letter: kind === "letter" ? { ...room.letter, state: "kept", keptText } : room.letter,
    space: kind === "window" ? { ...room.space, openness: clamp(room.space.openness + 0.22) } : room.space,
    completedInteractions: { ...room.completedInteractions, [kind]: true },
  };
  return track({ ...session, roomState, completedInteractions }, "interaction_completed", { interaction: kind });
}

export function letterCandidates(session: V2Session) {
  const sets: Record<string, string[]> = {
    self_result: ["其实我只是希望自己的努力被看见。", "我不需要每一次结果都证明我的价值。", "我可以认真，也可以不把自己交给评价。"],
    safety_certainty: ["我现在需要的，也许只是更清楚的边界。", "不知道答案时，我仍可以先照顾好自己。", "我想把真正担心的部分说得更明白。"],
    relational_expression: ["我在意这段关系，也想让真实的我留在里面。", "有些需要没有说出口，不等于它们不重要。", "我可以表达，而不必先保证对方满意。"],
    restoration_load: ["我可能比自己想象中更需要休息。", "停下来不是放弃，是让自己重新有力气。", "今天不必再完成什么，我也可以被允许。"],
    direction_growth: ["我想选一个更像自己的方向。", "我可以先靠近有生命力的那一步。", "不确定不等于没有方向。"],
    stable_direction: ["我已经有一些答案，接下来只需要试着走一步。", "稳定不必来自完美确定。", "我可以相信此刻已经看清的部分。"],
  };
  return sets[session.primaryHypothesisKey ?? ""] ?? sets.stable_direction;
}

export function buildReflection(session: V2Session): ReflectionResult {
  const primary = getHypothesis(session); const alternative = getHypothesis(session, session.alternativeHypothesisKey);
  const confirmed = session.hypotheses.find((item) => item.confirmation === "confirmed" && item.confidence >= 0.68); const partial = session.hypotheses.find((item) => item.confirmation === "partial") ?? primary;
  const certain = confirmed?.statement ?? "这次还没有形成需要被定论的结论；你保留了对系统判断的修正权。";
  const learning = partial && partial.key !== confirmed?.key ? `${partial.statement} 目前它仍是一条正在理解的方向。` : alternative ? `${alternative.statement} 这部分线索还不够完整。` : "目前还没有足够线索形成第二个可靠方向。";
  const rejected = session.hypotheses.find((item) => item.confirmation === "rejected");
  const unclear = rejected ? `你已经排除了“${shortHypothesisName(rejected.key)}”这个解释；更贴近的原因仍需要以后继续观察。` : alternative ? `“${shortHypothesisName(primary?.key ?? "")}”与“${shortHypothesisName(alternative.key)}”之间，仍有一部分没有足够线索。` : "有些部分目前还没有足够线索，Inner Mirror 不会替你补齐答案。";
  const evidence = [...new Set([...(confirmed?.evidence ?? []), ...(primary?.evidence ?? [])])].slice(0, 4);
  const takeaways = [confirmed ? `我比较确定：${shortHypothesisName(confirmed.key)}值得我继续留意。` : "没有结论也没关系，我已经更清楚什么还不确定。", session.roomState?.mirror.state === "restored" ? "我可以重新组织怎么看自己，而不是抹去裂痕。" : "我不需要用单一结果定义此刻的自己。", session.roomState?.letter.keptText ?? letterCandidates(session)[0]];
  return { certain, learning, unclear, evidence, takeaways };
}

export function createInnerMapEntry(session: V2Session, takeaway: string): InnerMapEntry {
  const reflection = session.reflection ?? buildReflection(session); const roomSnapshot = session.roomState ?? composeRoomState(session);
  const ranked = [...session.rankings].sort((a, b) => a.rank - b.rank).slice(0, 3).map((item) => needLabels[item.need]);
  const stateTraits = session.signals.filter((signal) => signal.dimension === "state" && Math.abs(signal.value) >= 0.5).sort((a, b) => Math.abs(b.value) - Math.abs(a.value)).slice(0, 3).map((signal) => signal.trait);
  return { id: session.sessionId, createdAt: Date.now(), explorationIntent: session.explorationIntent ?? "current_state", topStateSignals: stateTraits, topNeeds: ranked, confirmedInsights: [reflection.certain], openQuestions: [reflection.unclear], roomSnapshot, completedInteractions: session.completedInteractions, takeaway };
}

export function restoreSession(raw: string | null): V2Session | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<V2Session>; if (value.schemaVersion !== SCHEMA_VERSION || typeof value.sessionId !== "string") return null;
    const base = createSession(typeof value.createdAt === "number" ? value.createdAt : Date.now());
    return refreshHypotheses({ ...base, ...value, schemaVersion: SCHEMA_VERSION, selections: value.selections && typeof value.selections === "object" ? value.selections : {}, rankings: Array.isArray(value.rankings) ? value.rankings : [], signals: Array.isArray(value.signals) ? value.signals : [], hypotheses: Array.isArray(value.hypotheses) ? value.hypotheses : [], adaptiveQuestionIds: Array.isArray(value.adaptiveQuestionIds) ? value.adaptiveQuestionIds : [], userConfirmations: value.userConfirmations && typeof value.userConfirmations === "object" ? value.userConfirmations : {}, restoredMirrorShards: Array.isArray(value.restoredMirrorShards) ? value.restoredMirrorShards : [], completedInteractions: Array.isArray(value.completedInteractions) ? value.completedInteractions : [], analytics: Array.isArray(value.analytics) ? value.analytics : [] });
  } catch { return null; }
}

export function restoreInnerMap(raw: string | null): InnerMapEntry[] {
  if (!raw) return [];
  try { const value = JSON.parse(raw); return Array.isArray(value) ? value.filter((item) => item && typeof item.id === "string" && typeof item.createdAt === "number") : []; } catch { return []; }
}

export function migrateLegacySessions(raw: string | null): InnerMapEntry[] {
  if (!raw) return [];
  try {
    const sessions = JSON.parse(raw) as Array<Record<string, unknown>>; if (!Array.isArray(sessions)) return [];
    return sessions.flatMap((legacy) => {
      const id = typeof legacy.session_id === "string" ? legacy.session_id : null; const saved = legacy.saved_insight as Record<string, unknown> | undefined; if (!id || !saved) return [];
      return [{ id: `legacy:${id}`, createdAt: Date.parse(String(saved.saved_at ?? legacy.created_at ?? "")) || Date.now(), explorationIntent: "current_state" as const, topStateSignals: [], topNeeds: [], confirmedInsights: [String(saved.working_hypothesis ?? saved.what_i_noticed ?? "曾完成一次早期版本探索。")], openQuestions: [], roomSnapshot: composeRoomState(createSession()), completedInteractions: ["mirror"], takeaway: String(saved.something_to_carry ?? "这是一条从早期版本保留的记录。"), migratedFromLegacy: true }];
    });
  } catch { return []; }
}
