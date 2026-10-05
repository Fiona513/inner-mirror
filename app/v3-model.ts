export const V3_SCHEMA_VERSION = 3 as const;

export type Domain = "state" | "needs" | "self" | "relationship" | "direction";
export type SignalSource = "choice" | "multi_choice" | "ranking" | "scenario" | "tradeoff" | "spatial_action" | "verification" | "confirmation";
export type AgentAction = "ASK" | "VERIFY" | "BRANCH" | "REWEIGHT" | "REVEAL_MAP" | "UPDATE_MAP" | "SELECT_SPATIAL_INTERACTION" | "UPDATE_SPACE" | "COMPARE_HISTORY" | "REFLECT" | "STOP";
export type SupportState = "clear" | "forming" | "possible" | "uncertain" | "contradiction" | "recent_change";
export type Confirmation = "unknown" | "confirmed" | "partial" | "rejected" | "alternative";
export type SessionStep = "entry" | "pulse" | "priorities" | "adaptive" | "map" | "mirror" | "reflection" | "keep" | "done";
export type ExplorationIntent = "current" | "concern" | "recurring" | "direction";
export type MirrorState = "CLEAR" | "BLURRED" | "LAYERED" | "FRAGMENTED" | "REARRANGED";
export type MirrorZone = "center" | "edge" | "outside" | "pending";

export interface Signal {
  id: string;
  domain: Domain;
  trait: string;
  value: number;
  source: SignalSource;
  reliability: number;
  sessionId: string;
  createdAt: number;
  questionId?: string;
  label?: string;
}

export interface SignalEffect { domain: Domain; trait: string; value: number; reliability?: number; label?: string }
export interface QuestionOption { id: string; label: string; detail?: string }
export interface QuestionDefinition {
  id: string;
  type: "single" | "multi" | "ranking" | "scenario" | "tradeoff" | "verification";
  targetTraits: string[];
  discriminatesBetween?: string[];
  prompt: string;
  support: string;
  options: QuestionOption[];
  signalEffects: Record<string, SignalEffect[]>;
  informationValue: number;
}

export interface Contradiction { id: string; trait: string; label: string; supportingSignalIds: string[]; contradictingSignalIds: string[] }
export interface Hypothesis {
  key: string;
  statement: string;
  relationLabel: string;
  domains: Domain[];
  supportingSignalIds: string[];
  contradictingSignalIds: string[];
  independentSources: SignalSource[];
  supportScore: number;
  confirmation: Confirmation;
  evidence: string[];
}

export interface AgentDecision {
  action: AgentAction;
  nextQuestionId?: string;
  primaryKey?: string;
  alternativeKey?: string;
  reasonCode: string;
  message: string;
  engine: "structured_fallback" | "llm_assisted";
}

export interface MapNode { id: string; label: string; domain: Domain; state: SupportState; evidence: string[] }
export interface MapRelation { id: string; from: string; to: string; label: string; state: SupportState; hypothesisKey?: string; evidence: string[] }
export interface CurrentInnerMap { nodes: MapNode[]; relations: MapRelation[]; updatedAt: number; version: number }
export interface MirrorItem { id: string; label: string; trait: string; initialZone: MirrorZone; zone: MirrorZone }
export interface SpatialInteractionState { kind: "mirror_self_arrangement"; mirrorState: MirrorState; items: MirrorItem[]; moves: number; completed: boolean; updatedMap: boolean }
export interface HistoricalComparison { difference?: string; recurrence?: string; possiblePattern?: string; reasonOptions: string[] }
export interface Reflection { certain: string; forming: string; unknown: string; candidates: string[]; openQuestion: string }
export interface HistoryEntry {
  id: string; sessionId: string; createdAt: number; intent: ExplorationIntent; primaryKey?: string; priorityOrder: string[];
  confirmedInsight: string; openQuestion: string; keptInsight: string; map: CurrentInnerMap; spatialState?: SpatialInteractionState;
  confirmation: Confirmation; comparison?: HistoricalComparison; migratedFromV2?: boolean;
}

export type AnalyticsEventName = "session_started" | "entry_selected" | "signal_added" | "ranking_completed" | "agent_action_selected" | "branch_changed" | "contradiction_detected" | "hypothesis_shown" | "hypothesis_confirmed" | "hypothesis_rejected" | "inner_map_revealed" | "spatial_interaction_started" | "spatial_interaction_completed" | "reflection_viewed" | "insight_kept" | "session_saved" | "history_comparison_shown" | "session_completed";
export interface AnalyticsEvent { name: AnalyticsEventName; createdAt: number; payload?: Record<string, string | number | boolean> }

export interface V3Session {
  schemaVersion: typeof V3_SCHEMA_VERSION;
  sessionId: string;
  createdAt: number;
  currentStep: SessionStep;
  intent?: ExplorationIntent;
  signals: Signal[];
  priorityOrder: string[];
  answers: Record<string, string[]>;
  askedQuestionIds: string[];
  hypotheses: Hypothesis[];
  primaryKey?: string;
  alternativeKey?: string;
  contradictions: Contradiction[];
  userCorrections: Record<string, Confirmation>;
  agentDecision?: AgentDecision;
  currentInnerMap: CurrentInnerMap;
  spatialInteractionState?: SpatialInteractionState;
  reflection?: Reflection;
  keptInsight?: string;
  openQuestion?: string;
  historicalComparison?: HistoricalComparison;
  historyCountAtStart: number;
  actionCount: number;
  analytics: AnalyticsEvent[];
}

export const intentOptions: Array<{ id: ExplorationIntent; label: string; detail: string }> = [
  { id: "current", label: "看看最近的自己", detail: "从此刻最明显的状态开始" },
  { id: "concern", label: "理清一件牵动我的事", detail: "看看它还连接着什么" },
  { id: "recurring", label: "观察一个再次出现的反应", detail: "先比较，不急着把它定义成模式" },
  { id: "direction", label: "想清楚此刻更想靠近什么", detail: "从真实取舍里看优先级" },
];

export const pulseOptions: Array<QuestionOption & { effects: SignalEffect[] }> = [
  { id: "low_energy", label: "能量偏低", detail: "身体和注意力都想慢一点", effects: [{ domain: "state", trait: "energy", value: -0.85, label: "最近能量偏低" }, { domain: "needs", trait: "rest", value: 0.66, label: "恢复的需要更靠前" }] },
  { id: "tense", label: "有些紧绷", detail: "很多事情悬着，还没有落地", effects: [{ domain: "state", trait: "tension", value: 0.82, label: "最近有些紧绷" }, { domain: "needs", trait: "certainty", value: 0.5, label: "确定感可能重要" }] },
  { id: "result", label: "被一个结果牵动", detail: "注意力总回到表现与反馈", effects: [{ domain: "self", trait: "result_worth", value: 0.7, label: "结果正在牵动自我评价" }, { domain: "direction", trait: "achievement", value: 0.55, label: "结果感比较突出" }] },
  { id: "connection", label: "想靠近，又有保留", detail: "关系里有话还没有找到位置", effects: [{ domain: "relationship", trait: "expression_hold", value: 0.78, label: "表达前会先保护关系" }, { domain: "needs", trait: "connection", value: 0.68, label: "连接的需要比较突出" }] },
  { id: "clear", label: "整体还算稳定", detail: "没有明显失衡，只是想更清楚一点", effects: [{ domain: "state", trait: "clarity", value: 0.75, label: "此刻状态相对稳定" }, { domain: "self", trait: "self_stability", value: 0.68, label: "自我评价相对稳定" }] },
  { id: "not_external", label: "不太受别人评价影响", detail: "至少此刻，我更在意自己的判断", effects: [{ domain: "self", trait: "external_validation", value: -0.82, label: "你更倾向自己的判断" }, { domain: "self", trait: "self_defined", value: 0.72, label: "自己的判断更靠近中心" }] },
  { id: "unclear", label: "还说不清", detail: "有感觉，但暂时没有名字", effects: [{ domain: "state", trait: "clarity", value: -0.58, label: "一些感受还没有被区分" }] },
];

export const priorityLabels: Record<string, string> = {
  stability: "稳定", freedom: "自由", recognition: "被认可", connection: "被理解", achievement: "有结果", rest: "恢复", autonomy: "自己的选择", exploration: "找到方向",
};

const priorityEffects: Record<string, SignalEffect[]> = {
  stability: [{ domain: "needs", trait: "certainty", value: 0.82, label: "稳定被放在较前位置" }],
  freedom: [{ domain: "direction", trait: "freedom", value: 0.82, label: "自由被放在较前位置" }],
  recognition: [{ domain: "needs", trait: "recognition", value: 0.78, label: "被认可被放在较前位置" }, { domain: "self", trait: "external_validation", value: 0.64, label: "外部评价在排序中再次出现" }],
  connection: [{ domain: "needs", trait: "connection", value: 0.82, label: "被理解被放在较前位置" }],
  achievement: [{ domain: "direction", trait: "achievement", value: 0.8, label: "结果被放在较前位置" }],
  rest: [{ domain: "needs", trait: "rest", value: 0.86, label: "恢复被放在较前位置" }],
  autonomy: [{ domain: "self", trait: "self_defined", value: 0.82, label: "自己的选择被放在较前位置" }],
  exploration: [{ domain: "direction", trait: "exploration", value: 0.82, label: "找到方向被放在较前位置" }],
};

export const QUESTION_BANK: QuestionDefinition[] = [
  {
    id: "result_scenario", type: "scenario", targetTraits: ["result_worth", "external_validation", "certainty"], discriminatesBetween: ["result_self", "certainty_control"], informationValue: .98,
    prompt: "一个重要结果没有如期出现，最先拉住你的是哪一部分？", support: "选最先出现的，不必选最理性的。",
    options: [{ id: "self", label: "开始怀疑自己的能力", detail: "结果很快变成对自己的评价" }, { id: "others", label: "想到别人会怎样看我", detail: "评价比下一步更先出现" }, { id: "unknown", label: "无法确定接下来会发生什么", detail: "未知本身最消耗" }, { id: "adjust", label: "先看哪里还可以调整", detail: "把注意力放回行动" }],
    signalEffects: {
      self: [{ domain: "self", trait: "result_worth", value: .92, label: "失败情境首先连接到自我评价" }],
      others: [{ domain: "self", trait: "external_validation", value: .94, label: "失败情境首先连接到他人评价" }, { domain: "needs", trait: "recognition", value: .62, label: "被认可再次出现" }],
      unknown: [{ domain: "needs", trait: "certainty", value: .9, label: "未知比评价更令人不安" }],
      adjust: [{ domain: "self", trait: "self_stability", value: .76, label: "结果没有直接变成自我否定" }, { domain: "direction", trait: "agency", value: .6, label: "注意力能够回到行动" }],
    },
  },
  {
    id: "relationship_tradeoff", type: "tradeoff", targetTraits: ["expression_hold", "boundary", "connection"], discriminatesBetween: ["connection_expression", "certainty_control"], informationValue: .92,
    prompt: "如果真实表达可能带来一点摩擦，此刻你更倾向哪边？", support: "这是此刻的取舍，不代表固定的关系方式。",
    options: [{ id: "say", label: "说清真实需要", detail: "让关系承受一点真实" }, { id: "hold", label: "先维持平稳", detail: "等更安全的时候再说" }, { id: "distance", label: "先拉开一点距离", detail: "给自己留下判断空间" }, { id: "unknown", label: "现在还分不清", detail: "暂时不替自己决定" }],
    signalEffects: {
      say: [{ domain: "relationship", trait: "expression_hold", value: -.72, label: "真实表达更靠前" }, { domain: "relationship", trait: "boundary", value: .7, label: "边界可以被说出来" }],
      hold: [{ domain: "relationship", trait: "expression_hold", value: .88, label: "会先保护关系稳定" }, { domain: "needs", trait: "certainty", value: .42, label: "安全感影响表达" }],
      distance: [{ domain: "relationship", trait: "distance", value: .78, label: "距离被用来保留判断空间" }, { domain: "self", trait: "self_defined", value: .42, label: "自己的判断需要空间" }],
      unknown: [{ domain: "state", trait: "clarity", value: -.45, label: "表达与稳定仍未分清" }],
    },
  },
  {
    id: "rest_tradeoff", type: "tradeoff", targetTraits: ["rest", "achievement", "self_demand"], discriminatesBetween: ["rest_load", "result_self"], informationValue: .88,
    prompt: "今天只剩一小段力气，你更愿意把它留在哪里？", support: "选择今天，不是理想中的自己。",
    options: [{ id: "rest", label: "真正停下来恢复", detail: "不再用完成换取休息" }, { id: "finish", label: "再完成一件事", detail: "完成后才比较允许自己停下" }, { id: "person", label: "留给一个想见的人", detail: "连接比进度更重要" }, { id: "unknown", label: "都不太贴近", detail: "暂时不增加解释" }],
    signalEffects: {
      rest: [{ domain: "needs", trait: "rest", value: .94, label: "有限精力更想留给恢复" }],
      finish: [{ domain: "self", trait: "self_demand", value: .88, label: "休息仍需要由完成来允许" }, { domain: "direction", trait: "achievement", value: .65, label: "结果继续占用有限精力" }],
      person: [{ domain: "needs", trait: "connection", value: .8, label: "有限精力更想留给连接" }],
      unknown: [],
    },
  },
  {
    id: "direction_tradeoff", type: "tradeoff", targetTraits: ["freedom", "certainty", "exploration"], discriminatesBetween: ["direction_values", "certainty_control"], informationValue: .93,
    prompt: "如果暂时不能两者兼得，哪一个更值得先靠近？", support: "不是长期承诺，只看此刻的优先级。",
    options: [{ id: "stable", label: "更确定、更稳定", detail: "减少悬而未决" }, { id: "alive", label: "更想做、但风险更高", detail: "让选择更像自己的" }, { id: "grow", label: "能持续成长", detail: "先保留变化的可能" }, { id: "unknown", label: "现在还无法取舍", detail: "保留未知也是有效信息" }],
    signalEffects: {
      stable: [{ domain: "needs", trait: "certainty", value: .86, label: "取舍时稳定更靠前" }],
      alive: [{ domain: "direction", trait: "freedom", value: .86, label: "取舍时自由更靠前" }, { domain: "self", trait: "self_defined", value: .62, label: "更想靠近自己的选择" }],
      grow: [{ domain: "direction", trait: "exploration", value: .84, label: "成长与探索更靠前" }],
      unknown: [{ domain: "state", trait: "clarity", value: -.42, label: "方向仍未分清" }],
    },
  },
  {
    id: "recognition_verify", type: "verification", targetTraits: ["external_validation", "recognition", "self_defined"], discriminatesBetween: ["result_self", "direction_values"], informationValue: .99,
    prompt: "这里有两个不完全一致的线索。更接近真实的是哪一个？", support: "这个选择会重新安排当前地图，而不是简单追加答案。",
    options: [{ id: "own", label: "我更在意自己的判断", detail: "认可重要，但不是决定性的" }, { id: "seen", label: "被重要的人看见确实会改变感受", detail: "评价的影响比我先前承认的更明显" }, { id: "context", label: "要看具体是谁、什么情境", detail: "两个线索可能都只在部分时候成立" }, { id: "unknown", label: "现在仍然说不清", detail: "先保留矛盾" }],
    signalEffects: {
      own: [{ domain: "self", trait: "external_validation", value: -.72, label: "验证时把自己的判断放在前面" }, { domain: "self", trait: "self_defined", value: .82, label: "自己的判断得到再次支持" }],
      seen: [{ domain: "self", trait: "external_validation", value: .88, label: "验证时确认评价会改变感受" }],
      context: [{ domain: "relationship", trait: "context_sensitivity", value: .75, label: "评价影响取决于具体关系" }],
      unknown: [{ domain: "state", trait: "clarity", value: -.35, label: "矛盾仍被保留" }],
    },
  },
  {
    id: "boundary_scenario", type: "scenario", targetTraits: ["boundary", "expression_hold", "external_validation"], discriminatesBetween: ["connection_expression", "result_self"], informationValue: .84,
    prompt: "别人提出一件让你为难的事，你通常最先做什么？", support: "选择最熟悉的第一反应。",
    options: [{ id: "agree", label: "先答应，再自己消化", detail: "不想马上让对方失望" }, { id: "explain", label: "解释很多，希望被理解", detail: "拒绝前先证明自己有理由" }, { id: "limit", label: "直接说明能做到哪里", detail: "让边界先变清楚" }, { id: "pause", label: "先不回答", detail: "给自己一点判断时间" }],
    signalEffects: {
      agree: [{ domain: "relationship", trait: "boundary", value: -.86, label: "为难时会先答应" }, { domain: "relationship", trait: "expression_hold", value: .62, label: "真实限制会被暂时收起" }],
      explain: [{ domain: "self", trait: "external_validation", value: .58, label: "设边界前会先争取理解" }, { domain: "relationship", trait: "boundary", value: -.45, label: "边界需要很多解释" }],
      limit: [{ domain: "relationship", trait: "boundary", value: .86, label: "能直接说明可承受的范围" }],
      pause: [{ domain: "relationship", trait: "distance", value: .5, label: "会先留出判断距离" }, { domain: "self", trait: "self_defined", value: .45, label: "先保留自己的判断" }],
    },
  },
];

type HypothesisDefinition = { key: string; statement: string; relationLabel: string; domains: Domain[]; traits: Record<string, number>; nodeLabels: [string, string] };
const HYPOTHESES: HypothesisDefinition[] = [
  { key: "result_self", statement: "此刻被牵动的可能不只是结果，结果也正在连接你怎么看自己。", relationLabel: "可能关联", domains: ["self", "direction"], traits: { result_worth: 1, external_validation: .72, recognition: .55, self_demand: .52, self_stability: -.55 }, nodeLabels: ["重要结果", "自我评价"] },
  { key: "certainty_control", statement: "现在更突出的可能是对确定感的需要，而不是尽快得到一个答案。", relationLabel: "正在形成", domains: ["needs", "state"], traits: { certainty: 1, tension: .48, clarity: -.42 }, nodeLabels: ["悬而未决", "确定感"] },
  { key: "connection_expression", statement: "连接对你很重要，但表达真实需要之前，你可能会先保护关系的稳定。", relationLabel: "可能关联", domains: ["relationship", "needs"], traits: { expression_hold: 1, connection: .72, boundary: -.68, distance: .32 }, nodeLabels: ["想靠近", "真实表达"] },
  { key: "rest_load", statement: "此刻最值得先看见的，也许不是如何做得更多，而是持续负荷留下的恢复需要。", relationLabel: "比较明确", domains: ["state", "needs"], traits: { rest: 1, energy: -.82, self_demand: .38, tension: .35 }, nodeLabels: ["持续负荷", "恢复需要"] },
  { key: "direction_values", statement: "当前并没有明显失衡；更值得探索的是稳定、自由与自己的选择如何排序。", relationLabel: "正在形成", domains: ["direction", "self"], traits: { freedom: .86, exploration: .82, self_defined: .72, self_stability: .55, clarity: .36 }, nodeLabels: ["此刻选择", "价值优先级"] },
];

const traitLabels: Record<string, string> = {
  energy: "能量", tension: "紧绷", clarity: "清晰度", rest: "恢复", certainty: "确定感", connection: "被理解", recognition: "被认可", result_worth: "结果", external_validation: "他人评价", self_defined: "自己的判断", self_stability: "稳定的自我评价", self_demand: "对自己的要求", achievement: "结果感", freedom: "自由", exploration: "探索", agency: "行动感", expression_hold: "表达保留", boundary: "边界", distance: "距离", context_sensitivity: "情境差异",
};

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const uid = (prefix: string, now = Date.now()) => `${prefix}-${now}-${Math.random().toString(36).slice(2, 8)}`;

export function track(session: V3Session, name: AnalyticsEventName, payload?: AnalyticsEvent["payload"]): V3Session {
  return { ...session, analytics: [...session.analytics, { name, createdAt: Date.now(), payload }] };
}

export function createSession(historyCount = 0, now = Date.now()): V3Session {
  const sessionId = uid("session", now);
  return {
    schemaVersion: V3_SCHEMA_VERSION, sessionId, createdAt: now, currentStep: "entry", signals: [], priorityOrder: [], answers: {}, askedQuestionIds: [], hypotheses: [], contradictions: [], userCorrections: {},
    currentInnerMap: { nodes: [], relations: [], updatedAt: now, version: 0 }, historyCountAtStart: historyCount, actionCount: 0, analytics: [{ name: "session_started", createdAt: now, payload: { returning: historyCount > 0 } }],
  };
}

function makeSignals(session: V3Session, questionId: string, optionId: string, source: SignalSource, effects: SignalEffect[], multiplier = 1): Signal[] {
  const now = Date.now();
  return effects.map((effect, index) => ({ id: uid(`${questionId}-${optionId}-${index}`, now), domain: effect.domain, trait: effect.trait, value: effect.value * multiplier, source, reliability: effect.reliability ?? ({ ranking: .84, scenario: .8, tradeoff: .82, verification: .9, confirmation: .95, spatial_action: .88, multi_choice: .68, choice: .64 }[source] ?? .7), sessionId: session.sessionId, createdAt: now + index, questionId, label: effect.label }));
}

function detectContradictions(signals: Signal[]): Contradiction[] {
  const traits = [...new Set(signals.map((signal) => signal.trait))];
  return traits.flatMap((trait) => {
    const relevant = signals.filter((signal) => signal.trait === trait);
    const positive = relevant.filter((signal) => signal.value > .25);
    const negative = relevant.filter((signal) => signal.value < -.25);
    const positiveSources = new Set(positive.map((signal) => signal.source));
    const negativeSources = new Set(negative.map((signal) => signal.source));
    const pos = positive.reduce((sum, signal) => sum + signal.value * signal.reliability, 0);
    const neg = Math.abs(negative.reduce((sum, signal) => sum + signal.value * signal.reliability, 0));
    if (pos < .38 || neg < .38 || (positiveSources.size + negativeSources.size < 2)) return [];
    return [{ id: `contradiction-${trait}`, trait, label: `${traitLabels[trait] ?? trait}出现了两个不完全一致的线索`, supportingSignalIds: positive.map((signal) => signal.id), contradictingSignalIds: negative.map((signal) => signal.id) }];
  });
}

function scoreHypotheses(signals: Signal[], corrections: Record<string, Confirmation>): Hypothesis[] {
  return HYPOTHESES.map((definition) => {
    const contributions = signals.map((signal) => ({ signal, contribution: (definition.traits[signal.trait] ?? 0) * signal.value * signal.reliability })).filter(({ contribution }) => Math.abs(contribution) > .06);
    const supporting = contributions.filter(({ contribution }) => contribution > 0);
    const contradicting = contributions.filter(({ contribution }) => contribution < 0);
    const sources = [...new Set(supporting.map(({ signal }) => signal.source))];
    const rawSupport = supporting.reduce((sum, item) => sum + item.contribution, 0);
    const rawContradiction = Math.abs(contradicting.reduce((sum, item) => sum + item.contribution, 0));
    const confirmation = corrections[definition.key] ?? "unknown";
    const confirmationDelta = confirmation === "confirmed" ? .2 : confirmation === "partial" ? .08 : confirmation === "rejected" ? -.55 : confirmation === "alternative" ? .16 : 0;
    const supportScore = confirmation === "rejected" ? Math.min(.12, clamp(.08 + rawSupport * .2 - rawContradiction * .16)) : clamp(.08 + rawSupport * .22 + Math.min(.18, sources.length * .055) - rawContradiction * .18 + confirmationDelta);
    const evidence = supporting.sort((a, b) => b.contribution - a.contribution).map(({ signal }) => signal.label ?? `${traitLabels[signal.trait] ?? signal.trait}提供了一个线索`).filter((item, index, all) => all.indexOf(item) === index).slice(0, 3);
    return { key: definition.key, statement: definition.statement, relationLabel: definition.relationLabel, domains: definition.domains, supportingSignalIds: supporting.map(({ signal }) => signal.id), contradictingSignalIds: contradicting.map(({ signal }) => signal.id), independentSources: sources, supportScore, confirmation, evidence };
  }).sort((a, b) => b.supportScore - a.supportScore);
}

function supportState(hypothesis: Hypothesis | undefined, contradictions: Contradiction[]): SupportState {
  if (!hypothesis) return "uncertain";
  if (contradictions.some((item) => hypothesis.supportingSignalIds.some((id) => item.supportingSignalIds.includes(id)))) return "contradiction";
  if (hypothesis.confirmation === "confirmed" && hypothesis.independentSources.length >= 2) return "clear";
  if (hypothesis.supportScore >= .5 && hypothesis.independentSources.length >= 2) return "forming";
  return hypothesis.supportScore >= .28 ? "possible" : "uncertain";
}

export function buildCurrentInnerMap(session: Pick<V3Session, "hypotheses" | "contradictions" | "currentInnerMap">): CurrentInnerMap {
  const visible = session.hypotheses.filter((hypothesis) => hypothesis.supportScore >= .2).slice(0, 2);
  const nodes: MapNode[] = [];
  const relations: MapRelation[] = [];
  for (const hypothesis of visible) {
    const definition = HYPOTHESES.find((item) => item.key === hypothesis.key)!;
    const state = supportState(hypothesis, session.contradictions);
    const [from, to] = definition.nodeLabels;
    for (const [index, label] of [from, to].entries()) {
      const id = `${hypothesis.key}-${index}`;
      if (!nodes.some((node) => node.id === id)) nodes.push({ id, label, domain: hypothesis.domains[index] ?? hypothesis.domains[0], state, evidence: hypothesis.evidence });
    }
    relations.push({ id: `relation-${hypothesis.key}`, from: `${hypothesis.key}-0`, to: `${hypothesis.key}-1`, label: state === "contradiction" ? "出现矛盾" : hypothesis.relationLabel, state, hypothesisKey: hypothesis.key, evidence: hypothesis.evidence });
  }
  if (!nodes.length) nodes.push({ id: "starting", label: "此刻状态", domain: "state", state: "uncertain", evidence: ["地图会随接下来的选择逐渐出现"] });
  return { nodes, relations, updatedAt: Date.now(), version: session.currentInnerMap.version + 1 };
}

export function refreshModel(session: V3Session): V3Session {
  const contradictions = detectContradictions(session.signals);
  const hypotheses = scoreHypotheses(session.signals, session.userCorrections);
  const eligible = hypotheses.filter((hypothesis) => hypothesis.confirmation !== "rejected");
  const primary = eligible[0] ?? hypotheses[0];
  const alternative = eligible.find((hypothesis) => hypothesis.key !== primary?.key) ?? hypotheses[1];
  const base = { ...session, hypotheses, contradictions, primaryKey: primary?.key, alternativeKey: alternative?.key };
  return { ...base, currentInnerMap: buildCurrentInnerMap(base) };
}

export function chooseIntent(session: V3Session, intent: ExplorationIntent): V3Session {
  return track({ ...session, intent, currentStep: "pulse", actionCount: session.actionCount + 1 }, "entry_selected", { intent });
}

export function recordPulse(session: V3Session, optionIds: string[]): V3Session {
  const kept = session.signals.filter((signal) => signal.questionId !== "pulse");
  const additions = optionIds.flatMap((id) => makeSignals(session, "pulse", id, "multi_choice", pulseOptions.find((option) => option.id === id)?.effects ?? []));
  let next = refreshModel({ ...session, currentStep: "priorities", answers: { ...session.answers, pulse: optionIds }, signals: [...kept, ...additions], actionCount: session.actionCount + 1 });
  for (const signal of additions) next = track(next, "signal_added", { source: signal.source, domain: signal.domain, trait: signal.trait });
  return next;
}

export function recordPriorities(session: V3Session, priorityOrder: string[]): V3Session {
  const kept = session.signals.filter((signal) => signal.questionId !== "priorities");
  const additions = priorityOrder.slice(0, 4).flatMap((id, index) => makeSignals(session, "priorities", id, "ranking", priorityEffects[id] ?? [], 1 - index * .18));
  let next = refreshModel({ ...session, priorityOrder, signals: [...kept, ...additions], answers: { ...session.answers, priorities: priorityOrder }, actionCount: session.actionCount + 1 });
  next = track(next, "ranking_completed", { top: priorityOrder[0] ?? "none" });
  if (next.contradictions.length) next = track(next, "contradiction_detected", { trait: next.contradictions[0].trait });
  return next;
}

export function answerQuestion(session: V3Session, questionId: string, optionId: string): V3Session {
  const question = QUESTION_BANK.find((item) => item.id === questionId);
  if (!question || !question.signalEffects[optionId]) return session;
  const source: SignalSource = question.type === "verification" ? "verification" : question.type === "single" ? "choice" : question.type === "multi" ? "multi_choice" : question.type;
  const additions = makeSignals(session, questionId, optionId, source, question.signalEffects[optionId]);
  let next = refreshModel({ ...session, answers: { ...session.answers, [questionId]: [optionId] }, askedQuestionIds: session.askedQuestionIds.includes(questionId) ? session.askedQuestionIds : [...session.askedQuestionIds, questionId], signals: [...session.signals, ...additions], actionCount: session.actionCount + 1 });
  for (const signal of additions) next = track(next, "signal_added", { source: signal.source, domain: signal.domain, trait: signal.trait });
  if (next.contradictions.length > session.contradictions.length) next = track(next, "contradiction_detected", { trait: next.contradictions.at(-1)?.trait ?? "unknown" });
  return next;
}

export function verifyHypothesis(session: V3Session, confirmation: Confirmation): V3Session {
  const key = confirmation === "alternative" ? session.alternativeKey : session.primaryKey;
  if (!key) return session;
  const corrections = { ...session.userCorrections };
  if (confirmation === "alternative") {
    if (session.primaryKey) corrections[session.primaryKey] = "rejected";
    corrections[key] = "alternative";
  } else corrections[key] = confirmation;
  let next = refreshModel({ ...session, userCorrections: corrections, actionCount: session.actionCount + 1 });
  const event = confirmation === "rejected" || confirmation === "alternative" ? "hypothesis_rejected" : "hypothesis_confirmed";
  next = track(next, event, { hypothesis: key, response: confirmation });
  if (confirmation === "rejected" || confirmation === "alternative") next = track(next, "branch_changed", { from: session.primaryKey ?? "none", to: next.primaryKey ?? "none" });
  return next;
}

function questionScore(question: QuestionDefinition, session: V3Session) {
  if (session.askedQuestionIds.includes(question.id)) return -1;
  let score = question.informationValue;
  if (question.discriminatesBetween?.includes(session.primaryKey ?? "")) score += .38;
  if (question.discriminatesBetween?.includes(session.alternativeKey ?? "")) score += .34;
  if (session.contradictions.some((item) => question.targetTraits.includes(item.trait))) score += .72;
  if (session.intent === "direction" && question.id === "direction_tradeoff") score += .48;
  if (session.intent === "concern" && question.id === "relationship_tradeoff") score += .28;
  if (session.intent === "recurring" && question.id === "result_scenario") score += .2;
  return score;
}

export function selectNextQuestion(session: V3Session): QuestionDefinition | undefined {
  return [...QUESTION_BANK].sort((a, b) => questionScore(b, session) - questionScore(a, session))[0];
}

export function decideAgent(session: V3Session): AgentDecision {
  const primary = session.hypotheses.find((item) => item.key === session.primaryKey);
  const hasContradiction = session.contradictions.length > 0;
  const unasked = selectNextQuestion(session);
  let action: AgentAction;
  let reasonCode: string;
  let message: string;
  if (!session.priorityOrder.length) {
    action = "ASK"; reasonCode = "collect_high_information_signal"; message = "先用一个取舍，让此刻的重点出现。";
  } else if (hasContradiction && unasked?.type === "verification") {
    action = "VERIFY"; reasonCode = "resolve_contradiction"; message = "这里有两个不完全一致的线索。";
  } else if (!session.askedQuestionIds.length) {
    action = "BRANCH"; reasonCode = "discriminate_primary_alternative"; message = "目前有两个方向比较突出，下一步会用一个情境把它们分开。";
  } else if (primary?.confirmation === "rejected" && unasked) {
    action = "REWEIGHT"; reasonCode = "user_correction"; message = "这个选择改变了接下来的方向。";
  } else if (primary?.confirmation === "confirmed" || primary?.confirmation === "partial") {
    action = "REVEAL_MAP"; reasonCode = "user_supported_map"; message = "当前关系已经足够出现，但仍保留没有看清的部分。";
  } else if ((primary?.independentSources.length ?? 0) >= 2 && (primary?.supportScore ?? 0) >= .46) {
    action = "REVEAL_MAP"; reasonCode = "independent_support"; message = "一条关系正在形成，现在可以先看地图。";
  } else if (session.actionCount >= 6 || !unasked) {
    action = "REVEAL_MAP"; reasonCode = "experience_budget"; message = "先停在足够清楚的位置，不继续增加问题。";
  } else {
    action = "ASK"; reasonCode = "information_gain"; message = "这里还有一点没有区分清楚。";
  }
  return { action, nextQuestionId: unasked?.id, primaryKey: session.primaryKey, alternativeKey: session.alternativeKey, reasonCode, message, engine: "structured_fallback" };
}

export function withAgentDecision(session: V3Session): V3Session {
  const decision = decideAgent(session);
  return track({ ...session, agentDecision: decision }, "agent_action_selected", { action: decision.action, reason: decision.reasonCode });
}

export function shouldOfferMirror(session: V3Session) {
  const primary = session.hypotheses.find((item) => item.key === session.primaryKey);
  const selfSignals = session.signals.filter((signal) => signal.domain === "self" && Math.abs(signal.value) > .45);
  return primary?.key === "result_self" && (primary.confirmation === "confirmed" || primary.confirmation === "partial" || selfSignals.length >= 3);
}

export function deriveMirrorState(session: V3Session): MirrorState {
  if (session.spatialInteractionState?.completed) return "REARRANGED";
  const selfSignals = session.signals.filter((signal) => signal.domain === "self" && Math.abs(signal.value) > .42);
  const independent = new Set(selfSignals.map((signal) => signal.source)).size;
  const selfContradiction = session.contradictions.some((item) => ["external_validation", "self_defined", "result_worth"].includes(item.trait));
  if (selfContradiction && independent >= 2) return "FRAGMENTED";
  if (selfSignals.length >= 3 && independent >= 2) return "LAYERED";
  if (selfSignals.length) return "BLURRED";
  return "CLEAR";
}

export function createMirrorState(session: V3Session): SpatialInteractionState {
  const candidates: MirrorItem[] = [
    { id: "own-choice", label: "自己的选择", trait: "self_defined", initialZone: "edge", zone: "edge" },
    { id: "wanted-result", label: "真正想要的结果", trait: "achievement", initialZone: "center", zone: "center" },
    { id: "others-expect", label: "别人的期待", trait: "external_validation", initialZone: "center", zone: "center" },
    { id: "fear-failure", label: "害怕失败", trait: "result_worth", initialZone: "edge", zone: "edge" },
    { id: "unknown", label: "暂时不知道", trait: "clarity", initialZone: "pending", zone: "pending" },
  ];
  const items = candidates.filter((item) => item.id === "own-choice" || item.id === "unknown" || session.signals.some((signal) => signal.trait === item.trait || (item.trait === "achievement" && signal.trait === "result_worth")));
  return { kind: "mirror_self_arrangement", mirrorState: deriveMirrorState(session), items, moves: 0, completed: false, updatedMap: false };
}

export function moveMirrorItem(session: V3Session, itemId: string, zone: MirrorZone): V3Session {
  const state = session.spatialInteractionState ?? createMirrorState(session);
  const item = state.items.find((candidate) => candidate.id === itemId);
  if (!item || item.zone === zone) return session;
  const updated = state.items.map((candidate) => candidate.id === itemId ? { ...candidate, zone } : candidate);
  const direction = zone === "center" ? 1 : zone === "outside" ? -1 : zone === "edge" ? -.35 : 0;
  const signal = makeSignals(session, "mirror-arrangement", itemId, "spatial_action", [{ domain: item.trait === "achievement" ? "direction" : item.trait === "clarity" ? "state" : "self", trait: item.trait, value: direction * .78, label: `${item.label}被放到${zone === "center" ? "更属于我" : zone === "edge" ? "外缘" : zone === "outside" ? "更远处" : "暂不处理"}` }])[0];
  const refreshed = refreshModel({ ...session, signals: [...session.signals, signal], spatialInteractionState: { ...state, items: updated, moves: state.moves + 1 }, actionCount: session.actionCount + 1 });
  return track({ ...refreshed, agentDecision: { action: "UPDATE_SPACE", primaryKey: refreshed.primaryKey, alternativeKey: refreshed.alternativeKey, reasonCode: "spatial_signal_added", message: "这个位置改变了地图里的关系。", engine: "structured_fallback" } }, "agent_action_selected", { action: "UPDATE_SPACE", reason: "spatial_signal_added" });
}

export function completeMirror(session: V3Session): V3Session {
  const state = session.spatialInteractionState ?? createMirrorState(session);
  let next = refreshModel({ ...session, spatialInteractionState: { ...state, mirrorState: "REARRANGED", completed: true, updatedMap: true } });
  next = track({ ...next, agentDecision: { action: "UPDATE_MAP", primaryKey: next.primaryKey, alternativeKey: next.alternativeKey, reasonCode: "spatial_arrangement_complete", message: "镜面里的新位置已经回到当前地图。", engine: "structured_fallback" } }, "agent_action_selected", { action: "UPDATE_MAP", reason: "spatial_arrangement_complete" });
  next = track(next, "spatial_interaction_completed", { kind: state.kind, moves: state.moves });
  return next;
}

function hypothesisByKey(session: V3Session, key?: string) { return session.hypotheses.find((item) => item.key === key); }

export function buildReflection(session: V3Session): Reflection {
  const primary = hypothesisByKey(session, session.primaryKey);
  const alternative = hypothesisByKey(session, session.alternativeKey);
  const confirmed = primary?.confirmation === "confirmed" || primary?.confirmation === "partial";
  const certain = confirmed ? primary!.statement : "比较明确的是：你已经指出了此刻更值得关注的方向，而系统没有把它扩大成长期结论。";
  const forming = primary?.statement ?? "目前只有少量线索，还不足以形成关系。";
  const unknown = session.contradictions.length ? "这些不完全一致的线索会不会只在特定关系或结果中出现。" : alternative?.statement ?? "这组状态会怎样随情境变化。";
  const spatial = session.spatialInteractionState?.completed ? "你把镜面里的内容重新安排后，自己的选择与外部期待有了不同位置。" : undefined;
  const candidates = [certain, spatial, primary ? `${HYPOTHESES.find((item) => item.key === primary.key)?.nodeLabels.join("与")}之间值得继续观察。` : undefined].filter((item): item is string => Boolean(item)).filter((item, index, all) => all.indexOf(item) === index).slice(0, 3);
  return { certain, forming, unknown, candidates, openQuestion: unknown };
}

export function buildHistoricalComparison(history: HistoryEntry[], session: V3Session): HistoricalComparison | undefined {
  const last = history[0];
  if (!last) return undefined;
  const previousTop = last.priorityOrder[0];
  const currentTop = session.priorityOrder[0];
  const difference = previousTop && currentTop && previousTop !== currentTop ? `上一次“${priorityLabels[previousTop] ?? previousTop}”更靠前，这一次“${priorityLabels[currentTop] ?? currentTop}”提前了。` : undefined;
  const recurrence = last.primaryKey && last.primaryKey === session.primaryKey ? `“${HYPOTHESES.find((item) => item.key === session.primaryKey)?.nodeLabels.join(" × ") ?? "当前主题"}”再次出现。` : undefined;
  const confirmedRepeat = history.filter((entry) => entry.primaryKey === session.primaryKey && ["confirmed", "partial", "alternative"].includes(entry.confirmation)).length;
  const possiblePattern = history.length >= 2 && confirmedRepeat >= 1 && recurrence ? "这个主题过去出现过不止一次，你觉得这些时刻可能有关吗？" : undefined;
  return { difference, recurrence, possiblePattern, reasonOptions: ["最近环境变化了", "自己的想法变了", "上次可能并不准确", "目前不知道"] };
}

export function createHistoryEntry(session: V3Session): HistoryEntry {
  const reflection = session.reflection ?? buildReflection(session);
  const primary = hypothesisByKey(session, session.primaryKey);
  return { id: uid("map", session.createdAt), sessionId: session.sessionId, createdAt: Date.now(), intent: session.intent ?? "current", primaryKey: session.primaryKey, priorityOrder: session.priorityOrder, confirmedInsight: reflection.certain, openQuestion: session.openQuestion ?? reflection.openQuestion, keptInsight: session.keptInsight ?? reflection.candidates[0], map: session.currentInnerMap, spatialState: session.spatialInteractionState, confirmation: primary?.confirmation ?? "unknown", comparison: session.historicalComparison };
}

export function restoreSession(raw: string | null): V3Session | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<V3Session>;
    if (value.schemaVersion !== V3_SCHEMA_VERSION || typeof value.sessionId !== "string" || !Array.isArray(value.signals) || !value.currentInnerMap) return null;
    return value as V3Session;
  } catch { return null; }
}

export function restoreHistory(raw: string | null): HistoryEntry[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((entry) => entry && typeof entry.id === "string" && typeof entry.keptInsight === "string").slice(0, 30) : [];
  } catch { return []; }
}

export function migrateV2History(raw: string | null): HistoryEntry[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (!Array.isArray(value)) return [];
    return value.flatMap((entry, index) => {
      const takeaway = typeof entry.takeaway === "string" ? entry.takeaway : "早期探索留下了一条记录。";
      const confirmed = Array.isArray(entry.confirmedInsights) && typeof entry.confirmedInsights[0] === "string" ? entry.confirmedInsights[0] : takeaway;
      const open = Array.isArray(entry.openQuestions) && typeof entry.openQuestions[0] === "string" ? entry.openQuestions[0] : "这条早期记录还没有留下开放问题。";
      const createdAt = typeof entry.createdAt === "number" ? entry.createdAt : Date.now() - index;
      return [{ id: typeof entry.id === "string" ? `v2-${entry.id}` : uid("v2", createdAt), sessionId: `legacy-${index}`, createdAt, intent: "current" as const, priorityOrder: [], confirmedInsight: confirmed, openQuestion: open, keptInsight: takeaway, map: { nodes: [{ id: "legacy", label: "早期记录", domain: "state" as const, state: "uncertain" as const, evidence: ["由 V2 Inner Map 安全迁移"] }], relations: [], updatedAt: createdAt, version: 1 }, confirmation: "unknown" as const, migratedFromV2: true }];
    });
  } catch { return []; }
}

export function stopCondition(session: V3Session) {
  const primary = hypothesisByKey(session, session.primaryKey);
  return Boolean((primary?.confirmation === "confirmed" || primary?.confirmation === "partial") && primary.independentSources.length >= 2) || session.actionCount >= 8 || !selectNextQuestion(session);
}
