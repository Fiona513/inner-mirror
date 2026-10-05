export const PHASE1_SCHEMA_VERSION = 3 as const;

export type ExplorationIntent =
  | "current_state"
  | "specific_concern"
  | "repeated_pattern"
  | "find_direction";

export type Domain = "state" | "needs" | "self" | "relationship" | "direction";
export type SignalSource =
  | "choice"
  | "multi_choice"
  | "ranking"
  | "scenario"
  | "tradeoff"
  | "verification"
  | "confirmation";
export type ConfirmationState = "unknown" | "confirmed" | "partial" | "rejected";
export type AgentAction = "ASK" | "VERIFY" | "BRANCH" | "REWEIGHT" | "REVEAL_MAP" | "UPDATE_MAP" | "REFLECT" | "STOP";
export type SessionStep =
  | "entry"
  | "scan_state"
  | "scan_attention"
  | "scan_needs"
  | "prioritize"
  | "branch"
  | "adaptive"
  | "map_review"
  | "complete";

export interface Signal {
  id: string;
  domain: Domain;
  trait: string;
  value: number;
  source: SignalSource;
  reliability: number;
  questionId?: string;
  sessionId: string;
  createdAt: number;
  label: string;
}

export interface SignalEffect {
  domain: Domain;
  trait: string;
  value: number;
  reliability?: number;
  label: string;
}

export interface ChoiceOption {
  id: string;
  label: string;
  detail?: string;
  effects: SignalEffect[];
}

export interface QuestionDefinition {
  id: string;
  type: "single" | "multi" | "ranking" | "scenario" | "tradeoff" | "verification";
  domains: Domain[];
  targetTraits: string[];
  discriminatesBetween?: string[];
  prompt: string;
  support: string;
  options: ChoiceOption[];
  signalEffects: Record<string, SignalEffect[]>;
  informationValue: number;
  intentAffinity?: ExplorationIntent[];
}

export interface Hypothesis {
  id: string;
  key: string;
  statement: string;
  relatedDomains: Domain[];
  supportingSignalIds: string[];
  contradictingSignalIds: string[];
  independentSources: SignalSource[];
  supportScore: number;
  confirmation: ConfirmationState;
  evidence: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Contradiction {
  id: string;
  trait: string;
  label: string;
  supportingSignalIds: string[];
  contradictingSignalIds: string[];
}

export interface InnerMapNode {
  id: string;
  label: string;
  domain: Domain;
  status: "clear" | "emerging" | "uncertain" | "contradictory";
  sourceHypothesisIds: string[];
  evidence: string[];
}

export interface InnerMapEdge {
  id: string;
  source: string;
  target: string;
  relation: "related" | "possibly_related" | "conflicting";
  supportLevel: number;
  sourceHypothesisIds: string[];
  evidence: string[];
}

export interface CurrentInnerMap {
  nodes: InnerMapNode[];
  edges: InnerMapEdge[];
  updatedAt: number;
  version: number;
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

export type AnalyticsEventName =
  | "session_started"
  | "entry_selected"
  | "signal_added"
  | "ranking_completed"
  | "agent_action_selected"
  | "branch_changed"
  | "contradiction_detected"
  | "hypothesis_shown"
  | "hypothesis_confirmed"
  | "hypothesis_partially_confirmed"
  | "hypothesis_rejected"
  | "inner_map_first_node_shown"
  | "inner_map_updated"
  | "inner_map_revealed"
  | "phase1_completed";

export interface AnalyticsEvent {
  name: AnalyticsEventName;
  createdAt: number;
  payload?: Record<string, string | number | boolean>;
}

export interface Phase1Session {
  schemaVersion: typeof PHASE1_SCHEMA_VERSION;
  sessionId: string;
  createdAt: number;
  currentStep: SessionStep;
  intent?: ExplorationIntent;
  signals: Signal[];
  answers: Record<string, string[]>;
  priorityOrder: string[];
  askedQuestionIds: string[];
  hypotheses: Hypothesis[];
  primaryKey?: string;
  alternativeKey?: string;
  contradictions: Contradiction[];
  handledContradictionIds: string[];
  userCorrections: Record<string, ConfirmationState>;
  lastCorrection?: { key: string; response: ConfirmationState; actionCount: number };
  agentDecision?: AgentDecision;
  currentInnerMap: CurrentInnerMap;
  actionCount: number;
  fatigueBudget: number;
  analytics: AnalyticsEvent[];
}

export const intentOptions: Array<{ id: ExplorationIntent; label: string; detail: string; effects: SignalEffect[] }> = [
  { id: "current_state", label: "看看最近的自己", detail: "从此刻最明显的状态开始", effects: [{ domain: "state", trait: "current_focus", value: .52, label: "你选择先看最近的状态" }] },
  { id: "specific_concern", label: "理清一件正在困扰我的事", detail: "先看它把注意力带向哪里", effects: [{ domain: "state", trait: "concern_focus", value: .52, label: "你选择先理清一件悬着的事" }] },
  { id: "repeated_pattern", label: "理解一个反复出现的自己", detail: "比较不同情境里的第一反应", effects: [{ domain: "self", trait: "self_observation", value: .5, label: "你选择观察再次出现的反应" }] },
  { id: "find_direction", label: "想清楚我真正想要什么", detail: "从真实取舍里看当前方向", effects: [{ domain: "direction", trait: "direction", value: .62, label: "你选择先看当前方向" }] },
];

export const stateOptions: ChoiceOption[] = [
  { id: "tired", label: "有点累", effects: [{ domain: "state", trait: "low_energy", value: .9, label: "最近的能量有些低" }, { domain: "needs", trait: "rest", value: .55, label: "恢复的需要开始出现" }] },
  { id: "tense", label: "有点紧绷", effects: [{ domain: "state", trait: "tension", value: .88, label: "最近有些紧绷" }, { domain: "needs", trait: "certainty", value: .46, label: "确定感可能重要" }] },
  { id: "motivated", label: "很有动力", effects: [{ domain: "state", trait: "energy", value: .82, label: "此刻有可用的行动能量" }, { domain: "direction", trait: "growth", value: .42, label: "行动与成长正在靠前" }] },
  { id: "lost", label: "有点迷茫", effects: [{ domain: "state", trait: "clarity", value: -.78, label: "一些方向还没有分清" }, { domain: "direction", trait: "direction", value: .5, label: "找到方向的需要出现" }] },
  { id: "calm", label: "很平静", effects: [{ domain: "state", trait: "clarity", value: .78, label: "此刻状态相对平稳" }, { domain: "self", trait: "self_stability", value: .62, label: "自我评价暂时没有明显摇晃" }] },
  { id: "avoid", label: "想躲开一些事情", effects: [{ domain: "state", trait: "avoidance", value: .78, label: "有些事情暂时不想靠近" }, { domain: "needs", trait: "safety", value: .5, label: "先获得安全距离可能重要" }] },
  { id: "prove", label: "很想证明自己", effects: [{ domain: "self", trait: "result_worth", value: .72, label: "证明自己的冲动比较突出" }, { domain: "needs", trait: "recognition", value: .5, label: "被认可开始进入视野" }] },
  { id: "closer", label: "想和某个人靠近", effects: [{ domain: "relationship", trait: "connection", value: .76, label: "想靠近某个人" }, { domain: "needs", trait: "understanding", value: .42, label: "被理解可能重要" }] },
  { id: "alone", label: "想一个人待会儿", effects: [{ domain: "state", trait: "low_energy", value: .46, label: "注意力想先收回来" }, { domain: "needs", trait: "rest", value: .58, label: "独处和恢复开始靠前" }] },
  { id: "none", label: "都不太像", effects: [] },
];

export const attentionOptions: ChoiceOption[] = [
  { id: "work", label: "工作 / 学习", effects: [{ domain: "direction", trait: "achievement", value: .66, label: "工作或学习占据较多注意力" }] },
  { id: "relationship", label: "一段关系", effects: [{ domain: "relationship", trait: "relationship_attention", value: .88, label: "一段关系反复占据注意力" }] },
  { id: "performance", label: "自己的表现", effects: [{ domain: "self", trait: "result_worth", value: .78, label: "自己的表现反复进入注意力" }] },
  { id: "future", label: "未来", effects: [{ domain: "direction", trait: "direction", value: .74, label: "未来方向占据较多注意力" }] },
  { id: "evaluation", label: "别人怎么看我", effects: [{ domain: "self", trait: "external_validation", value: .8, label: "他人的看法占据注意力" }, { domain: "needs", trait: "recognition", value: .54, label: "被认可再次出现" }] },
  { id: "recovery", label: "休息与恢复", effects: [{ domain: "needs", trait: "rest", value: .86, label: "休息与恢复占据注意力" }] },
  { id: "choice", label: "一个重要选择", effects: [{ domain: "direction", trait: "direction", value: .72, label: "一个重要选择仍悬在心里" }, { domain: "needs", trait: "certainty", value: .4, label: "选择也带来对确定感的需要" }] },
  { id: "own_judgment", label: "自己的判断", effects: [{ domain: "self", trait: "external_validation", value: -.76, label: "你更想把判断留在自己这里" }, { domain: "self", trait: "self_defined", value: .72, label: "自己的判断更靠前" }] },
  { id: "unclear", label: "我也说不清", effects: [{ domain: "state", trait: "clarity", value: -.48, label: "注意力还没有清楚的名字" }] },
];

export const needOptions: ChoiceOption[] = [
  { id: "certainty", label: "更确定", effects: [{ domain: "needs", trait: "certainty", value: .82, label: "更确定被选为当前需要" }] },
  { id: "understanding", label: "被理解", effects: [{ domain: "needs", trait: "understanding", value: .84, label: "被理解被选为当前需要" }, { domain: "relationship", trait: "connection", value: .4, label: "连接的需要开始出现" }] },
  { id: "recognition", label: "被认可", effects: [{ domain: "needs", trait: "recognition", value: .84, label: "被认可被选为当前需要" }, { domain: "self", trait: "external_validation", value: .46, label: "认可与自我评价可能有关" }] },
  { id: "freedom", label: "更自由", effects: [{ domain: "direction", trait: "freedom", value: .84, label: "更自由被选为当前需要" }] },
  { id: "result", label: "有结果", effects: [{ domain: "direction", trait: "achievement", value: .84, label: "有结果被选为当前需要" }, { domain: "self", trait: "result_worth", value: .42, label: "结果与自我评价可能有关" }] },
  { id: "rest", label: "休息", effects: [{ domain: "needs", trait: "rest", value: .9, label: "休息被选为当前需要" }] },
  { id: "control", label: "掌控感", effects: [{ domain: "needs", trait: "certainty", value: .62, label: "掌控感被选为当前需要" }, { domain: "self", trait: "agency", value: .55, label: "想把行动重新拿回手里" }] },
  { id: "direction", label: "找到方向", effects: [{ domain: "direction", trait: "direction", value: .9, label: "找到方向被选为当前需要" }] },
];

export const needLabels = Object.fromEntries(needOptions.map((option) => [option.id, option.label])) as Record<string, string>;

const rankedNeedEffects: Record<string, SignalEffect[]> = {
  certainty: [{ domain: "needs", trait: "certainty", value: .94, label: "更确定被排在较前位置" }],
  understanding: [{ domain: "needs", trait: "understanding", value: .94, label: "被理解被排在较前位置" }, { domain: "relationship", trait: "connection", value: .52, label: "关系中的理解被优先考虑" }],
  recognition: [{ domain: "needs", trait: "recognition", value: .94, label: "被认可被排在较前位置" }, { domain: "self", trait: "external_validation", value: .7, label: "外部评价在排序里变得突出" }],
  freedom: [{ domain: "direction", trait: "freedom", value: .94, label: "更自由被排在较前位置" }],
  result: [{ domain: "direction", trait: "achievement", value: .94, label: "有结果被排在较前位置" }, { domain: "self", trait: "result_worth", value: .6, label: "结果与自我评价可能靠得很近" }],
  rest: [{ domain: "needs", trait: "rest", value: .96, label: "休息被排在较前位置" }],
  control: [{ domain: "needs", trait: "certainty", value: .72, label: "掌控感被排在较前位置" }, { domain: "self", trait: "agency", value: .64, label: "行动感需要回来" }],
  direction: [{ domain: "direction", trait: "direction", value: .96, label: "找到方向被排在较前位置" }],
};

function question(
  definition: Omit<QuestionDefinition, "signalEffects"> & { options: ChoiceOption[] },
): QuestionDefinition {
  return { ...definition, signalEffects: Object.fromEntries(definition.options.map((option) => [option.id, option.effects])) };
}

export const QUESTION_BANK: QuestionDefinition[] = [
  question({
    id: "result_scenario", type: "scenario", domains: ["self", "needs", "direction"], targetTraits: ["result_worth", "external_validation", "certainty"], discriminatesBetween: ["result_self", "certainty_need"], informationValue: .99, intentAffinity: ["repeated_pattern", "specific_concern"],
    prompt: "一个很重要的机会没有得到想要的结果，你最先出现的反应更接近什么？", support: "选最先出现的，不必选最理性的。",
    options: [
      { id: "adjust", label: "想哪里还可以调整", detail: "先把注意力放回行动", effects: [{ domain: "self", trait: "self_stability", value: .76, label: "结果没有直接变成自我否定" }, { domain: "self", trait: "agency", value: .62, label: "注意力能够回到行动" }] },
      { id: "self_doubt", label: "怀疑自己是不是不够好", detail: "结果很快变成对自己的评价", effects: [{ domain: "self", trait: "result_worth", value: .96, label: "失败情境首先连接到自我评价" }] },
      { id: "others", label: "想别人会怎么看", detail: "评价比下一步更先出现", effects: [{ domain: "self", trait: "external_validation", value: .96, label: "失败情境首先连接到他人评价" }, { domain: "needs", trait: "recognition", value: .66, label: "被认可从另一种来源再次出现" }] },
      { id: "avoid", label: "暂时不想面对", detail: "先离开这个结果一会儿", effects: [{ domain: "state", trait: "avoidance", value: .84, label: "重要失败后会先拉开距离" }, { domain: "needs", trait: "safety", value: .52, label: "安全距离可能更重要" }] },
      { id: "none", label: "都不太像", effects: [] },
    ],
  }),
  question({
    id: "relationship_scenario", type: "scenario", domains: ["relationship", "needs"], targetTraits: ["expression_hold", "boundary", "understanding"], discriminatesBetween: ["relationship_safety", "certainty_need"], informationValue: .98, intentAffinity: ["specific_concern", "repeated_pattern"],
    prompt: "一段重要关系里出现分歧时，你最先会保护什么？", support: "只看第一反应，不判断对错。",
    options: [
      { id: "harmony", label: "先让关系保持平稳", detail: "真实需要可以晚一点再说", effects: [{ domain: "relationship", trait: "expression_hold", value: .96, label: "分歧中会先保护关系平稳" }, { domain: "needs", trait: "safety", value: .58, label: "安全感会影响表达" }] },
      { id: "truth", label: "把真实需要说清楚", detail: "让关系承受一点真实", effects: [{ domain: "relationship", trait: "expression_hold", value: -.8, label: "分歧中仍会说出真实需要" }, { domain: "relationship", trait: "boundary", value: .76, label: "边界可以被表达" }] },
      { id: "understood", label: "先确认对方能理解我", detail: "被理解之后才更容易继续", effects: [{ domain: "needs", trait: "understanding", value: .9, label: "分歧中被理解最先出现" }, { domain: "relationship", trait: "connection", value: .62, label: "连接感影响后续表达" }] },
      { id: "distance", label: "先拉开一点距离", detail: "给自己留下判断空间", effects: [{ domain: "relationship", trait: "distance", value: .78, label: "分歧中会先拉开一点距离" }, { domain: "self", trait: "self_defined", value: .5, label: "自己的判断需要空间" }] },
      { id: "none", label: "都不太像", effects: [] },
    ],
  }),
  question({
    id: "rest_tradeoff", type: "tradeoff", domains: ["state", "needs", "self"], targetTraits: ["rest", "achievement", "self_demand"], discriminatesBetween: ["rest_recovery", "result_self"], informationValue: .96, intentAffinity: ["current_state"],
    prompt: "今天只剩一小段力气，你更愿意把它留在哪里？", support: "选择今天，不是理想中的自己。",
    options: [
      { id: "rest", label: "真正停下来恢复", detail: "不再用完成换取休息", effects: [{ domain: "needs", trait: "rest", value: .96, label: "有限精力更想留给恢复" }] },
      { id: "finish", label: "再完成一件事", detail: "完成后才比较允许自己停下", effects: [{ domain: "self", trait: "self_demand", value: .9, label: "休息仍需要由完成来允许" }, { domain: "direction", trait: "achievement", value: .66, label: "结果继续占用有限精力" }] },
      { id: "person", label: "留给一个想见的人", detail: "连接比进度更重要", effects: [{ domain: "needs", trait: "understanding", value: .78, label: "有限精力更想留给连接" }] },
      { id: "none", label: "都不太像", effects: [] },
    ],
  }),
  question({
    id: "direction_tradeoff", type: "tradeoff", domains: ["direction", "self", "needs"], targetTraits: ["freedom", "certainty", "growth", "direction"], discriminatesBetween: ["direction_values", "certainty_need"], informationValue: .99, intentAffinity: ["find_direction"],
    prompt: "如果暂时不能两者兼得，你更愿意先靠近哪一个？", support: "不是长期承诺，只看此刻的优先级。",
    options: [
      { id: "stable", label: "更确定、更安全的结果", detail: "减少悬而未决", effects: [{ domain: "needs", trait: "certainty", value: .9, label: "取舍时稳定更靠前" }] },
      { id: "alive", label: "更喜欢、但风险更高的方向", detail: "让选择更像自己的", effects: [{ domain: "direction", trait: "freedom", value: .9, label: "取舍时自由更靠前" }, { domain: "self", trait: "self_defined", value: .7, label: "更想靠近自己的选择" }] },
      { id: "growth", label: "能持续成长的选择", detail: "先保留变化的可能", effects: [{ domain: "direction", trait: "growth", value: .88, label: "成长在取舍中更靠前" }, { domain: "direction", trait: "direction", value: .62, label: "方向由成长感变得清楚" }] },
      { id: "none", label: "都不太像", effects: [] },
    ],
  }),
  question({
    id: "evaluation_tradeoff", type: "tradeoff", domains: ["self", "needs"], targetTraits: ["external_validation", "recognition", "self_defined"], discriminatesBetween: ["result_self", "direction_values"], informationValue: .93, intentAffinity: ["repeated_pattern"],
    prompt: "一件事做得不错，但重要的人没有认可；哪一边更影响你？", support: "这道取舍用来区分自己的判断与外部认可。",
    options: [
      { id: "own", label: "我仍然认可自己的判断", detail: "外部反馈不会改变这次评价", effects: [{ domain: "self", trait: "external_validation", value: -.9, label: "取舍中自己的判断更有分量" }, { domain: "self", trait: "self_defined", value: .84, label: "自我评价可以留在自己这里" }] },
      { id: "seen", label: "没有被看见会明显减弱满足感", detail: "认可会改变结果的感受", effects: [{ domain: "self", trait: "external_validation", value: .9, label: "取舍中重要他人的认可会改变感受" }, { domain: "needs", trait: "recognition", value: .72, label: "被认可从取舍中再次出现" }] },
      { id: "context", label: "只在少数重要关系里会这样", detail: "影响来自具体的人，不是所有评价", effects: [{ domain: "relationship", trait: "context_sensitivity", value: .82, label: "评价的影响取决于具体关系" }] },
      { id: "none", label: "都不太像", effects: [] },
    ],
  }),
  question({
    id: "certainty_scenario", type: "scenario", domains: ["needs", "state", "direction"], targetTraits: ["certainty", "agency", "clarity"], discriminatesBetween: ["certainty_need", "direction_values", "rest_recovery"], informationValue: .88, intentAffinity: ["specific_concern"],
    prompt: "一件重要的事迟迟没有确定时，什么最消耗你？", support: "选择最占据注意力的部分。",
    options: [
      { id: "unknown", label: "不知道最终会发生什么", effects: [{ domain: "needs", trait: "certainty", value: .92, label: "未知本身最消耗" }] },
      { id: "control", label: "不知道自己还能做什么", effects: [{ domain: "self", trait: "agency", value: -.76, label: "行动空间不清楚最消耗" }, { domain: "needs", trait: "certainty", value: .5, label: "确定下一步比确定结果更重要" }] },
      { id: "evaluation", label: "担心结果会怎样定义我的表现", effects: [{ domain: "self", trait: "result_worth", value: .86, label: "未知结果连接到自我表现" }] },
      { id: "none", label: "都不太像", effects: [] },
    ],
  }),
  question({
    id: "recognition_verify", type: "verification", domains: ["self", "needs", "relationship"], targetTraits: ["external_validation", "recognition", "self_defined"], discriminatesBetween: ["result_self", "direction_values"], informationValue: 1,
    prompt: "普通评价好像不会太影响你，但重要的人或重要结果又不太一样。哪个更接近？", support: "这里有两个不完全一致的线索，这次回答会重新安排地图。",
    options: [
      { id: "important_person", label: "只有重要的人会影响我", effects: [{ domain: "relationship", trait: "context_sensitivity", value: .92, label: "验证后，影响被限定在重要关系里" }, { domain: "self", trait: "external_validation", value: .34, label: "重要关系中的评价仍有影响" }] },
      { id: "important_result", label: "只有重要结果会影响我", effects: [{ domain: "self", trait: "result_worth", value: .88, label: "验证后，影响更接近重要结果" }, { domain: "self", trait: "external_validation", value: -.34, label: "普通评价并不是核心" }] },
      { id: "more_recognition", label: "我可能比想象中更在意认可", effects: [{ domain: "self", trait: "external_validation", value: .9, label: "验证后确认认可的影响更明显" }, { domain: "needs", trait: "recognition", value: .7, label: "认可得到新的独立支持" }] },
      { id: "wrong_word", label: "“认可”不是准确的说法", effects: [{ domain: "self", trait: "external_validation", value: -.92, label: "验证后，认可这条解释变弱" }, { domain: "self", trait: "self_defined", value: .72, label: "自己的判断重新变得突出" }] },
      { id: "unknown", label: "目前还不知道", effects: [{ domain: "state", trait: "clarity", value: -.3, label: "这组矛盾暂时保留" }] },
    ],
  }),
];

type HypothesisDefinition = {
  key: string;
  statement: string;
  domains: Domain[];
  traits: Record<string, number>;
  nodeLabels: [string, string];
  intentBias?: Partial<Record<ExplorationIntent, number>>;
};

const HYPOTHESIS_DEFINITIONS: HypothesisDefinition[] = [
  { key: "result_self", statement: "目前更像是：你在意的不只是结果，它有时也会影响你怎么看自己的表现。", domains: ["direction", "self"], traits: { result_worth: 1, external_validation: .76, recognition: .66, achievement: .48, self_demand: .5, self_stability: -.48 }, nodeLabels: ["重要结果", "自我评价"], intentBias: { repeated_pattern: .14, specific_concern: .05 } },
  { key: "relationship_safety", statement: "目前更像是：连接和被理解很重要，但表达之前，你可能会先确认关系是否足够安全。", domains: ["relationship", "needs"], traits: { relationship_attention: .82, connection: .86, understanding: .92, expression_hold: 1, safety: .66, boundary: -.58, distance: .28 }, nodeLabels: ["关系连接", "安全表达"], intentBias: { specific_concern: .14, repeated_pattern: .06 } },
  { key: "rest_recovery", statement: "目前更像是：此刻先恢复一点，比继续要求自己做得更多更重要。", domains: ["state", "needs"], traits: { low_energy: 1, rest: 1, tension: .24, self_demand: .38, energy: -.4 }, nodeLabels: ["当前能量", "恢复需要"], intentBias: { current_state: .12 } },
  { key: "direction_values", statement: "目前没有明显失衡；更值得看清的是，自由、成长与稳定怎样排进这次选择。", domains: ["direction", "self"], traits: { direction: 1, freedom: .92, growth: .86, self_defined: .72, self_stability: .4, clarity: .24 }, nodeLabels: ["未来方向", "价值取舍"], intentBias: { find_direction: .18 } },
  { key: "certainty_need", statement: "目前更像是：悬而未决正在消耗注意力，你需要的也许是一个可把握的下一步。", domains: ["state", "needs"], traits: { certainty: 1, tension: .62, clarity: -.42, agency: -.34, safety: .38 }, nodeLabels: ["悬而未决", "确定感"], intentBias: { specific_concern: .12, current_state: .04 } },
];

const sourceReliability: Record<SignalSource, number> = {
  choice: .62,
  multi_choice: .68,
  ranking: .86,
  scenario: .82,
  tradeoff: .84,
  verification: .92,
  confirmation: .96,
};

const domainLabels: Record<Domain, string> = { state: "当前状态", needs: "当前需要", self: "自我评价", relationship: "关系", direction: "方向" };
const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const uid = (prefix: string, now = Date.now()) => `${prefix}-${now}-${Math.random().toString(36).slice(2, 8)}`;

export function track(session: Phase1Session, name: AnalyticsEventName, payload?: AnalyticsEvent["payload"]): Phase1Session {
  return { ...session, analytics: [...session.analytics, { name, createdAt: Date.now(), payload }] };
}

function makeSignals(session: Phase1Session, questionId: string, optionId: string, source: SignalSource, effects: SignalEffect[], multiplier = 1): Signal[] {
  const now = Date.now();
  return effects.map((effect, index) => ({
    id: uid(`${questionId}-${optionId}-${index}`, now),
    domain: effect.domain,
    trait: effect.trait,
    value: effect.value * multiplier,
    source,
    reliability: effect.reliability ?? sourceReliability[source],
    questionId,
    sessionId: session.sessionId,
    createdAt: now + index,
    label: effect.label,
  }));
}

function uniqueEvidence(contributions: Array<{ signal: Signal; contribution: number }>, positive: boolean) {
  const bySource = new Map<SignalSource, { signal: Signal; contribution: number }>();
  for (const item of contributions) {
    if ((positive && item.contribution <= 0) || (!positive && item.contribution >= 0)) continue;
    const existing = bySource.get(item.signal.source);
    if (!existing || Math.abs(item.contribution) > Math.abs(existing.contribution)) bySource.set(item.signal.source, item);
  }
  return [...bySource.values()];
}

function detectContradictions(signals: Signal[]): Contradiction[] {
  const traits = [...new Set(signals.map((signal) => signal.trait))];
  return traits.flatMap((trait) => {
    const relevant = signals.filter((signal) => signal.trait === trait && Math.abs(signal.value) >= .3);
    const positive = relevant.filter((signal) => signal.value > 0);
    const negative = relevant.filter((signal) => signal.value < 0);
    const positiveStrength = positive.reduce((sum, signal) => sum + signal.value * signal.reliability, 0);
    const negativeStrength = Math.abs(negative.reduce((sum, signal) => sum + signal.value * signal.reliability, 0));
    const sources = new Set([...positive, ...negative].map((signal) => signal.source));
    if (positiveStrength < .42 || negativeStrength < .42 || sources.size < 2) return [];
    const label = trait === "external_validation" ? "自己的判断与外部认可出现了两个不完全一致的线索" : `${trait} 出现了两个不完全一致的线索`;
    return [{ id: `contradiction-${trait}`, trait, label, supportingSignalIds: positive.map((signal) => signal.id), contradictingSignalIds: negative.map((signal) => signal.id) }];
  });
}

function scoreHypotheses(session: Pick<Phase1Session, "signals" | "intent" | "userCorrections" | "createdAt">): Hypothesis[] {
  const now = Date.now();
  return HYPOTHESIS_DEFINITIONS.map((definition) => {
    const contributions = session.signals
      .map((signal) => ({ signal, contribution: (definition.traits[signal.trait] ?? 0) * signal.value * signal.reliability }))
      .filter((item) => Math.abs(item.contribution) >= .06);
    const supporting = uniqueEvidence(contributions, true);
    const contradicting = uniqueEvidence(contributions, false);
    const rawSupport = supporting.reduce((sum, item) => sum + item.contribution, 0);
    const rawContradiction = Math.abs(contradicting.reduce((sum, item) => sum + item.contribution, 0));
    const confirmation = session.userCorrections[definition.key] ?? "unknown";
    const confirmationDelta = confirmation === "confirmed" ? .22 : confirmation === "partial" ? .09 : confirmation === "rejected" ? -.68 : 0;
    const intentBias = session.intent ? definition.intentBias?.[session.intent] ?? 0 : 0;
    const supportScore = confirmation === "rejected"
      ? Math.min(.08, clamp(.03 + rawSupport * .08 - rawContradiction * .1))
      : clamp(.04 + rawSupport * .27 + Math.min(.18, supporting.length * .055) - rawContradiction * .2 + confirmationDelta + intentBias);
    const evidence = supporting
      .sort((a, b) => b.contribution - a.contribution)
      .map((item) => item.signal.label)
      .filter((label, index, all) => all.indexOf(label) === index)
      .slice(0, 3);
    return {
      id: `hypothesis-${definition.key}`,
      key: definition.key,
      statement: definition.statement,
      relatedDomains: definition.domains,
      supportingSignalIds: supporting.map((item) => item.signal.id),
      contradictingSignalIds: contradicting.map((item) => item.signal.id),
      independentSources: supporting.map((item) => item.signal.source),
      supportScore,
      confirmation,
      evidence,
      createdAt: session.createdAt,
      updatedAt: now,
    };
  }).sort((a, b) => b.supportScore - a.supportScore);
}

function firstSelectedLabel(options: ChoiceOption[], selected: string[] | undefined, fallback: string) {
  return options.find((option) => selected?.includes(option.id))?.label ?? fallback;
}

function activeContradictions(session: Pick<Phase1Session, "contradictions" | "handledContradictionIds">) {
  return session.contradictions.filter((item) => !session.handledContradictionIds.includes(item.id));
}

export function buildCurrentInnerMap(session: Pick<Phase1Session, "answers" | "priorityOrder" | "hypotheses" | "primaryKey" | "alternativeKey" | "contradictions" | "handledContradictionIds" | "currentInnerMap">): CurrentInnerMap {
  const version = session.currentInnerMap.version + 1;
  const nodes: InnerMapNode[] = [];
  const edges: InnerMapEdge[] = [];
  const stateAnswers = session.answers.scan_state;
  const attentionAnswers = session.answers.scan_attention;
  const needAnswers = session.answers.scan_needs;
  const unresolved = activeContradictions(session);

  if (stateAnswers?.length) {
    const label = firstSelectedLabel(stateOptions, stateAnswers, "此刻状态");
    const option = stateOptions.find((item) => stateAnswers.includes(item.id) && item.effects.length);
    nodes.push({ id: "current-state", label, domain: "state", status: option ? "emerging" : "uncertain", sourceHypothesisIds: [], evidence: option?.effects.map((effect) => effect.label).slice(0, 2) ?? ["你暂时没有选择一个明确状态"] });
  }
  if (attentionAnswers?.length) {
    const label = firstSelectedLabel(attentionOptions, attentionAnswers, "注意力");
    const option = attentionOptions.find((item) => attentionAnswers.includes(item.id));
    nodes.push({ id: "current-attention", label, domain: option?.effects[0]?.domain ?? "state", status: option?.effects.length ? "emerging" : "uncertain", sourceHypothesisIds: [], evidence: option?.effects.map((effect) => effect.label).slice(0, 2) ?? ["注意力还没有清楚的名字"] });
    if (nodes.some((node) => node.id === "current-state")) edges.push({ id: "state-attention", source: "current-state", target: "current-attention", relation: "possibly_related", supportLevel: .24, sourceHypothesisIds: [], evidence: ["这两项都来自本次初始扫描，目前只标记为可能有关"] });
  }
  if (needAnswers?.length && !session.priorityOrder.length) {
    const label = firstSelectedLabel(needOptions, needAnswers, "当前需要");
    const option = needOptions.find((item) => needAnswers.includes(item.id));
    nodes.push({ id: "need-candidate", label, domain: "needs", status: "uncertain", sourceHypothesisIds: [], evidence: option?.effects.map((effect) => effect.label).slice(0, 2) ?? ["这还是候选需要，等待排序"] });
  }

  if (session.priorityOrder.length && session.primaryKey) {
    nodes.length = 0;
    edges.length = 0;
    const primary = session.hypotheses.find((item) => item.key === session.primaryKey);
    const alternative = session.hypotheses.find((item) => item.key === session.alternativeKey);
    const definition = HYPOTHESIS_DEFINITIONS.find((item) => item.key === primary?.key);
    const alternativeDefinition = HYPOTHESIS_DEFINITIONS.find((item) => item.key === alternative?.key);
    if (primary && definition) {
      const contradictory = unresolved.some((item) => primary.supportingSignalIds.some((id) => item.supportingSignalIds.includes(id)) || primary.contradictingSignalIds.some((id) => item.contradictingSignalIds.includes(id)));
      const status: InnerMapNode["status"] = contradictory ? "contradictory" : primary.confirmation === "confirmed" ? "clear" : primary.supportScore >= .48 && primary.independentSources.length >= 2 ? "emerging" : "uncertain";
      nodes.push(
        { id: `${primary.key}-source`, label: definition.nodeLabels[0], domain: definition.domains[0], status, sourceHypothesisIds: [primary.id], evidence: primary.evidence },
        { id: `${primary.key}-target`, label: definition.nodeLabels[1], domain: definition.domains[1], status, sourceHypothesisIds: [primary.id], evidence: primary.evidence },
      );
      edges.push({ id: `edge-${primary.key}`, source: `${primary.key}-source`, target: `${primary.key}-target`, relation: contradictory ? "conflicting" : primary.confirmation === "confirmed" ? "related" : "possibly_related", supportLevel: primary.supportScore, sourceHypothesisIds: [primary.id], evidence: primary.evidence });
    }
    if (alternative && alternativeDefinition) {
      nodes.push({ id: `${alternative.key}-open`, label: alternativeDefinition.nodeLabels[1], domain: alternativeDefinition.domains[1], status: "uncertain", sourceHypothesisIds: [alternative.id], evidence: alternative.evidence.length ? alternative.evidence : ["目前只有少量线索，因此保留为尚不确定"] });
    }
    const firstState = firstSelectedLabel(stateOptions, stateAnswers, "此刻状态");
    if (nodes.length < 4 && stateAnswers?.length && !nodes.some((node) => node.label === firstState)) {
      nodes.push({ id: "current-state", label: firstState, domain: "state", status: "emerging", sourceHypothesisIds: [], evidence: ["来自你对当前状态的选择"] });
    }
  }

  return { nodes: nodes.slice(0, 4), edges: edges.slice(0, 3), updatedAt: Date.now(), version };
}

export function refreshModel(session: Phase1Session): Phase1Session {
  const contradictions = detectContradictions(session.signals);
  const hypotheses = scoreHypotheses(session);
  const eligible = hypotheses.filter((item) => item.confirmation !== "rejected");
  const primary = eligible[0] ?? hypotheses[0];
  const alternative = eligible.find((item) => item.key !== primary?.key) ?? hypotheses.find((item) => item.key !== primary?.key);
  const base = { ...session, hypotheses, contradictions, primaryKey: primary?.key, alternativeKey: alternative?.key };
  return { ...base, currentInnerMap: buildCurrentInnerMap(base) };
}

function withMapAnalytics(previous: Phase1Session, next: Phase1Session) {
  let tracked = next;
  if (!previous.currentInnerMap.nodes.length && next.currentInnerMap.nodes.length) tracked = track(tracked, "inner_map_first_node_shown", { version: next.currentInnerMap.version });
  else if (next.currentInnerMap.version !== previous.currentInnerMap.version) tracked = track(tracked, "inner_map_updated", { version: next.currentInnerMap.version });
  if (next.currentInnerMap.nodes.length && next.currentInnerMap.version !== previous.currentInnerMap.version) tracked = track(tracked, "agent_action_selected", { action: "UPDATE_MAP", reason: "signal_changed_map" });
  return tracked;
}

function withSignalsAnalytics(session: Phase1Session, signals: Signal[]) {
  return signals.reduce((current, signal) => track(current, "signal_added", { source: signal.source, domain: signal.domain, trait: signal.trait }), session);
}

export function createSession(now = Date.now()): Phase1Session {
  const sessionId = uid("phase1", now);
  return {
    schemaVersion: PHASE1_SCHEMA_VERSION,
    sessionId,
    createdAt: now,
    currentStep: "entry",
    signals: [],
    answers: {},
    priorityOrder: [],
    askedQuestionIds: [],
    hypotheses: [],
    contradictions: [],
    handledContradictionIds: [],
    userCorrections: {},
    currentInnerMap: { nodes: [], edges: [], updatedAt: now, version: 0 },
    actionCount: 0,
    fatigueBudget: 8,
    analytics: [{ name: "session_started", createdAt: now }],
  };
}

export function chooseIntent(session: Phase1Session, intent: ExplorationIntent): Phase1Session {
  const option = intentOptions.find((item) => item.id === intent);
  const additions = makeSignals(session, "entry", intent, "choice", option?.effects ?? []);
  let next = refreshModel({ ...session, intent, currentStep: "scan_state", signals: additions, actionCount: session.actionCount + 1 });
  next = withSignalsAnalytics(next, additions);
  return track(next, "entry_selected", { intent });
}

type ScanId = "scan_state" | "scan_attention" | "scan_needs";
const scanOptions: Record<ScanId, ChoiceOption[]> = { scan_state: stateOptions, scan_attention: attentionOptions, scan_needs: needOptions };
const nextScanStep: Record<ScanId, SessionStep> = { scan_state: "scan_attention", scan_attention: "scan_needs", scan_needs: "prioritize" };

export function recordScan(session: Phase1Session, scanId: ScanId, optionIds: string[]): Phase1Session {
  const options = scanOptions[scanId];
  const kept = session.signals.filter((signal) => signal.questionId !== scanId);
  const additions = optionIds.flatMap((optionId) => makeSignals(session, scanId, optionId, "multi_choice", options.find((option) => option.id === optionId)?.effects ?? []));
  const base = { ...session, currentStep: nextScanStep[scanId], answers: { ...session.answers, [scanId]: optionIds }, signals: [...kept, ...additions], actionCount: session.actionCount + 1 };
  let next = withMapAnalytics(session, refreshModel(base));
  next = withSignalsAnalytics(next, additions);
  return next;
}

export function recordRanking(session: Phase1Session, priorityOrder: string[]): Phase1Session {
  const kept = session.signals.filter((signal) => signal.questionId !== "need_ranking");
  const multipliers = [1, .72, .5, .36];
  const additions = priorityOrder.flatMap((optionId, index) => makeSignals(session, "need_ranking", optionId, "ranking", rankedNeedEffects[optionId] ?? [], multipliers[index] ?? .3));
  let next = refreshModel({ ...session, priorityOrder, currentStep: "branch", answers: { ...session.answers, need_ranking: priorityOrder }, signals: [...kept, ...additions], actionCount: session.actionCount + 1 });
  next = withMapAnalytics(session, next);
  next = withSignalsAnalytics(next, additions);
  next = track(next, "ranking_completed", { first: priorityOrder[0] ?? "none", count: priorityOrder.length });
  if (activeContradictions(next).length) next = track(next, "contradiction_detected", { trait: activeContradictions(next)[0].trait });
  return withAgentDecision(next);
}

function preferredQuestionId(primaryKey?: string) {
  return ({ result_self: "result_scenario", relationship_safety: "relationship_scenario", rest_recovery: "rest_tradeoff", direction_values: "direction_tradeoff", certainty_need: "certainty_scenario" } as Record<string, string>)[primaryKey ?? ""];
}

function questionScore(questionDefinition: QuestionDefinition, session: Phase1Session) {
  if (session.askedQuestionIds.includes(questionDefinition.id)) return -Infinity;
  let score = questionDefinition.informationValue;
  if (questionDefinition.discriminatesBetween?.includes(session.primaryKey ?? "")) score += .62;
  if (questionDefinition.discriminatesBetween?.includes(session.alternativeKey ?? "")) score += .5;
  if (questionDefinition.intentAffinity?.includes(session.intent ?? "current_state")) score += .3;
  if (!session.askedQuestionIds.length && questionDefinition.id === preferredQuestionId(session.primaryKey)) score += 1.2;
  for (const contradiction of activeContradictions(session)) if (questionDefinition.targetTraits.includes(contradiction.trait)) score += questionDefinition.type === "verification" ? 2 : .4;
  return score;
}

export function selectNextQuestion(session: Phase1Session): QuestionDefinition | undefined {
  return [...QUESTION_BANK].sort((a, b) => questionScore(b, session) - questionScore(a, session))[0];
}

export function calculateInformationNeed(session: Phase1Session) {
  const primary = session.hypotheses.find((item) => item.key === session.primaryKey);
  const alternative = session.hypotheses.find((item) => item.key === session.alternativeKey);
  const scoreGap = Math.abs((primary?.supportScore ?? 0) - (alternative?.supportScore ?? 0));
  const sourceCount = primary?.independentSources.length ?? 0;
  const unresolved = activeContradictions(session).length;
  return clamp((sourceCount < 2 ? .45 : .12) + (scoreGap < .14 ? .28 : .08) + (unresolved ? .48 : 0));
}

export function decideAgent(session: Phase1Session): AgentDecision {
  const primary = session.hypotheses.find((item) => item.key === session.primaryKey);
  const nextQuestion = selectNextQuestion(session);
  const unresolved = activeContradictions(session);
  const unaskedVerification = nextQuestion?.type === "verification";
  const informationNeed = calculateInformationNeed(session);
  let action: AgentAction;
  let reasonCode: string;
  let message: string;

  if (session.lastCorrection && session.lastCorrection.actionCount === session.actionCount && session.lastCorrection.response === "rejected") {
    action = "REWEIGHT";
    reasonCode = "user_correction_changed_primary";
    message = "这个反馈让原来的方向变弱了，下一步已经重新安排。";
  } else if (unresolved.length && unaskedVerification) {
    action = "VERIFY";
    reasonCode = "resolve_contradiction";
    message = "这里出现了两个不完全一致的线索，先把它们区分开。";
  } else if (!session.askedQuestionIds.length) {
    action = "BRANCH";
    reasonCode = "first_branch_from_signals";
    message = unresolved.length ? "两条线索暂时不一致，接下来先验证它们。" : "目前有两个方向比较突出，接下来会用一个情境把它们分开。";
  } else if (primary?.confirmation === "confirmed" || primary?.confirmation === "partial") {
    action = "STOP";
    reasonCode = "user_confirmed_current_map";
    message = "已经形成第一张属于这次探索的 Inner Map。";
  } else if (!unresolved.length && (primary?.independentSources.length ?? 0) >= 2 && (primary?.supportScore ?? 0) >= .44 && informationNeed <= .48) {
    action = "REVEAL_MAP";
    reasonCode = "independent_support_is_sufficient";
    message = "目前的信息已经足够形成第一张 Inner Map。";
  } else if (session.actionCount >= session.fatigueBudget || !nextQuestion) {
    action = "REVEAL_MAP";
    reasonCode = "fatigue_or_low_information_gain";
    message = "这个部分今天还没有足够线索，先保留未知，不继续追问。";
  } else {
    action = "ASK";
    reasonCode = "highest_information_gain";
    message = "这里还有一点没有区分清楚。";
  }

  return { action, nextQuestionId: nextQuestion?.id, primaryKey: session.primaryKey, alternativeKey: session.alternativeKey, reasonCode, message, engine: "structured_fallback" };
}

export function withAgentDecision(session: Phase1Session): Phase1Session {
  const previousDecision = session.agentDecision;
  const decision = decideAgent(session);
  let next = track({ ...session, agentDecision: decision }, "agent_action_selected", { action: decision.action, reason: decision.reasonCode });
  if (previousDecision?.primaryKey && previousDecision.primaryKey !== decision.primaryKey) next = track(next, "branch_changed", { from: previousDecision.primaryKey, to: decision.primaryKey ?? "none" });
  return next;
}

export function answerQuestion(session: Phase1Session, questionId: string, optionId: string): Phase1Session {
  const definition = QUESTION_BANK.find((item) => item.id === questionId);
  const effects = definition?.signalEffects[optionId];
  if (!definition || !effects) return session;
  const source: SignalSource = definition.type === "verification" ? "verification" : definition.type === "scenario" ? "scenario" : definition.type === "tradeoff" ? "tradeoff" : definition.type === "multi" ? "multi_choice" : "choice";
  const additions = makeSignals(session, questionId, optionId, source, effects);
  const handled = definition.type === "verification" && optionId !== "unknown"
    ? [...new Set([...session.handledContradictionIds, ...activeContradictions(session).map((item) => item.id)])]
    : session.handledContradictionIds;
  let next = refreshModel({
    ...session,
    currentStep: "adaptive",
    answers: { ...session.answers, [questionId]: [optionId] },
    askedQuestionIds: session.askedQuestionIds.includes(questionId) ? session.askedQuestionIds : [...session.askedQuestionIds, questionId],
    signals: [...session.signals, ...additions],
    handledContradictionIds: handled,
    lastCorrection: undefined,
    actionCount: session.actionCount + 1,
  });
  next = withMapAnalytics(session, next);
  next = withSignalsAnalytics(next, additions);
  const newContradiction = activeContradictions(next).find((item) => !activeContradictions(session).some((previous) => previous.id === item.id));
  if (newContradiction) next = track(next, "contradiction_detected", { trait: newContradiction.trait });
  return withAgentDecision(next);
}

export function revealMap(session: Phase1Session): Phase1Session {
  let next: Phase1Session = { ...session, currentStep: "map_review", agentDecision: { action: "REFLECT", primaryKey: session.primaryKey, alternativeKey: session.alternativeKey, reasonCode: "invite_user_correction", message: "先由你确认或修正这组理解。", engine: "structured_fallback" } };
  next = track(next, "hypothesis_shown", { hypothesis: next.primaryKey ?? "unknown" });
  next = track(next, "inner_map_revealed", { version: next.currentInnerMap.version });
  next = track(next, "agent_action_selected", { action: "REFLECT", reason: "invite_user_correction" });
  return next;
}

export function confirmHypothesis(session: Phase1Session, response: "confirmed" | "partial" | "rejected" | "alternative"): Phase1Session {
  const selectedKey = response === "alternative" ? session.alternativeKey : session.primaryKey;
  if (!selectedKey) return session;
  const corrections = { ...session.userCorrections };
  if (response === "alternative") {
    if (session.primaryKey) corrections[session.primaryKey] = "rejected";
    corrections[selectedKey] = "partial";
  } else corrections[selectedKey] = response;
  const confirmationEffect: SignalEffect = { domain: session.hypotheses.find((item) => item.key === selectedKey)?.relatedDomains[0] ?? "state", trait: `confirmation:${selectedKey}`, value: response === "rejected" ? -1 : response === "partial" ? .55 : 1, label: response === "rejected" ? "你否定了这条解释" : response === "partial" ? "你确认这条解释有一点像" : "你确认这条解释很贴近" };
  const confirmationSignal = makeSignals(session, "hypothesis_confirmation", response, "confirmation", [confirmationEffect])[0];
  let next = refreshModel({ ...session, userCorrections: corrections, signals: [...session.signals, confirmationSignal], actionCount: session.actionCount + 1, lastCorrection: { key: selectedKey, response: response === "alternative" ? "rejected" : response, actionCount: session.actionCount + 1 } });
  next = withMapAnalytics(session, next);
  next = withSignalsAnalytics(next, [confirmationSignal]);

  if (response === "rejected" || response === "alternative") {
    next = track(next, "hypothesis_rejected", { hypothesis: selectedKey, response });
    next = track(next, "branch_changed", { from: session.primaryKey ?? "none", to: next.primaryKey ?? "none" });
    return withAgentDecision({ ...next, currentStep: "adaptive" });
  }

  next = track(next, response === "partial" ? "hypothesis_partially_confirmed" : "hypothesis_confirmed", { hypothesis: selectedKey });
  next = track({ ...next, currentStep: "complete", agentDecision: { action: "STOP", primaryKey: next.primaryKey, alternativeKey: next.alternativeKey, reasonCode: "phase1_map_confirmed", message: "已经形成第一张属于这次探索的 Inner Map。", engine: "structured_fallback" } }, "agent_action_selected", { action: "STOP", reason: "phase1_map_confirmed" });
  return track(next, "phase1_completed", { mapVersion: next.currentInnerMap.version, response });
}

export function stopCondition(session: Phase1Session) {
  const primary = session.hypotheses.find((item) => item.key === session.primaryKey);
  const hasOpenDirection = session.currentInnerMap.nodes.some((node) => node.status === "uncertain");
  return session.currentStep === "complete" && Boolean(primary && ["confirmed", "partial"].includes(primary.confirmation) && hasOpenDirection);
}

export function getHypothesisLabel(key?: string) {
  return HYPOTHESIS_DEFINITIONS.find((item) => item.key === key)?.nodeLabels.join(" × ") ?? "尚未形成";
}

export function getHypothesisDefinition(key?: string) {
  return HYPOTHESIS_DEFINITIONS.find((item) => item.key === key);
}

export function getDomainLabel(domain: Domain) {
  return domainLabels[domain];
}

export function restoreSession(raw: string | null): Phase1Session | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<Phase1Session>;
    if (
      value.schemaVersion !== PHASE1_SCHEMA_VERSION
      || typeof value.sessionId !== "string"
      || !Array.isArray(value.signals)
      || !Array.isArray(value.hypotheses)
      || !Array.isArray(value.handledContradictionIds)
      || !value.currentInnerMap
      || !Array.isArray(value.currentInnerMap.nodes)
      || !Array.isArray(value.currentInnerMap.edges)
      || typeof value.currentStep !== "string"
    ) return null;
    return value as Phase1Session;
  } catch {
    return null;
  }
}

export function isLegacySessionSafeToMigrate(raw: string | null) {
  if (!raw) return false;
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    return value.schemaVersion === PHASE1_SCHEMA_VERSION && Array.isArray(value.signals) && Boolean(value.currentInnerMap);
  } catch {
    return false;
  }
}
