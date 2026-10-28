import type {
  ExplorationFeelingId,
  ExplorationNeedId,
  ReturnChangeId,
  TodayReasonId,
} from "./types.ts";

export interface ChoiceDefinition<T extends string> {
  id: T;
  label: string;
  support?: string;
}

export interface ReasonDefinition extends ChoiceDefinition<TodayReasonId> {
  firstValue: string;
  correctedValue: string;
  fragmentObservation: string;
}

export const TODAY_REASONS: ReasonDefinition[] = [
  {
    id: "confused",
    label: "最近有点迷茫",
    firstValue: "你现在可能不是完全没有方向，而是几种在意的事同时靠得很近，还没有哪一种足够清楚。",
    correctedValue: "“迷茫”也许还没有说中你。现在先不解释，只记下：你愿意停下来看看自己在哪里。",
    fragmentObservation: "我发现自己最近并不是完全没有方向，而是几个重要的东西同时存在，还没有一个足够清晰。",
  },
  {
    id: "curious",
    label: "想更了解自己",
    firstValue: "你今天带来的不一定是一个必须解决的问题，也可能只是一点想观察自己的好奇。它同样值得被留下。",
    correctedValue: "好奇不一定需要马上指向答案。先把这次停留留在这里，别急着定义它。",
    fragmentObservation: "我今天没有急着解决一个问题，只是认真停下来观察了自己一会儿。",
  },
  {
    id: "stuck",
    label: "有件事情一直困扰我",
    firstValue: "这件事会反复回来，可能不是因为你还没想过，而是它仍占着你的一部分注意力。",
    correctedValue: "刚才那种解释还不够贴近。先只记下：有一件事正在反复占据你的注意力。",
    fragmentObservation: "有一件事最近反复回到我的注意里，我还没有准备好把它变成答案。",
  },
  {
    id: "changed",
    label: "感觉自己最近有点不一样",
    firstValue: "你已经注意到“最近和以前不太一样”。变化还不必被说清，这份察觉本身就是第一块线索。",
    correctedValue: "我们先不替这份“不一样”加上含义，只把你已经察觉到变化这件事留下。",
    fragmentObservation: "我已经注意到最近和以前有点不一样，但现在还不需要替这份变化命名。",
  },
  {
    id: "others_first",
    label: "最近总在顾及别人",
    firstValue: "你最近也许常把别人的位置放在前面，以至于自己的感受要晚一点才出现。",
    correctedValue: "“自己的感受出现得更晚”也许不贴近。先只留下你说的：最近常在顾及别人。",
    fragmentObservation: "我发现自己最近常先顾及别人，而自己的感受往往要晚一点才出现。",
  },
  {
    id: "browsing",
    label: "只是随便看看",
    firstValue: "你不需要先有一个问题。今天愿意停下来看看，本身就是一条很轻的线索。",
    correctedValue: "这次也可以什么都不说明。你只是来过、看了看，这已经足够。",
    fragmentObservation: "我今天没有带着明确的问题，只是给自己留了一次停下来看看的机会。",
  },
  {
    id: "unknown",
    label: "我也不知道",
    firstValue: "暂时说不清为什么来，也可能只是有些东西还没形成语言。现在不需要急着把它变成答案。",
    correctedValue: "那就不替“不知道”增加解释。它可以原样留在这里，不必马上变成答案。",
    fragmentObservation: "我现在仍然说不清为什么来到这里，但这份不知道可以先被保留下来。",
  },
];

export const EXPLORATION_FEELINGS: ChoiceDefinition<ExplorationFeelingId>[] = [
  { id: "rushing", label: "一直在赶路" },
  { id: "effort_without_meaning", label: "做了很多，却说不清为什么" },
  { id: "others_before_me", label: "总是先想到别人" },
  { id: "quiet_change", label: "只是觉得哪里变了" },
  { id: "nothing_obvious", label: "好像没有明显问题" },
  { id: "hard_to_name", label: "说不上来" },
];

export const EXPLORATION_NEEDS: ChoiceDefinition<ExplorationNeedId>[] = [
  { id: "unhurried_space", label: "给自己一点不被催促的空间" },
  { id: "clearer_attention", label: "看清哪件事更值得在意" },
  { id: "my_own_position", label: "先听见自己的位置" },
  { id: "loosen_attention", label: "让注意力从这件事上松开一点" },
  { id: "keep_observing", label: "先继续观察，不急着解释" },
  { id: "not_sure_yet", label: "现在还不知道" },
];

const EXPLORATION_BRANCH_OPTIONS: Record<ExplorationFeelingId, ChoiceDefinition<ExplorationNeedId>[]> = {
  rushing: [
    { id: "unhurried_space", label: "时间总像是不够用" },
    { id: "clearer_attention", label: "每件事都像很急" },
    { id: "my_own_position", label: "很难停下来听见自己" },
    { id: "keep_observing", label: "一停下来反而不习惯" },
    { id: "not_sure_yet", label: "我还不确定" },
  ],
  effort_without_meaning: [
    { id: "clearer_attention", label: "事情很多，但轻重变得模糊" },
    { id: "loosen_attention", label: "做完以后仍然放不下" },
    { id: "my_own_position", label: "很少问自己为什么要做" },
    { id: "keep_observing", label: "只是惯性地继续" },
    { id: "not_sure_yet", label: "我还不确定" },
  ],
  others_before_me: [
    { id: "my_own_position", label: "做决定的时候" },
    { id: "clearer_attention", label: "关系里" },
    { id: "unhurried_space", label: "工作或学习里" },
    { id: "keep_observing", label: "很多时候都会" },
    { id: "not_sure_yet", label: "我还不确定" },
  ],
  quiet_change: [
    { id: "keep_observing", label: "对以前在意的事不太一样了" },
    { id: "my_own_position", label: "更想听见自己的想法" },
    { id: "loosen_attention", label: "有些东西正在慢慢放下" },
    { id: "clearer_attention", label: "开始在意新的事情" },
    { id: "not_sure_yet", label: "还说不上具体哪里" },
  ],
  nothing_obvious: [
    { id: "keep_observing", label: "只是想留意一下自己" },
    { id: "unhurried_space", label: "最近很少真正停下来" },
    { id: "clearer_attention", label: "想知道注意力都去了哪里" },
    { id: "loosen_attention", label: "没有什么需要马上解决" },
    { id: "not_sure_yet", label: "现在还不知道" },
  ],
  hard_to_name: [
    { id: "keep_observing", label: "先让它保持模糊" },
    { id: "unhurried_space", label: "给它一点不被催促的空间" },
    { id: "loosen_attention", label: "先不继续追问" },
    { id: "my_own_position", label: "只确认它确实存在" },
    { id: "not_sure_yet", label: "还是不知道" },
  ],
};

export const RETURN_CHANGES: ChoiceDefinition<ReturnChangeId>[] = [
  { id: "more", label: "更明显了" },
  { id: "same", label: "差不多" },
  { id: "less", label: "少了一点" },
  { id: "not_today", label: "今天不想聊这个" },
];

export function getReason(reasonId?: TodayReasonId) {
  return TODAY_REASONS.find((item) => item.id === reasonId);
}

export function getFeeling(feelingId?: string) {
  return EXPLORATION_FEELINGS.find((item) => item.id === feelingId);
}

export function getNeed(needId?: string) {
  return EXPLORATION_NEEDS.find((item) => item.id === needId);
}

export function getExplorationNeedOptions(feelingId?: ExplorationFeelingId) {
  return feelingId ? EXPLORATION_BRANCH_OPTIONS[feelingId] : EXPLORATION_NEEDS;
}

export function feelingObservation(feelingId?: ExplorationFeelingId) {
  switch (feelingId) {
    case "rushing":
      return "这条线索更像是节奏一直在推着你，而不只是事情很多。";
    case "effort_without_meaning":
      return "做了很多和知道什么重要，最近可能没有完全站在一起。";
    case "others_before_me":
      return "这次先不判断对错，只看看自己的位置通常在哪里变得靠后。";
    case "quiet_change":
      return "变化已经被你察觉，但它还不需要马上得到解释。";
    case "nothing_obvious":
      return "没有明显问题也可以继续，观察并不一定要从困扰开始。";
    default:
      return "说不上来也是有效信号；下一步只需要看看它通常出现在哪里。";
  }
}

export function getReturnChange(changeId?: string) {
  return RETURN_CHANGES.find((item) => item.id === changeId);
}

export function explorationQuestion(reasonId?: TodayReasonId) {
  switch (reasonId) {
    case "others_first":
      return "最近这些时刻里，哪一种感觉出现得更多？";
    case "stuck":
      return "当那件事又回到脑海里时，哪一种更接近？";
    case "changed":
      return "你最先察觉到的变化，更接近哪一种？";
    case "browsing":
    case "unknown":
      return "如果只再靠近一点，此刻哪一种比较像？";
    default:
      return "最近哪一种感觉出现得更多？";
  }
}

export function needQuestion(feelingId?: ExplorationFeelingId) {
  switch (feelingId) {
    case "others_before_me":
      return "如果先不处理别人的需要，你想把哪一点留给自己？";
    case "rushing":
      return "如果今天不用再加速，你更想先得到什么？";
    case "effort_without_meaning":
      return "如果只让一件事清楚一点，你更想看见什么？";
    case "nothing_obvious":
    case "hard_to_name":
      return "不用把它说清。你愿意先为哪一种可能留一点位置？";
    default:
      return "顺着刚才那一点，你更想先照顾什么？";
  }
}

export function returnObservation(changeId: Exclude<ReturnChangeId, "not_today">, previous: string) {
  const shortPrevious = previous.replace(/[。！？]$/u, "");
  if (changeId === "more") {
    return `上次留下的那条线索今天更明显了。先不把它当成规律，只记下：${shortPrevious}，这一次又出现了一点。`;
  }
  if (changeId === "less") {
    return "它今天少了一点。变化本身也是线索，说明上次的观察不需要被固定下来。";
  }
  return "它今天仍在，但“差不多”不等于没有变化。我们先把这份连续性留在这里。";
}

export function composeFragmentObservation(
  reasonId: TodayReasonId,
  feelingId?: ExplorationFeelingId,
  needId?: ExplorationNeedId,
  firstValue?: string,
) {
  const reason = getReason(reasonId);
  if (!feelingId || !needId) {
    if (firstValue && firstValue !== reason?.firstValue) return firstValue;
    return reason?.fragmentObservation ?? "我今天留下了一块还没有名字的线索。";
  }

  if (feelingId === "others_before_me" && needId === "my_own_position") {
    return "我未必没有自己的位置，只是它常在顾及完别人以后才出现。";
  }
  if (feelingId === "rushing" && needId === "unhurried_space") {
    return "我现在需要的可能不是更快决定，而是先有一个不被催促的位置。";
  }
  if (feelingId === "effort_without_meaning" && needId === "clearer_attention") {
    return "我开始注意到，忙碌和重要并不总是同一件事。";
  }
  if (feelingId === "quiet_change" && needId === "keep_observing") {
    return "我已经察觉到变化，却还不需要立刻定义它；先保留这个差异可能更诚实。";
  }
  if (feelingId === "nothing_obvious") {
    return "今天没有明显问题需要解决，我只是主动停下来观察了自己一会儿。";
  }
  if (feelingId === "hard_to_name" || needId === "not_sure_yet") {
    return "我今天仍然说不上来，但愿意给这份还没有名字的感受一点位置。";
  }
  if (needId === "loosen_attention") {
    return "我此刻更需要的也许不是继续想明白，而是先让注意力松开一点。";
  }
  if (needId === "my_own_position") {
    return "我今天为自己的位置留了一点空间，没有让它继续被其他声音完全盖住。";
  }
  if (needId === "clearer_attention") {
    return "比起一次把自己说清，我现在更想分辨什么值得继续在意。";
  }
  if (needId === "unhurried_space") {
    return "有些感受并不需要马上解决，它们先需要一个不被催促的位置。";
  }
  return "今天没有形成固定答案，我只是把一件正在发生的事看得比刚才清楚了一点。";
}
