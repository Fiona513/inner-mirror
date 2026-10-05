export const rankingKeys = [
  "certainty",
  "agency",
  "performance",
  "evaluation",
  "avoid",
] as const;

export type RankingKey = (typeof rankingKeys)[number];

export const rankingLabels: Record<RankingKey, string> = {
  certainty: "至少知道什么时候会有结果",
  agency: "至少还有一件我现在能做的事",
  performance: "就算结果不好，也不代表我当时做得很差",
  evaluation: "先不去想别人会怎么看我",
  avoid: "让我先别一直想着这件事",
};

export const directionNeedLabels: Record<string, string> = {
  uncertainty: "一点可以落下来的确定感",
  control: "重新拥有可以行动的位置",
  fear_of_error: "保留对自己判断的信任",
  self_evaluation: "不让结果接管这次自我评价",
  external_evaluation: "让他人的评价暂时退后",
};

export function rankingLabel(key: string) {
  return rankingLabels[key as RankingKey] ?? "尚未命名的需要";
}

export function rankingMoveLabel(direction: "up" | "down", key: string) {
  return `${direction === "up" ? "上移" : "下移"}「${rankingLabel(key)}」`;
}

export function directionNeedLabel(hypothesisId?: string) {
  if (!hypothesisId) return "还需要更多线索";
  return directionNeedLabels[hypothesisId] ?? "还需要更多线索";
}
