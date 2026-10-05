/**
 * Typed message catalog for Inner Mirror — Living Model.
 *
 * zh-CN is the authoring locale. The `en` catalog is typed as `Messages`
 * (derived from `zhCN`), so a missing, extra, or mis-typed key fails at
 * compile time. Components consume strings via `t("path.to.key")` from
 * locale.tsx; `MessageKey` is the checked union of every leaf path.
 */

export const LOCALE_STORAGE_KEY = "inner-mirror:locale";

export const locales = ["zh-CN", "en"] as const;
export type Locale = (typeof locales)[number];

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "zh-CN" || value === "en";
}

export const zhCN = {
  brand: {
    name: "内在镜像",
    wordmark: "INNER MIRROR",
  },
  locale: {
    label: "界面语言",
    zhCN: "中文",
    en: "English",
  },
  nav: {
    skipToContent: "跳到主要内容",
    primary: "主导航",
    now: "此刻",
    mirror: "镜像",
    journey: "旅程",
    newReflection: "新的反思",
    search: "搜索",
    memoryPrivacy: "记忆与隐私",
    settings: "设置",
  },
  shell: {
    demoMode: "演示模式",
    realApiConnected: "真实 API · 已连接",
    demoFallback: "演示回退",
    samplePerson: "示例人物",
    sampleHistory: "示例历史 · 不是你的",
    memoryPaused: "临时反思模式",
    memoryOn: "记忆已开启 · 由你决定留下什么",
  },
  onboarding: {
    screen0: {
      eyebrow: "一面生长的自我之镜",
      title: "你不是一份等待填完的档案。",
      body: "内在镜像会陪着你，在时间里慢慢成形。只有你亲自确认合适的东西，才会进入你的镜像。",
      begin: "开始",
    },
    screen1: {
      eyebrow: "它如何运作",
      title: "你的理解，只属于你。",
      steps: {
        express: { title: "你来表达", body: "从一个真实处境说起。" },
        notice: { title: "内在镜像会观察", body: "它寻找支撑它的线索，也留意那些对不上的地方。" },
        decide: { title: "由你决定什么合适", body: "接受、改写、补充背景，或者拒绝。" },
        change: { title: "你的镜像随之改变", body: "每一次修订都清晰可见。" },
      },
      continue: "继续",
    },
    screen2: {
      eyebrow: "从此刻开始",
      title: "现在，是什么把你带到了这里？",
      body: "选出此刻对你有用的选项就好。这不是在定义一个你。",
      reasons: {
        understand: "想更了解自己",
        change: "正面对一段变化",
        patterns: "想看清反复出现的模式",
        decisions: "想把决定想得更清楚",
        curious: "只是好奇",
      },
      continue: "继续",
      skip: "跳过",
      selected: "已选",
    },
    screen3: {
      eyebrow: "沟通方式",
      title: "你希望内在镜像如何回应你？",
      gentle: "温柔",
      direct: "直接",
      brief: "简洁",
      deep: "深入",
      practicalTitle: "给出可以落地的下一步",
      practicalBody: "只在它们对眼前的问题真正有用时。",
      toneAria: "回应语气：从温柔到直接",
      depthAria: "回应篇幅：从简洁到深入",
      practicalAria: "给出可以落地的下一步",
      continue: "继续",
    },
    screen4: {
      eyebrow: "选择一个起点",
      title: "从你自己的空白开始，或先看看示例。",
      body: "示例数据属于一个虚构的示例人物。它是示例历史——不是你选择、说过或确认过的内容。",
      emptyTitle: "从空白开始",
      emptyBody: "你的镜像从一张空白开始，没有任何保存过的历史。",
      sampleTitle: "载入示例镜像",
      sampleBody: "示例人物 · 示例历史 · 全程都有清晰标注。",
    },
    visual: {
      aria: "一面尚未完成、会随时间变化的抽象镜像",
      mirrorVoidTop: "尚未完整",
      mirrorVoidBottom: "这是有意为之",
    },
  },
  now: {
    titlePersonal: "此刻的你，在哪里？",
    titleExample: "看看一个示例镜像",
    supportPersonal: "这一页只由你选择保留的内容构成。",
    supportExample: "示例人物 · 示例历史。这里的任何内容都不会被算作你的。",
    supportEmpty: "你的镜像仍在成形。没有缺失，它只是有意从空白开始。",
    promptTitle: "现在，什么正占着你的心？",
    promptHelp: "从真实的事情开始，不需要说得很清楚。",
    promptPlaceholder: "想到什么，就怎么说。\n不必说清楚。",
    contextDecision: "一个决定",
    contextFeeling: "一种感受",
    contextRepeating: "某件事总在重复",
    contextExplore: "只是随便聊聊",
    reflectCta: "开始反思 →",
  },
  mirror: {
    titlePersonal: "一面活的自我模型",
    titleExample: "一个示例自我模型",
    supportPersonal: "事实、观察和解读彼此分开。每条解读都可以查看、修改或删除。",
    supportExample: "示例人物 · 示例历史。可以先体验机制，不用把这些内容当作自己的。",
    categoryAll: "全部",
    categoryMatters: "真正在乎的",
    categoryNeed: "真正需要的",
    categoryPatterns: "反复出现的模式",
    categoryTensions: "内在的拉扯",
    categoryBoundaries: "边界",
    categoryDirections: "方向",
    emptyTitle: "你的镜像仍在成形。",
    emptyBody: "它有意从不完整开始。当模式逐渐清晰，再由你决定把哪些理解留在这里。",
  },
  journey: {
    titlePersonal: "你的旅程",
    titleExample: "示例旅程",
    supportPersonal: "把你自报的状态，和你选择保留的修订放在一起对照。",
    supportExample: "示例人物 · 示例历史。自我状态与理解修订是两条分开的证据线。",
    emptyTitle: "此刻，还不必改变什么。",
    emptyBody: "当你理解自己的方式发生变化时，这个空间会替你记住这份不同。",
  },
  reflection: {
    startCta: "开始一次反思",
  },
};

export type Messages = typeof zhCN;

export const en: Messages = {
  brand: {
    name: "Inner Mirror",
    wordmark: "INNER MIRROR",
  },
  locale: {
    label: "Language",
    zhCN: "中文",
    en: "English",
  },
  nav: {
    skipToContent: "Skip to content",
    primary: "Primary navigation",
    now: "Now",
    mirror: "Mirror",
    journey: "Journey",
    newReflection: "New Reflection",
    search: "Search",
    memoryPrivacy: "Memory & Privacy",
    settings: "Settings",
  },
  shell: {
    demoMode: "DEMO MODE",
    realApiConnected: "REAL API · CONNECTED",
    demoFallback: "DEMO FALLBACK",
    samplePerson: "SAMPLE PERSON",
    sampleHistory: "Example history · not yours",
    memoryPaused: "Temporary reflection mode",
    memoryOn: "Memory is on · You decide what stays",
  },
  onboarding: {
    screen0: {
      eyebrow: "A living self model",
      title: "You are not a profile to complete.",
      body: "Inner Mirror develops with you over time. Nothing becomes part of your mirror unless you decide it fits.",
      begin: "Begin",
    },
    screen1: {
      eyebrow: "How it works",
      title: "Your understanding stays yours.",
      steps: {
        express: { title: "You express", body: "Start with a real situation." },
        notice: { title: "Inner Mirror notices", body: "It looks for support and what does not fit." },
        decide: { title: "You decide what fits", body: "Accept, rewrite, add context, or reject." },
        change: { title: "Your mirror changes", body: "Every revision remains visible." },
      },
      continue: "Continue",
    },
    screen2: {
      eyebrow: "Start with now",
      title: "What brings you here right now?",
      body: "Select any that feel useful. This does not define a profile.",
      reasons: {
        understand: "Understand myself better",
        change: "Navigate a change",
        patterns: "Make sense of recurring patterns",
        decisions: "Make decisions more clearly",
        curious: "Just curious",
      },
      continue: "Continue",
      skip: "Skip",
      selected: "Selected",
    },
    screen3: {
      eyebrow: "Communication",
      title: "How should Inner Mirror respond?",
      gentle: "Gentle",
      direct: "Direct",
      brief: "Brief",
      deep: "Deep",
      practicalTitle: "Offer practical next steps",
      practicalBody: "Only when they are useful to the current problem.",
      toneAria: "Response tone from gentle to direct",
      depthAria: "Response depth from brief to deep",
      practicalAria: "Offer practical next steps",
      continue: "Continue",
    },
    screen4: {
      eyebrow: "Choose a starting point",
      title: "Start with your own blank space, or look around an example.",
      body: "Sample data belongs to a fictional sample person. It is example history—not something you chose, said, or confirmed.",
      emptyTitle: "Start empty",
      emptyBody: "Your mirror begins incomplete, with no saved history.",
      sampleTitle: "Load sample mirror",
      sampleBody: "Sample person · Example history · Clearly labelled throughout.",
    },
    visual: {
      aria: "An incomplete abstract mirror that can change over time",
      mirrorVoidTop: "not complete",
      mirrorVoidBottom: "on purpose",
    },
  },
  now: {
    titlePersonal: "Where you are now",
    titleExample: "Explore an example mirror",
    supportPersonal: "A current view, built only from what you chose to keep.",
    supportExample: "Sample person · Example history. Nothing here is attributed to you.",
    supportEmpty: "Your mirror is still forming. Nothing is missing; it starts incomplete on purpose.",
    promptTitle: "What's taking up space in your mind?",
    promptHelp: "Start with the real thing. It does not need to sound clear yet.",
    promptPlaceholder: "Say it however it comes.\nIt doesn't need to be clear yet.",
    contextDecision: "A decision",
    contextFeeling: "A feeling",
    contextRepeating: "Something keeps repeating",
    contextExplore: "Just explore",
    reflectCta: "Reflect →",
  },
  mirror: {
    titlePersonal: "A living model you own",
    titleExample: "An example living model",
    supportPersonal: "Facts, observations, and interpretations stay distinct. Every interpretation can be inspected, changed, or removed.",
    supportExample: "Sample person · Example history. Explore the mechanics without treating this material as yours.",
    categoryAll: "All",
    categoryMatters: "What matters",
    categoryNeed: "What I need",
    categoryPatterns: "Patterns",
    categoryTensions: "Tensions",
    categoryBoundaries: "Boundaries",
    categoryDirections: "Directions",
    emptyTitle: "Your mirror is still forming.",
    emptyBody: "It starts incomplete on purpose. As patterns become clearer, you decide what belongs here.",
  },
  journey: {
    titlePersonal: "Your Journey",
    titleExample: "Example Journey",
    supportPersonal: "See self-reported state beside the revisions you chose to keep.",
    supportExample: "Sample person · Example history · State and understanding remain separate evidence tracks.",
    emptyTitle: "Nothing has to change yet.",
    emptyBody: "When the way you understand yourself shifts, this space will remember the difference.",
  },
  reflection: {
    startCta: "Start a reflection",
  },
};

export const messages: Record<Locale, Messages> = {
  "zh-CN": zhCN,
  en,
};

/** Union of every leaf string path, e.g. "nav.now" | "shell.memoryOn". */
export type MessageKey = LeafKeys<Messages>;

type LeafKeys<T> = {
  [K in Extract<keyof T, string>]: T[K] extends string
    ? K
    : T[K] extends object
      ? `${K}.${LeafKeys<T[K]>}`
      : never;
}[Extract<keyof T, string>];
