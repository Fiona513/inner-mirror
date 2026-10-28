import type { Locale } from "./messages";

const copy = {
  en: {
    common: { save: "Save", cancel: "Cancel", edit: "Edit", forget: "Forget", archive: "Archive", open: "Open", none: "none", saved: "Saved on this device", current: "Current", earlier: "Earlier", now: "Now", selfReported: "Self-reported" },
    reflection: {
      unavailableTitle: "This reflection is not available.", unavailableBody: "It may have been cleared from this device.", returnNow: "Return to Now",
      safetyFirst: "Safety first", pause: "Pause the reflection", safetyTitle: "I'm concerned you may not be safe right now.", safetyBody: "This is not the moment for Inner Mirror to interpret what this says about you. Please contact local emergency services or a crisis line where you are, or tell someone you trust who can stay with you.", safetyImmediate: "If there is immediate danger, move away from anything you could use to hurt yourself and call emergency services now.", leave: "Leave this reflection",
      progress: "Reflection progress", temporary: "Temporary reflection mode · Nothing from this session will enter long-term memory.", source: "What brought you here",
      listenIndex: "01 · Listen", listenTitle: "Let's stay with the current situation first.", listenBody: "I will not turn this into a claim about who you are. First, we can separate what happened from what the situation has started to mean.", listenCta: "Find the central tension", connecting: "Connecting this with retained context…",
      clarifyIndex: "02 · One useful question", structureIndex: "03 · Editable structure", structureTitle: "Here is one way to separate the situation.", structureBody: "These are working notes, not facts about you. Change anything that misses.", reality: "Reality", realityHelp: "What is actually happening", expectation: "Expectation", expectationHelp: "What others or the situation may expect", selfDoubt: "Self-doubt", selfDoubtHelp: "What you are questioning", useStructure: "Use this structure", selectingCanvas: "Selecting the next canvas…",
      exploreIndex: "04 · Explore", exploreTitle: "Look at the relation, not a score.", exploreBody: "Use the view that makes this situation easier to work with.", tension: "Tension", perspective: "Perspective", unsaid: "Unsaid", previous: "Previous", currentMarker: "Current", leftMatters: "tends to matter more when", different: "What's different this time?", tentative: "tentative · editable", think: "What I think", feel: "What I feel", fear: "What I fear", want: "What I want", unsaidQuestion: "What would you say if you didn't have to manage their reaction?", keepPrivate: "Keep private", keepPrivateHelp: "The full text will not be added to your Self Model.", keepPrivateAria: "Keep the unsaid text private", bringBack: "Bring this back to the situation", keepingView: "Keeping the current problem in view…",
      resolveIndex: "05 · Current problem first", resolveTitle: "What would make the next step more honest and workable?", resolveBody: "This does not need to solve everything. It should give you new information about the actual situation.", nextStep: "A next step you can revise", lookPattern: "Look for a possible pattern", checking: "Checking support and counter-signals…", enough: "This is enough for now",
      candidateIndex: "06 · Candidate understanding", noticing: "Something I may be noticing", supporting: "supporting moments", complicating: "that complicate it", why: "Show me why →", applies: "When does this seem true?", notApplies: "When doesn't it seem true?", keepContext: "Keep with this context", rewritePrompt: "Rewrite it in words that belong to you", keepVersion: "Keep my version", fits: "This fits", someSituations: "Only in some situations", notQuite: "Not quite", rewrite: "Rewrite", disagree: "I don't agree", noContextTitle: "There is not enough retained context to say something useful yet.", noContextBody: "This reflection can still end here. Your mirror does not need an insight from every session.", finishNoMirror: "Finish without adding to Mirror",
      notAdded: "Not added", complete: "Reflection complete", mirrorChanged: "Your mirror changed", rejectedTitle: "Got it. I won't treat this as part of your mirror.", resolvedTitle: "This session helped with the current issue. It does not need to become a self-understanding.", acceptedTitle: "You decided what was worth keeping.", temporaryDone: "Temporary mode kept this reflection out of long-term memory.", rejectedBody: "The rejection is saved so this interpretation will not be reused as personalization context.", resolvedBody: "No interpretation was added. The current issue can be complete without changing your mirror.", acceptedBody: "The decision and its evidence are saved locally. You can still edit or archive it later.", reviewRejected: "Review rejected interpretations", openMirror: "Open Mirror", seeChanged: "See what changed",
      trace: "Agent trace · acceptance only", currentState: "Current state", component: "Selected component", retrieved: "Retrieved source IDs", rejectedIds: "Excluded rejected IDs", archivedIds: "Excluded archived IDs", validation: "Schema validation", persistence: "Persistence action",
    },
    newReflection: { eyebrow: "New reflection", title: "Start with the real situation", support: "The current problem comes first. A self-understanding is optional, and nothing enters your mirror without your decision.", temporary: "Temporary reflection mode · This session will not update long-term memory.", happening: "What is happening?", placeholder: "Say it in the words you already have.", contextLabel: "Context, not a category", begin: "Begin reflection →" },
    contexts: {
      decision: ["A decision", "Two or more directions matter."], feeling: ["A feeling", "Something happened and it is still present."], repeating: ["Something keeps repeating", "A familiar tension has returned."], explore: ["Just explore", "You do not need a category yet."],
    },
    evidence: { closeDrawer: "Close evidence drawer", close: "Close evidence", eyebrow: "Evidence", title: "Why I noticed this", supporting: "Signals that support it", counter: "Signals that complicate it", hypothesis: "My current hypothesis", note: "This is an interpretation, not a fact. You can edit or reject it.", empty: "No retained signal is available here yet." },
    snapshot: { add: "+ Add a self-reported state snapshot", optional: "Self-reported · optional", title: "How does this feel right now?", save: "Save snapshot", skip: "Skip", edit: "Edit", remove: "Remove snapshot", pressure: "Pressure", clarity: "Clarity", low: "Low", high: "High", unclear: "Unclear", clear: "Clear", ofFive: "of 5" },
    search: { eyebrow: "Search", title: "Find retained context", support: "Search titles, understandings, context boundaries, directions, revisions, facts, observations, and retained reflections.", label: "Search your mirror", placeholder: "Try “validation”, “school”, or “boundary”", noneTitle: "No retained context matches this search.", noneBody: "Forgotten, archived, and rejected material is not returned as an active result.", prompt: "Search is intentionally simple. It does not infer new patterns from your query." },
    settings: { eyebrow: "Settings", title: "How Inner Mirror responds", support: "Adjust the way reflections are worded. This changes communication, not what the system treats as evidence.", gentle: "Gentle", direct: "Direct", brief: "Brief", deep: "Deep", practical: "Practical suggestions", practicalHelp: "Offer a next step when it helps the current issue.", notes: "Anything Inner Mirror should know about how you prefer to communicate?", notesPlaceholder: "For example: be concise when I'm overwhelmed.", save: "Save preferences", mode: "Experience mode", demo: "Demo mode", real: "Real API mode", fallback: "Demo fallback", modeBody: "Demo mode uses realistic local history and deterministic responses. Real mode calls the controlled Agent endpoint; the status below reports whether model-backed copy is actually available.", connected: "Connected", fallingBack: "Falling back", unavailable: "Unavailable", connectedBody: "The structured Agent endpoint and model-backed copy are available.", fallbackBody: "The endpoint is available, but the deterministic Demo fallback is producing the response.", unavailableBody: "The Agent endpoint could not be reached. Reflections will use the Demo fallback.", reset: "Reset demo data" },
    privacy: { eyebrow: "Memory & Privacy", title: "You choose what can be remembered", support: "Facts can be remembered. Observations can be challenged. Interpretations never become identity facts.", longTerm: "Long-term memory", paused: "Paused", on: "On", pausedBody: "New reflections work normally, but do not update your long-term mirror.", onBody: "Only retained information can be used in future reflection retrieval.", off: "OFF", onSwitch: "ON", shared: "What you've shared", facts: "Facts", factsHelp: "Reality you explicitly shared. These can be edited or forgotten.", noticed: "What the system has noticed", observations: "Observations", observationsHelp: "Descriptive patterns in retained sessions, not claims about who you are.", mirrorUnderstands: "How your mirror currently understands you", interpretations: "Interpretations", interpretationsHelp: "User-owned hypotheses. They can be inspected, rewritten, contextualized, or archived.", sourceReflections: "source reflections", challenged: "challenged", observation: "observation", challenge: "Challenge", challengedAction: "Challenged", interpretation: "interpretation", rejected: "Rejected interpretations", rejectedHelp: "What Inner Mirror must not quietly reuse", rejectedLabel: "Rejected" },
  },
  "zh-CN": {
    common: { save: "保存", cancel: "取消", edit: "编辑", forget: "忘记", archive: "归档", open: "打开", none: "无", saved: "已保存在此设备", current: "当前", earlier: "较早", now: "现在", selfReported: "用户自述" },
    reflection: {
      unavailableTitle: "这次反思已不可用。", unavailableBody: "它可能已从这台设备中清除。", returnNow: "返回此刻",
      safetyFirst: "安全优先", pause: "先暂停反思", safetyTitle: "我担心你现在可能并不安全。", safetyBody: "现在不适合让内在镜像解读这说明了什么。请联系你所在地区的紧急服务或危机援助热线，或告诉一位能陪在你身边、值得信任的人。", safetyImmediate: "如果你正面临即时危险，请远离任何可能伤害自己的物品，并立即联系紧急服务。", leave: "离开这次反思",
      progress: "反思进度", temporary: "临时反思模式 · 本次内容不会进入长期记忆。", source: "是什么把你带到这里",
      listenIndex: "01 · 倾听", listenTitle: "先和眼前的处境待在一起。", listenBody: "我不会急着把它变成关于“你是谁”的结论。先把已经发生的事，和它逐渐带来的含义分开。", listenCta: "看看核心拉扯", connecting: "正在与保留的线索建立联系…",
      clarifyIndex: "02 · 一个有用的问题", structureIndex: "03 · 可编辑的整理", structureTitle: "可以先这样拆开眼前的处境。", structureBody: "这些只是工作笔记，不是关于你的事实。哪里不贴合，都可以修改。", reality: "现实", realityHelp: "实际正在发生什么", expectation: "期待", expectationHelp: "他人或处境可能期待什么", selfDoubt: "自我怀疑", selfDoubtHelp: "你正在质疑什么", useStructure: "使用这份整理", selectingCanvas: "正在选择下一种呈现…",
      exploreIndex: "04 · 探索", exploreTitle: "看关系，而不是分数。", exploreBody: "选择一种能让眼前处境更容易被看清的方式。", tension: "拉扯", perspective: "视角", unsaid: "未说出口", previous: "上一次", currentMarker: "现在", leftMatters: "更重要的时候", different: "这一次有什么不同？", tentative: "暂时的 · 可编辑", think: "我怎么想", feel: "我怎么感受", fear: "我在担心什么", want: "我想要什么", unsaidQuestion: "如果不用顾虑对方的反应，你会说什么？", keepPrivate: "保持私密", keepPrivateHelp: "完整内容不会加入你的自我模型。", keepPrivateAria: "将未说出口的内容保持私密", bringBack: "回到眼前的处境", keepingView: "正在把眼前的问题保留在视野中…",
      resolveIndex: "05 · 先处理眼前的问题", resolveTitle: "怎样的下一步，会更诚实，也更可行？", resolveBody: "它不需要解决一切，只要能让你对真实处境多获得一点信息。", nextStep: "一个仍可修改的下一步", lookPattern: "看看是否有一种可能的模式", checking: "正在核对支撑线索与反向线索…", enough: "到这里已经足够",
      candidateIndex: "06 · 候选理解", noticing: "我可能注意到了一件事", supporting: "条支撑线索", complicating: "条让它变得复杂的线索", why: "为什么会这样 →", applies: "它在什么情况下更贴近？", notApplies: "它在什么情况下并不贴近？", keepContext: "带着这些情境保留", rewritePrompt: "用真正属于你的话重写", keepVersion: "保留我的版本", fits: "很贴近", someSituations: "只在某些情况下", notQuite: "不太贴近", rewrite: "重写", disagree: "我不同意", noContextTitle: "目前还没有足够的保留线索，形成有用的理解。", noContextBody: "这次反思仍然可以在这里结束。不是每一次都必须为镜像增加一条洞察。", finishNoMirror: "结束，但不加入镜像",
      notAdded: "未加入", complete: "反思完成", mirrorChanged: "你的镜像发生了变化", rejectedTitle: "明白了。我不会把这份理解当成你的一部分。", resolvedTitle: "这次反思已经帮助了眼前的问题，它不必变成一条自我理解。", acceptedTitle: "你决定了什么值得留下。", temporaryDone: "临时模式让这次反思没有进入长期记忆。", rejectedBody: "这次拒绝会被保存，之后不会再把这份解读当作个性化依据。", resolvedBody: "没有加入新的解读。眼前的问题可以完成，而你的镜像不必改变。", acceptedBody: "你的决定与相关线索已保存在本地，之后仍可编辑或归档。", reviewRejected: "查看已拒绝的解读", openMirror: "打开镜像", seeChanged: "看看发生了什么变化",
      trace: "Agent 轨迹 · 仅供验收", currentState: "当前状态", component: "选中的组件", retrieved: "检索到的来源 ID", rejectedIds: "排除的已拒绝 ID", archivedIds: "排除的已归档 ID", validation: "结构校验", persistence: "保存动作",
    },
    newReflection: { eyebrow: "新的反思", title: "从真实处境开始", support: "先处理眼前的问题。是否形成自我理解并不强制，任何内容都要由你决定，才会进入镜像。", temporary: "临时反思模式 · 本次内容不会更新长期记忆。", happening: "正在发生什么？", placeholder: "就用你现在已有的话来说。", contextLabel: "情境，而不是分类", begin: "开始反思 →" },
    contexts: {
      decision: ["一个决定", "有两个或更多方向都很重要。"], feeling: ["一种感受", "事情已经发生，但感受仍留在这里。"], repeating: ["某件事总在重复", "一种熟悉的拉扯又出现了。"], explore: ["只是探索", "你还不需要先给它分类。"],
    },
    evidence: { closeDrawer: "关闭证据抽屉", close: "关闭证据", eyebrow: "证据", title: "我为什么注意到它", supporting: "支撑它的线索", counter: "让它变得复杂的线索", hypothesis: "我目前的假设", note: "这是一种解读，不是事实。你可以编辑或拒绝它。", empty: "这里暂时还没有可保留的线索。" },
    snapshot: { add: "＋ 记录一份当前状态", optional: "用户自述 · 可选", title: "此刻感觉怎么样？", save: "保存状态", skip: "跳过", edit: "编辑", remove: "移除状态", pressure: "压力", clarity: "清晰度", low: "低", high: "高", unclear: "模糊", clear: "清楚", ofFive: "满分 5" },
    search: { eyebrow: "搜索", title: "查找保留的内容", support: "可以搜索标题、理解、适用情境、方向、修订、事实、观察和保留的反思。", label: "搜索你的镜像", placeholder: "试试“认可”“学校”或“边界”", noneTitle: "没有找到相符的保留内容。", noneBody: "已忘记、已归档或已拒绝的内容不会作为有效结果返回。", prompt: "搜索保持简单。它不会根据你的查询推断新的模式。" },
    settings: { eyebrow: "设置", title: "内在镜像如何回应你", support: "调整反思的表达方式。这只会改变沟通，不会改变系统把什么视为证据。", gentle: "温柔", direct: "直接", brief: "简洁", deep: "深入", practical: "可落地的建议", practicalHelp: "只在有助于眼前问题时，给出下一步。", notes: "关于你偏好的沟通方式，还有什么需要让内在镜像知道？", notesPlaceholder: "例如：当我感到不堪重负时，请尽量简洁。", save: "保存偏好", mode: "体验模式", demo: "演示模式", real: "真实 API 模式", fallback: "演示回退", modeBody: "演示模式使用本地示例历史与确定性回应；真实模式会调用受控的 Agent 接口。下方状态会说明模型文案是否真的可用。", connected: "已连接", fallingBack: "正在回退", unavailable: "不可用", connectedBody: "结构化 Agent 接口与模型生成文案均可用。", fallbackBody: "接口可用，但当前回应由确定性的演示回退生成。", unavailableBody: "无法连接 Agent 接口，反思将使用演示回退。", reset: "重置演示数据" },
    privacy: { eyebrow: "记忆与隐私", title: "由你决定什么可以被记住", support: "事实可以被记住，观察可以被质疑，解读永远不会成为身份事实。", longTerm: "长期记忆", paused: "已暂停", on: "已开启", pausedBody: "新的反思仍可正常进行，但不会更新长期镜像。", onBody: "只有被保留的内容，才能在未来反思中被检索。", off: "关", onSwitch: "开", shared: "你分享过的内容", facts: "事实", factsHelp: "你明确分享过的现实。可以编辑或忘记。", noticed: "系统注意到的内容", observations: "观察", observationsHelp: "保留反思中的描述性模式，而不是关于“你是谁”的断言。", mirrorUnderstands: "你的镜像目前如何理解你", interpretations: "解读", interpretationsHelp: "由用户拥有的假设，可以查看、改写、补充情境或归档。", sourceReflections: "次来源反思", challenged: "已质疑", observation: "观察", challenge: "质疑", challengedAction: "已质疑", interpretation: "解读", rejected: "已拒绝的解读", rejectedHelp: "内在镜像不应悄悄再次使用的内容", rejectedLabel: "已拒绝" },
  },
} as const;

export type LivingCopy = (typeof copy)["en"];

export function getLivingCopy(locale: Locale): LivingCopy {
  return copy[locale] as LivingCopy;
}

export function formatLivingDate(locale: Locale, value: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale === "zh-CN" ? "zh-CN" : "en", options).format(new Date(value));
}

export function labelEnum(locale: Locale, value: string): string {
  if (locale === "en") return value.replaceAll("_", " ");
  const labels: Record<string, string> = {
    decision: "决定", feeling: "感受", repeating: "反复出现", explore: "自由探索",
    tensions: "内在拉扯", what_i_need: "真正需要的", patterns: "反复模式", boundaries: "边界", directions: "方向",
    user_confirmed: "用户确认", context_dependent: "依情境成立", recurring_signal: "反复信号", single_signal: "单次信号", changing: "正在变化", disputed: "有争议", archived: "已归档",
    reflection: "反思", observation: "观察", fact: "事实", direction: "方向", revision: "修订", retained_reflection: "保留的反思",
    new_understanding: "新的理解", refined_understanding: "理解已细化", understanding_changed: "理解发生变化", still_matters: "仍然重要",
  };
  return labels[value] ?? value;
}

const zhSystemText: Record<string, string> = {
  "You refined an understanding": "你细化了一份理解",
  "A new understanding entered your mirror": "一份新的理解进入了你的镜像",
  "You kept the pattern and made its boundaries explicit.": "你保留了这份模式，也明确了它的适用边界。",
  "You decided this was useful enough to keep, without making it a fixed identity.": "你决定保留这份有用的理解，但没有把它变成固定身份。",
  "You rewrote an understanding": "你重写了一份理解",
  "The wording now belongs more clearly to you.": "现在的表达更真正属于你。",
  "Context made more specific": "适用情境变得更具体",
  "You made the context more precise": "你让适用情境变得更准确",
  "The understanding now includes where it does and does not fit.": "这份理解现在同时说明了它适用和不适用的地方。",
  "You confirmed that an understanding has changed": "你确认了一份理解已经发生变化",
  "New and counter evidence remain attached to the updated understanding.": "新的支撑与反向线索仍然附在更新后的理解上。",
  "An understanding no longer fits in the same way": "一份理解已经不再以同样的方式贴近",
  "You marked this as something that used to fit.": "你把它标记为过去曾经贴近的内容。",
  "A direction changed": "一个方向发生了变化",
  "decision · current reflection": "决定 · 当前反思",
  "feeling · current reflection": "感受 · 当前反思",
  "repeating · current reflection": "反复出现 · 当前反思",
  "explore · current reflection": "自由探索 · 当前反思",
};

export function localizeSystemText(value: string, locale: Locale): string {
  return locale === "zh-CN" ? (zhSystemText[value] ?? value) : value;
}
