import type { LivingModelState } from "./types";
import type { Locale } from "../locale/messages";

const now = "2026-08-29T09:10:00.000Z";

export const DEMO_STATE: LivingModelState = {
  schemaVersion: 1,
  mode: "demo",
  agentRuntimeStatus: "unavailable",
  onboarded: true,
  onboardingReasons: ["Understand myself better", "Navigate a change"],
  sampleDataLoaded: true,
  hasPersonalUnderstanding: false,
  memoryPaused: false,
  preferences: { tone: 42, depth: 58, practicalSuggestions: true, notes: "Be direct when the pattern is supported, but leave room for me to disagree." },
  sessions: [
    {
      id: "session-career-aug29",
      input: "I tried a reversible first step before treating the career decision as final.",
      context: "decision",
      state: "COMPLETE",
      clarification: "Keeping my own judgement while learning from the test.",
      structure: { reality: "The decision is still open, but I have new direct experience.", expectation: "Other people still have preferences about what I choose.", selfDoubt: "Uncertainty no longer has to mean that my judgement is invalid." },
      tool: "contextual_tension",
      toolData: { tensionPosition: 36, leftLabel: "My own direction", rightLabel: "What is already secure", leftContext: "After testing one reversible step.", rightContext: "When the choice is treated as final.", difference: "A small real test gave me information without requiring a final commitment.", think: "", feel: "", fear: "", want: "", unsaid: "", keepUnsaidPrivate: true },
      nextStep: "Keep the test reversible long enough to notice what becomes clearer.",
      outcome: "resolved_only",
      createdAt: "2026-08-29T09:00:00.000Z",
      updatedAt: "2026-08-29T09:10:00.000Z",
    },
    {
      id: "session-career-aug12",
      input: "I keep postponing whether to stay on this team. The role is stable, but it doesn't feel like a decision I made.",
      context: "decision",
      state: "COMPLETE",
      clarification: "The hardest part is disappointing people who backed me.",
      structure: { reality: "The offer is stable and familiar.", expectation: "People I respect expect me to stay.", selfDoubt: "I am unsure whether wanting something else is a good enough reason." },
      tool: "contextual_tension",
      toolData: { tensionPosition: 62, leftLabel: "My own direction", rightLabel: "What is already secure", leftContext: "When I can explore without closing every door.", rightContext: "When other people are affected by my choice.", difference: "This time, staying would be easier to explain than wanting to stay.", think: "", feel: "", fear: "", want: "", unsaid: "", keepUnsaidPrivate: true },
      nextStep: "Write down what I would choose if nobody needed an explanation.",
      outcome: "contextualized",
      createdAt: "2026-08-12T10:00:00.000Z",
      updatedAt: "2026-08-12T10:24:00.000Z",
    },
    {
      id: "session-school-aug20",
      input: "A mentor questioned my plan and I immediately stopped trusting it.",
      context: "repeating",
      state: "COMPLETE",
      structure: { reality: "A mentor raised a practical concern.", expectation: "Their approval matters to me.", selfDoubt: "I treated disagreement as evidence that my preference was invalid." },
      tool: "perspective_split",
      toolData: { tensionPosition: 48, leftLabel: "My judgement", rightLabel: "External validation", leftContext: "", rightContext: "", difference: "", think: "Their point may be useful.", feel: "Smaller than I did before the conversation.", fear: "Being seen as naive.", want: "To keep evaluating without handing over the decision.", unsaid: "", keepUnsaidPrivate: true },
      nextStep: "Separate the practical concern from the verdict I imagined.",
      outcome: "accepted",
      createdAt: "2026-08-20T08:00:00.000Z",
      updatedAt: "2026-08-20T08:18:00.000Z",
    },
  ],
  stateSnapshots: [
    { id: "snapshot-pressure-aug12", sessionId: "session-career-aug12", metricKey: "pressure", label: "Pressure", value: 4, source: "user_self_report", context: "Career decision", contextKey: "decision", capturedAt: "2026-08-12T10:05:00.000Z" },
    { id: "snapshot-clarity-aug12", sessionId: "session-career-aug12", metricKey: "clarity", label: "Clarity", value: 2, source: "user_self_report", context: "Career decision", contextKey: "decision", capturedAt: "2026-08-12T10:05:00.000Z" },
    { id: "snapshot-pressure-aug20", sessionId: "session-school-aug20", metricKey: "pressure", label: "Pressure", value: 3, source: "user_self_report", context: "Career decision", contextKey: "decision", capturedAt: "2026-08-20T08:04:00.000Z" },
    { id: "snapshot-clarity-aug20", sessionId: "session-school-aug20", metricKey: "clarity", label: "Clarity", value: 3, source: "user_self_report", context: "Career decision", contextKey: "decision", capturedAt: "2026-08-20T08:04:00.000Z" },
    { id: "snapshot-pressure-aug29", sessionId: "session-career-aug29", metricKey: "pressure", label: "Pressure", value: 2, source: "user_self_report", context: "Career decision", contextKey: "decision", capturedAt: "2026-08-29T09:02:00.000Z" },
    { id: "snapshot-clarity-aug29", sessionId: "session-career-aug29", metricKey: "clarity", label: "Clarity", value: 4, source: "user_self_report", context: "Career decision", contextKey: "decision", capturedAt: "2026-08-29T09:02:00.000Z" },
  ],
  facts: [
    { id: "fact-internship", statement: "I am currently in a six-month product internship.", context: "Career", createdAt: "2026-08-05T08:00:00.000Z", updatedAt: now, forgotten: false },
    { id: "fact-school", statement: "I can return to school next term without losing my place.", context: "School", createdAt: "2026-08-12T10:00:00.000Z", updatedAt: now, forgotten: false },
    { id: "fact-mentor", statement: "A mentor whose opinion matters to me questioned my plan.", context: "School", createdAt: "2026-08-20T08:00:00.000Z", updatedAt: now, forgotten: false },
  ],
  observations: [
    { id: "obs-validation", statement: "External approval appeared in three reflections about decisions.", sourceSessionIds: ["session-career-aug12", "session-school-aug20"], createdAt: now, disputed: false, forgotten: false },
    { id: "obs-delay", statement: "You named what you wanted after first explaining what would be safest.", sourceSessionIds: ["session-career-aug12"], createdAt: now, disputed: false, forgotten: false },
  ],
  insights: [
    {
      id: "insight-judgement",
      category: "tensions",
      title: "Judgement and validation",
      statement: "When your preference conflicts with someone important to you, you may start questioning whether your preference is valid.",
      status: "context_dependent",
      appliesWhen: ["The other person has expertise or has invested in me", "The choice affects an important relationship"],
      doesNotApplyWhen: ["I have direct experience and enough time to test my view"],
      evidenceIds: ["ev-career", "ev-school", "ev-project-counter"],
      firstSeenAt: "2026-08-12T10:24:00.000Z",
      lastRevisedAt: "2026-08-20T08:18:00.000Z",
      createdSource: "agent",
      userConfirmed: true,
    },
    {
      id: "insight-clarity",
      category: "what_i_need",
      title: "Room before commitment",
      statement: "In consequential choices, a reversible first step often helps you hear your own preference more clearly.",
      status: "user_confirmed",
      appliesWhen: ["The decision can be tested without pretending it is final"],
      doesNotApplyWhen: ["A decision has an immediate, irreversible deadline"],
      evidenceIds: ["ev-experiment", "ev-deadline-counter"],
      firstSeenAt: "2026-08-07T09:00:00.000Z",
      lastRevisedAt: "2026-08-18T09:00:00.000Z",
      createdSource: "user",
      userConfirmed: true,
    },
    {
      id: "insight-unsaid",
      category: "patterns",
      title: "Managing the reaction first",
      statement: "You sometimes edit what you want to say before you know how the other person will respond.",
      status: "recurring_signal",
      appliesWhen: ["The relationship feels important"],
      doesNotApplyWhen: ["The disagreement is low stakes"],
      evidenceIds: ["ev-unsaid-one", "ev-unsaid-two"],
      firstSeenAt: "2026-08-09T11:00:00.000Z",
      lastRevisedAt: "2026-08-24T11:00:00.000Z",
      createdSource: "agent",
      userConfirmed: true,
    },
    {
      id: "insight-changing",
      category: "boundaries",
      title: "Speaking before certainty",
      statement: "You may be becoming more willing to name a boundary before you can guarantee that it will be received well.",
      status: "changing",
      appliesWhen: ["You have had time to name what is yours to decide"],
      doesNotApplyWhen: ["You feel responsible for the other person's immediate reaction"],
      evidenceIds: ["ev-boundary-new", "ev-boundary-old"],
      firstSeenAt: "2026-08-14T11:00:00.000Z",
      lastRevisedAt: "2026-08-26T11:00:00.000Z",
      createdSource: "agent",
      userConfirmed: true,
    },
  ],
  evidence: [
    { id: "ev-career", insightId: "insight-judgement", sourceType: "reflection", sourceId: "session-career-aug12", excerpt: "Staying would be easier to explain than wanting to stay.", relationship: "supporting", context: "Career · Aug 12", createdAt: "2026-08-12T10:20:00.000Z" },
    { id: "ev-school", insightId: "insight-judgement", sourceType: "reflection", sourceId: "session-school-aug20", excerpt: "I treated disagreement as evidence that my preference was invalid.", relationship: "supporting", context: "School · Aug 20", createdAt: "2026-08-20T08:15:00.000Z" },
    { id: "ev-project-counter", insightId: "insight-judgement", sourceType: "observation", sourceId: "obs-validation", excerpt: "In one project decision, you kept your view after a teammate disagreed and tested it directly.", relationship: "counter_signal", context: "Project · Aug 16", createdAt: "2026-08-16T15:00:00.000Z" },
    { id: "ev-experiment", insightId: "insight-clarity", sourceType: "reflection", sourceId: "session-career-aug12", excerpt: "A two-week trial made the choice feel clearer without making it final.", relationship: "supporting", context: "Career · Aug 18", createdAt: "2026-08-18T09:00:00.000Z" },
    { id: "ev-deadline-counter", insightId: "insight-clarity", sourceType: "fact", sourceId: "fact-school", excerpt: "When the deadline was fixed, more options created noise rather than clarity.", relationship: "counter_signal", context: "School · Aug 11", createdAt: "2026-08-11T09:00:00.000Z" },
    { id: "ev-unsaid-one", insightId: "insight-unsaid", sourceType: "reflection", sourceId: "session-career-aug12", excerpt: "I rehearsed a version that would be easiest for them to hear.", relationship: "supporting", context: "Career · Aug 12", createdAt: "2026-08-12T10:00:00.000Z" },
    { id: "ev-unsaid-two", insightId: "insight-unsaid", sourceType: "reflection", sourceId: "session-school-aug20", excerpt: "I removed the part where I disagreed with my mentor.", relationship: "supporting", context: "School · Aug 20", createdAt: "2026-08-20T08:00:00.000Z" },
    { id: "ev-boundary-new", insightId: "insight-changing", sourceType: "reflection", sourceId: "session-school-aug20", excerpt: "I said I needed a day before answering instead of agreeing immediately.", relationship: "supporting", context: "Relationship · Aug 26", createdAt: "2026-08-26T11:00:00.000Z" },
    { id: "ev-boundary-old", insightId: "insight-changing", sourceType: "observation", sourceId: "obs-delay", excerpt: "In earlier reflections, you usually answered first and noticed the boundary later.", relationship: "counter_signal", context: "Across earlier reflections", createdAt: "2026-08-14T11:00:00.000Z" },
  ],
  versions: [
    { id: "ver-judgement-1", insightId: "insight-judgement", versionNumber: 1, statement: "I stop trusting my decisions when someone disagrees.", appliesWhen: [], doesNotApplyWhen: [], changedBy: "agent", createdAt: "2026-08-12T10:24:00.000Z" },
    { id: "ver-judgement-2", insightId: "insight-judgement", versionNumber: 2, statement: "When your preference conflicts with someone important to you, you may start questioning whether your preference is valid.", appliesWhen: ["The other person has expertise or has invested in me"], doesNotApplyWhen: ["I have direct experience and enough time to test my view"], changedBy: "user", changeReason: "It is specific to people whose judgement carries weight.", createdAt: "2026-08-20T08:18:00.000Z" },
    { id: "ver-boundary-1", insightId: "insight-changing", versionNumber: 1, statement: "I avoid setting boundaries.", appliesWhen: [], doesNotApplyWhen: [], changedBy: "agent", createdAt: "2026-08-14T11:00:00.000Z" },
    { id: "ver-boundary-2", insightId: "insight-changing", versionNumber: 2, statement: "You may be becoming more willing to name a boundary before you can guarantee that it will be received well.", appliesWhen: ["You have had time to name what is yours to decide"], doesNotApplyWhen: ["You feel responsible for the other person's immediate reaction"], changedBy: "user", createdAt: "2026-08-26T11:00:00.000Z" },
  ],
  rejectedInterpretations: [
    { id: "reject-always-conflict", candidateId: "candidate-always-conflict", statement: "You generally avoid conflict because disagreement feels unsafe.", context: "Project collaboration", rejectedAt: "2026-08-16T15:10:00.000Z" },
  ],
  journey: [
    { id: "journey-judgement-new", type: "new_understanding", insightId: "insight-judgement", title: "A possible pattern entered your mirror", summary: "External disagreement and trust in your own preference appeared connected.", currentStatement: "I stop trusting my decisions when someone disagrees.", createdAt: "2026-08-12T10:24:00.000Z", changedBy: "agent" },
    { id: "journey-judgement-refined", type: "refined_understanding", insightId: "insight-judgement", title: "You made the context more precise", summary: "The pattern became specific to people whose judgement carries weight.", previousStatement: "I stop trusting my decisions when someone disagrees.", currentStatement: "When your preference conflicts with someone important to you, you may start questioning whether your preference is valid.", createdAt: "2026-08-20T08:18:00.000Z", changedBy: "user" },
    { id: "journey-boundary-change", type: "understanding_changed", insightId: "insight-changing", title: "A previous understanding may be changing", summary: "New evidence complicates the idea that you always wait to name a boundary.", previousStatement: "I avoid setting boundaries.", currentStatement: "You may be becoming more willing to name a boundary before you can guarantee that it will be received well.", createdAt: "2026-08-26T11:00:00.000Z", changedBy: "user" },
  ],
  directions: [
    { id: "direction-judgement", statement: "Trust my judgement before asking for validation.", status: "still_matters", updatedAt: now },
  ],
  analytics: [],
};

export function createDemoState(locale: Locale = "en"): LivingModelState {
  const state = structuredClone(DEMO_STATE);
  return locale === "zh-CN" ? localizeDemoState(state) : state;
}

const zhDemoText: Record<string, string> = {
  "Understand myself better": "更了解自己", "Navigate a change": "面对一段变化",
  "Be direct when the pattern is supported, but leave room for me to disagree.": "当模式有足够支持时请直接一些，但也要给我保留不同意的空间。",
  "I tried a reversible first step before treating the career decision as final.": "在把职业决定当成最终选择之前，我先尝试了一个可逆的小步骤。",
  "Keeping my own judgement while learning from the test.": "在从尝试中学习的同时，保留我自己的判断。",
  "The decision is still open, but I have new direct experience.": "决定仍然开放，但我已经有了新的直接经验。",
  "Other people still have preferences about what I choose.": "其他人仍然对我的选择抱有期待。",
  "Uncertainty no longer has to mean that my judgement is invalid.": "不确定不再等于我的判断无效。",
  "My own direction": "我自己的方向", "What is already secure": "已经确定的部分",
  "After testing one reversible step.": "在尝试了一个可逆的小步骤之后。", "When the choice is treated as final.": "当这个选择被当作最终决定时。",
  "A small real test gave me information without requiring a final commitment.": "一次真实的小尝试给了我信息，却不需要立刻作出最终承诺。",
  "Keep the test reversible long enough to notice what becomes clearer.": "让这次尝试保持足够久的可逆性，看看什么会逐渐清楚。",
  "I keep postponing whether to stay on this team. The role is stable, but it doesn't feel like a decision I made.": "我一直拖延是否留在这个团队。这个角色很稳定，但不像是我自己作出的决定。",
  "The hardest part is disappointing people who backed me.": "最难的是让那些支持过我的人失望。",
  "The offer is stable and familiar.": "这个机会稳定而熟悉。", "People I respect expect me to stay.": "我尊敬的人希望我留下。",
  "I am unsure whether wanting something else is a good enough reason.": "我不确定，想要别的东西是不是一个足够成立的理由。",
  "When I can explore without closing every door.": "当我可以探索，而不必关上所有门。", "When other people are affected by my choice.": "当我的选择会影响其他人。",
  "This time, staying would be easier to explain than wanting to stay.": "这一次，解释为什么留下，比承认自己想留下更容易。",
  "Write down what I would choose if nobody needed an explanation.": "写下如果不需要向任何人解释，我会怎样选择。",
  "A mentor questioned my plan and I immediately stopped trusting it.": "一位导师质疑了我的计划，我立刻就不再相信自己的判断。",
  "A mentor raised a practical concern.": "一位导师提出了一个实际问题。", "Their approval matters to me.": "他们的认可对我很重要。",
  "I treated disagreement as evidence that my preference was invalid.": "我把分歧当成了自己的偏好无效的证据。",
  "My judgement": "我的判断", "External validation": "外部认可", "Their point may be useful.": "他们的观点也许有用。",
  "Smaller than I did before the conversation.": "比谈话之前更渺小。", "Being seen as naive.": "被看作幼稚。",
  "To keep evaluating without handing over the decision.": "继续评估，而不是把决定交出去。", "Separate the practical concern from the verdict I imagined.": "把实际问题和我想象出的判决分开。",
  "Pressure": "压力", "Clarity": "清晰度", "Career decision": "职业决定",
  "I am currently in a six-month product internship.": "我目前正在进行一段为期六个月的产品实习。", "Career": "职业",
  "I can return to school next term without losing my place.": "我下学期可以返校，而且不会失去学籍。", "School": "学校",
  "A mentor whose opinion matters to me questioned my plan.": "一位我很看重其意见的导师质疑了我的计划。",
  "External approval appeared in three reflections about decisions.": "外部认可出现在三次与决定有关的反思里。",
  "You named what you wanted after first explaining what would be safest.": "你总是在先解释什么最安全之后，才说出自己想要什么。",
  "Judgement and validation": "判断与认可", "When your preference conflicts with someone important to you, you may start questioning whether your preference is valid.": "当自己的偏好与一个重要之人的期待冲突时，你可能会开始怀疑这份偏好是否成立。",
  "The other person has expertise or has invested in me": "对方拥有专业经验，或曾经在我身上投入很多", "The choice affects an important relationship": "这个选择会影响一段重要关系", "I have direct experience and enough time to test my view": "我有直接经验，也有足够时间检验自己的看法",
  "Room before commitment": "承诺之前的空间", "In consequential choices, a reversible first step often helps you hear your own preference more clearly.": "在重要选择中，一个可逆的第一步，常常能让你更清楚地听见自己的偏好。",
  "The decision can be tested without pretending it is final": "这个决定可以先被检验，而不必假装它已经最终确定", "A decision has an immediate, irreversible deadline": "这个决定有一个即时且不可逆的期限",
  "Managing the reaction first": "先照顾对方的反应", "You sometimes edit what you want to say before you know how the other person will respond.": "有时在知道对方会怎样回应之前，你就已经开始修改自己想说的话。",
  "The relationship feels important": "这段关系很重要", "The disagreement is low stakes": "这次分歧的代价很低",
  "Speaking before certainty": "在确定之前开口", "You may be becoming more willing to name a boundary before you can guarantee that it will be received well.": "你可能正变得更愿意在无法保证对方会接受之前，先说出自己的边界。",
  "You have had time to name what is yours to decide": "你已经有时间分清什么由自己决定", "You feel responsible for the other person's immediate reaction": "你觉得自己要为对方当下的反应负责",
  "Staying would be easier to explain than wanting to stay.": "解释为什么留下，比承认自己想留下更容易。", "Career · Aug 12": "职业 · 8月12日",
  "School · Aug 20": "学校 · 8月20日", "In one project decision, you kept your view after a teammate disagreed and tested it directly.": "在一次项目决定中，同事不同意后你仍保留了自己的看法，并直接进行了验证。", "Project · Aug 16": "项目 · 8月16日",
  "A two-week trial made the choice feel clearer without making it final.": "两周的尝试让选择变得更清楚，却没有把它变成最终决定。", "Career · Aug 18": "职业 · 8月18日",
  "When the deadline was fixed, more options created noise rather than clarity.": "当期限固定时，更多选项带来的不是清晰，而是干扰。", "School · Aug 11": "学校 · 8月11日",
  "I rehearsed a version that would be easiest for them to hear.": "我反复练习了一个最容易让他们接受的版本。", "I removed the part where I disagreed with my mentor.": "我删掉了自己不同意导师的那一部分。",
  "I said I needed a day before answering instead of agreeing immediately.": "我说自己需要一天再回答，而不是立刻同意。", "Relationship · Aug 26": "关系 · 8月26日",
  "In earlier reflections, you usually answered first and noticed the boundary later.": "在更早的反思里，你通常先回答，之后才注意到自己的边界。", "Across earlier reflections": "在更早的几次反思中",
  "I stop trusting my decisions when someone disagrees.": "一旦有人不同意，我就不再相信自己的决定。", "It is specific to people whose judgement carries weight.": "这只会发生在对方的判断对我很有分量时。",
  "I avoid setting boundaries.": "我会回避设定边界。", "The earlier supporting conditions are present": "早先的支撑条件仍然存在",
  "You generally avoid conflict because disagreement feels unsafe.": "你通常会回避冲突，因为分歧让你感到不安全。", "Project collaboration": "项目协作",
  "A possible pattern entered your mirror": "一种可能的模式进入了你的镜像", "External disagreement and trust in your own preference appeared connected.": "外部的不同意见，似乎和你对自身偏好的信任联系在一起。",
  "You made the context more precise": "你让适用情境变得更准确", "The pattern became specific to people whose judgement carries weight.": "这份模式被收窄到那些判断对你很有分量的人。",
  "A previous understanding may be changing": "一份过去的理解可能正在变化", "New evidence complicates the idea that you always wait to name a boundary.": "新的证据让“你总会等很久才说出边界”这份理解变得不再简单。",
  "Trust my judgement before asking for validation.": "在寻求认可之前，先相信自己的判断。",
};

export function localizeDemoText(value: string, locale: Locale): string {
  if (locale === "zh-CN") return zhDemoText[value] ?? value;
  const english = Object.entries(zhDemoText).find(([, translated]) => translated === value)?.[0];
  return english ?? value;
}

function localizeDemoState(state: LivingModelState): LivingModelState {
  const visit = (value: unknown): unknown => {
    if (typeof value === "string") return localizeDemoText(value, "zh-CN");
    if (Array.isArray(value)) return value.map(visit);
    if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, visit(item)]));
    return value;
  };
  return visit(state) as LivingModelState;
}

export function createEmptyState(): LivingModelState {
  return {
    schemaVersion: 1,
    mode: "demo",
    agentRuntimeStatus: "unavailable",
    onboarded: false,
    onboardingReasons: [],
    sampleDataLoaded: false,
    hasPersonalUnderstanding: false,
    memoryPaused: false,
    preferences: { tone: 50, depth: 50, practicalSuggestions: true, notes: "" },
    sessions: [],
    stateSnapshots: [],
    facts: [],
    observations: [],
    insights: [],
    evidence: [],
    versions: [],
    rejectedInterpretations: [],
    journey: [],
    directions: [],
    analytics: [],
  };
}
