import type { MbtiType } from "./types.ts";

export const MBTI_TYPES: MbtiType[] = [
  "ENFJ", "ENFP", "ENTJ", "ENTP",
  "ESFJ", "ESFP", "ESTJ", "ESTP",
  "INFJ", "INFP", "INTJ", "INTP",
  "ISFJ", "ISFP", "ISTJ", "ISTP",
];

export interface ThinkingStyle {
  type: MbtiType;
  informationFocus: "concrete" | "patterns";
  decisionFocus: "logic" | "values";
  reflectionPace: "outward" | "inward";
  closureStyle: "structured" | "open";
  summary: string;
}

export function getThinkingStyle(type?: MbtiType): ThinkingStyle | undefined {
  if (!type) return undefined;
  const informationFocus = type[1] === "S" ? "concrete" : "patterns";
  const decisionFocus = type[2] === "T" ? "logic" : "values";
  const reflectionPace = type[0] === "E" ? "outward" : "inward";
  const closureStyle = type[3] === "J" ? "structured" : "open";

  const informationCopy = informationFocus === "concrete" ? "从具体发生的时刻开始" : "先看整体关系和可能性";
  const decisionCopy = decisionFocus === "logic" ? "再分清影响判断的因素" : "再留意什么对你更重要";
  const paceCopy = reflectionPace === "inward" ? "给你一点先在心里整理的空间" : "允许你边选择边看清";
  const closureCopy = closureStyle === "structured" ? "最后轻轻收束" : "保留尚未确定的部分";

  return {
    type,
    informationFocus,
    decisionFocus,
    reflectionPace,
    closureStyle,
    summary: `${informationCopy}，${decisionCopy}；${paceCopy}，${closureCopy}。`,
  };
}

export function preferenceExplorationQuestion(type: MbtiType | undefined, fallback: string) {
  const style = getThinkingStyle(type);
  if (!style) return fallback;
  return style.informationFocus === "concrete"
    ? "回想最近一个具体时刻，哪一种感觉最接近？"
    : "如果先看最近的整体趋势，哪一种感觉出现得更多？";
}

export function preferenceNeedQuestion(type: MbtiType | undefined, fallback: string) {
  const style = getThinkingStyle(type);
  if (!style) return fallback;
  return style.decisionFocus === "logic"
    ? "顺着刚才那一点，哪个因素最值得先分清？"
    : "顺着刚才那一点，哪一部分对你来说更重要？";
}
