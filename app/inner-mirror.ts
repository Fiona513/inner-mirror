export const DIMENSION_KEYS = [
  "safety",
  "understood",
  "selfWorth",
  "boundaries",
  "expression",
  "investment",
] as const;

export type DimensionKey = (typeof DIMENSION_KEYS)[number];
export type View = "home" | "explore" | "results" | "space" | "letter" | "timeline";

export type QuestionOption = {
  label: string;
  detail: string;
  value: number;
};

export type Question = {
  id: string;
  number: string;
  prompt: string;
  context: string;
  dimensions: DimensionKey[];
  options: QuestionOption[];
};

export type LetterDraft = {
  recipient: string;
  message: string;
  selfNote: string;
};

export type SealedLetter = LetterDraft & {
  sealedAt: string;
};

export type AppState = {
  view: View;
  answers: Record<string, number>;
  currentQuestion: number;
  completedAt?: string;
  letterDraft: LetterDraft;
  letter?: SealedLetter;
  lampOn: boolean;
  windowOpen: boolean;
  mirrorRestored: boolean;
  clutterSettled: boolean;
};

export type DimensionScore = {
  key: DimensionKey;
  label: string;
  shortLabel: string;
  score: number;
  description: string;
};

export const EMPTY_DRAFT: LetterDraft = { recipient: "", message: "", selfNote: "" };

export const DEFAULT_STATE: AppState = {
  view: "home",
  answers: {},
  currentQuestion: 0,
  letterDraft: EMPTY_DRAFT,
  lampOn: false,
  windowOpen: false,
  mirrorRestored: false,
  clutterSettled: false,
};

export const dimensionMeta: Record<DimensionKey, Omit<DimensionScore, "key" | "score">> = {
  safety: { label: "安全感", shortLabel: "安全", description: "在靠近与分离之间保有内在稳定" },
  understood: { label: "被理解感", shortLabel: "理解", description: "感到自己的情绪能被看见与接住" },
  selfWorth: { label: "自我价值感", shortLabel: "价值", description: "不依赖外部评价确认自己的重要性" },
  boundaries: { label: "边界感", shortLabel: "边界", description: "辨认并守护自己的感受与限度" },
  expression: { label: "表达需求能力", shortLabel: "表达", description: "把期待转化为清晰、可被回应的话" },
  investment: { label: "关系投入程度", shortLabel: "投入", description: "在付出、接受与自我照顾之间保持平衡" },
};

export const questions: Question[] = [
  {
    id: "distance",
    number: "01",
    context: "当关系里出现一点距离",
    prompt: "一个重要的人突然回复得很慢，你更接近哪种反应？",
    dimensions: ["safety"],
    options: [
      { label: "不断确认发生了什么", detail: "很容易把沉默理解成关系正在离开", value: 1 },
      { label: "等待，但心里反复猜测", detail: "表面平静，注意力却很难移开", value: 2 },
      { label: "先安顿自己，再找机会问清", detail: "允许不确定，也愿意沟通", value: 4 },
      { label: "相信一段距离不会否定关系", detail: "能保留自己的节奏与空间", value: 5 },
    ],
  },
  {
    id: "sharing",
    number: "02",
    context: "当情绪想被另一个人看见",
    prompt: "你遇到一件难受的事，通常会怎样让亲近的人知道？",
    dimensions: ["understood"],
    options: [
      { label: "藏起来，不想成为负担", detail: "更习惯独自消化", value: 1 },
      { label: "给一点暗示，等对方发现", detail: "希望被主动看见", value: 2 },
      { label: "说出一部分，再观察反应", detail: "需要确认这里足够安全", value: 3 },
      { label: "直接说明我想被倾听还是建议", detail: "允许别人用合适的方式靠近", value: 5 },
    ],
  },
  {
    id: "recognition",
    number: "03",
    context: "当肯定没有如期到来",
    prompt: "付出没有得到认可时，你内心最常出现的声音是？",
    dimensions: ["selfWorth"],
    options: [
      { label: "是不是我还不够好", detail: "外界的回应会很快变成自我怀疑", value: 1 },
      { label: "我要更努力，证明自己", detail: "习惯用更多付出来换取肯定", value: 2 },
      { label: "我会失落，但能重新评估", detail: "看见情绪，也看见事实", value: 4 },
      { label: "这不会改变我对自己的认识", detail: "认可很珍贵，但不是价值的唯一来源", value: 5 },
    ],
  },
  {
    id: "limits",
    number: "04",
    context: "当别人向你提出请求",
    prompt: "面对一个让你不舒服、却很难拒绝的请求，你会？",
    dimensions: ["boundaries"],
    options: [
      { label: "先答应，之后再自己承受", detail: "拒绝带来的压力似乎更难处理", value: 1 },
      { label: "答应，但期待对方察觉我的勉强", detail: "边界常以沉默的方式出现", value: 2 },
      { label: "尝试拒绝，同时感到内疚", detail: "正在练习把自己也放进关系", value: 3 },
      { label: "说明限度，也尊重对方的需要", detail: "拒绝一件事，不等于拒绝一个人", value: 5 },
    ],
  },
  {
    id: "comfort",
    number: "05",
    context: "当你需要一点安慰",
    prompt: "你希望被陪伴时，更可能怎么做？",
    dimensions: ["expression"],
    options: [
      { label: "等对方自己看出来", detail: "被主动发现，才像是真正在意", value: 1 },
      { label: "用情绪或试探发出信号", detail: "很难把需要说得太直接", value: 2 },
      { label: "积累到一定程度才说", detail: "能表达，但往往已经独自撑了很久", value: 3 },
      { label: "说清楚此刻需要怎样的陪伴", detail: "给自己需要，也给对方回应的入口", value: 5 },
    ],
  },
  {
    id: "giving",
    number: "06",
    context: "当你认真投入一段关系",
    prompt: "你如何描述自己在关系里的付出？",
    dimensions: ["investment"],
    options: [
      { label: "常常把对方放在自己前面", detail: "自己的疲惫容易被忽略", value: 1 },
      { label: "会用很多付出来维持关系", detail: "投入有时带着不能失去的用力", value: 2 },
      { label: "有时很多，有时又突然收回", detail: "在靠近与保护自己之间摆动", value: 3 },
      { label: "愿意付出，也允许自己被照顾", detail: "关系与自我都值得留出位置", value: 5 },
    ],
  },
  {
    id: "conflict",
    number: "07",
    context: "当两个人的需要发生碰撞",
    prompt: "一次分歧出现时，你最熟悉的应对方式是？",
    dimensions: ["safety", "boundaries"],
    options: [
      { label: "先退让，害怕关系因此破裂", detail: "和平比自己的真实感受更紧迫", value: 1 },
      { label: "回避或沉默，等情绪自己过去", detail: "距离暂时带来保护", value: 2 },
      { label: "试着解释，但仍很担心结果", detail: "正在关系里练习承担不确定", value: 3 },
      { label: "讨论问题，同时确认彼此仍在", detail: "分歧可以存在，连接也可以继续", value: 5 },
    ],
  },
  {
    id: "receiving",
    number: "08",
    context: "当温柔真正来到你面前",
    prompt: "别人真诚地照顾你时，你通常如何接住这份好意？",
    dimensions: ["understood", "selfWorth"],
    options: [
      { label: "会怀疑这份好意能持续多久", detail: "接受之前，需要反复确认", value: 1 },
      { label: "感动，但也担心欠了什么", detail: "被照顾有时伴随着负担感", value: 2 },
      { label: "愿意接受，偶尔仍会不自在", detail: "正在适应不需要交换的温柔", value: 4 },
      { label: "坦然接受，也真诚回应", detail: "相信自己值得被好好对待", value: 5 },
    ],
  },
];

export function calculateScores(answers: Record<string, number>): DimensionScore[] {
  const buckets: Record<DimensionKey, number[]> = {
    safety: [], understood: [], selfWorth: [], boundaries: [], expression: [], investment: [],
  };

  questions.forEach((question) => {
    const value = answers[question.id];
    if (!value) return;
    question.dimensions.forEach((dimension) => buckets[dimension].push(value));
  });

  return DIMENSION_KEYS.map((key) => {
    const values = buckets[key];
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return { key, ...dimensionMeta[key], score: Math.round(average * 20) };
  });
}

export type RoomProfile = {
  mirrorNeedsRepair: boolean;
  windowNeedsOpening: boolean;
  letterNeedsVoice: boolean;
  boundariesNeedSpace: boolean;
  initialLightLevel: number;
};

export function deriveRoomProfile(scores: DimensionScore[]): RoomProfile {
  const scoreOf = (key: DimensionKey) => scores.find((item) => item.key === key)?.score ?? 100;
  const mirrorNeedsRepair = scoreOf("selfWorth") < 65;
  const windowNeedsOpening = scoreOf("safety") < 65;
  const letterNeedsVoice = scoreOf("expression") < 65;
  const boundariesNeedSpace = scoreOf("boundaries") < 65 || scoreOf("investment") < 50;
  const unsettledCount = [mirrorNeedsRepair, windowNeedsOpening, letterNeedsVoice, boundariesNeedSpace].filter(Boolean).length;

  return {
    mirrorNeedsRepair,
    windowNeedsOpening,
    letterNeedsVoice,
    boundariesNeedSpace,
    initialLightLevel: Math.max(0.76, 0.96 - unsettledCount * 0.05),
  };
}

const needCopy: Record<DimensionKey, { title: string; body: string; practice: string }> = {
  safety: {
    title: "在不确定里，先给自己一点安全",
    body: "关系中的停顿很容易牵动你。此刻最重要的，也许不是立刻找到答案，而是确认：即使回应晚一点，你仍然可以安稳地留在自己身边。",
    practice: "下次等待回应时，先写下三个确定存在的事实。",
  },
  understood: {
    title: "让感受被看见，而不是被猜中",
    body: "你对被理解有细腻的期待，也可能因此把很多话留在心里。真正的理解不总是默契，它也来自你愿意留下一条通往内心的路。",
    practice: "从一句“我现在更希望被听见”开始。",
  },
  selfWorth: {
    title: "把价值的确认，慢慢收回自己手中",
    body: "你可能很擅长通过努力与照顾别人证明重要性。你的价值并不只存在于被需要的时刻，也存在于无人评判时那个真实的你。",
    practice: "每天记录一件与你的表现无关、却值得喜欢自己的事。",
  },
  boundaries: {
    title: "练习温柔而清晰的边界",
    body: "你很在意关系是否和谐，因此拒绝有时显得困难。边界不是把人推远，而是让靠近发生在双方都能呼吸的位置。",
    practice: "用“我现在能做到的是……”代替勉强答应。",
  },
  expression: {
    title: "把未说出口的需要，变成可以被回应的话",
    body: "你并非没有需要，只是习惯先判断它是否会打扰别人。清晰表达不是索取，而是在关系里为真实的自己保留一个位置。",
    practice: "用“我感到……我希望……”完成一次小表达。",
  },
  investment: {
    title: "在付出之外，也为自己留一盏灯",
    body: "你对关系认真而敏锐，投入时容易走得很深。更长久的连接，需要你既能走向别人，也能按时回到自己。",
    practice: "答应别人之前，先问自己：我现在还有多少余量？",
  },
};

const lowKeywords: Record<DimensionKey, string> = {
  safety: "安全感寻回", understood: "渴望被懂", selfWorth: "向内确认",
  boundaries: "边界练习", expression: "未说出口", investment: "用力维系",
};

const highKeywords: Record<DimensionKey, string> = {
  safety: "稳定靠近", understood: "细腻共感", selfWorth: "内在笃定",
  boundaries: "清晰边界", expression: "真诚表达", investment: "平衡投入",
};

export function buildProfile(scores: DimensionScore[]) {
  const sorted = [...scores].sort((a, b) => a.score - b.score);
  const primary = sorted[0];
  const strongest = sorted[sorted.length - 1];
  const average = Math.round(scores.reduce((sum, item) => sum + item.score, 0) / scores.length);
  const keywords = [
    primary.score < 65 ? lowKeywords[primary.key] : highKeywords[primary.key],
    sorted[1].score < 65 ? lowKeywords[sorted[1].key] : highKeywords[sorted[1].key],
    highKeywords[strongest.key],
  ].filter((word, index, list) => list.indexOf(word) === index).slice(0, 3);

  const tone = average < 48
    ? "你似乎习惯先确认关系是否安全，再决定要不要让真实的自己出现。"
    : average < 72
      ? "你已经能感知自己的需要，只是在一些重要关系里，仍会下意识把它轻轻收回。"
      : "你正在形成稳定而清晰的关系方式，也愿意让真实的需要在连接中被看见。";

  const summary = `${tone} 你的优势落在「${strongest.label}」：${strongest.description}；而「${primary.label}」是此刻最值得温柔照看的位置。这里没有好坏，只呈现你当下更常使用的方式。`;

  return { primary, strongest, average, keywords, summary, need: needCopy[primary.key] };
}

export function formatDateTime(value?: string) {
  if (!value) return "尚未记录";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}
