import type { ScenarioPack } from "./types.ts";
import { rankingLabels } from "../display-labels.ts";

export const uncertainOutcomePack: ScenarioPack = {
  id: "uncertain_outcome",
  label: "一个重要结果还没有下来",
  entry: {
    kicker: "从一件具体的事开始",
    title: "有一个重要结果，还没有下来。",
    support: "先不急着解释它，只看等待里最消耗你的那一部分。",
    action: "从这里开始",
    boundary: "这不是心理测试，只看这一次的现实处境。",
  },
  lifeContext: {
    scenarioId: "uncertain_outcome",
    label: "一个重要结果还没有下来",
  },
  formation: {
    minEvidenceFamilies: 2,
    minEligibleCandidates: 2,
    emergenceThreshold: 0.3,
    supportedThreshold: 1.1,
  },
  evidencePolicy: {
    mode: "single_current_signal_per_family",
  },
  openQuestion: "如果等待与害怕判断失误都没有完全说中，仍未被解释的那部分是什么？",
  noValidSummary: "等待本身、害怕判断出错，好像都只解释了一部分。",
  correctionPrompt: "换一个方向看，这次是否更接近：结果正在影响你对自己判断的评价？",
  journey: {
    clarifyInteractionIds: ["context_delay", "clarify_focus", "current_need_priority"],
  },
  hypotheses: [
    {
      id: "uncertainty",
      order: 0,
      statement: "这次更消耗你的，可能是事情一直悬着，注意力暂时找不到落点。",
    },
    {
      id: "control",
      order: 1,
      statement: "也可能是：很难对进程做什么，失去可行动的位置比等待本身更难受。",
    },
    {
      id: "fear_of_error",
      order: 2,
      statement: "也可能更接近：你担心结果会证明，自己当时的判断并不可靠。",
    },
    {
      id: "self_evaluation",
      order: 3,
      statement: "也可能是：这个结果正在影响你对这次表现的评价。",
    },
    {
      id: "external_evaluation",
      order: 4,
      statement: "也可能是：你在意结果之后，重要的人会如何看待这次选择。",
    },
  ],
  interactions: [
    {
      id: "context_delay",
      source: "choice",
      evidenceFamily: "outcome_timeline",
      key: "delay_experience",
      prompt: "这件事现在更接近哪种状态？",
      options: [
        {
          id: "waiting_longer",
          label: "等待已经持续了一段时间",
          effects: [
            { hypothesisId: "uncertainty", weight: 0.8 },
            { hypothesisId: "control", weight: 0.2 },
          ],
        },
        {
          id: "timeline_keeps_moving",
          label: "结果未定，但事情仍能继续推进",
          effects: [
            { hypothesisId: "uncertainty", weight: 0.45 },
            { hypothesisId: "control", weight: 0.45 },
          ],
        },
        {
          id: "context_abstain",
          label: "都不太像",
          semanticKey: "context_not_clear_yet",
          effects: [],
          isAbstain: true,
        },
      ],
    },
    {
      id: "clarify_focus",
      source: "comparison",
      evidenceFamily: "distress_focus",
      key: "hardest_part",
      prompt: "如果只看最难受的部分，哪一个更靠前？",
      options: [
        {
          id: "outcome_unknown",
          label: "一直不知道结果是什么",
          effects: [
            { hypothesisId: "uncertainty", weight: 0.65 },
            { hypothesisId: "fear_of_error", weight: 0.5 },
          ],
        },
        {
          id: "cannot_act",
          label: "现在几乎没有什么可以做",
          effects: [
            { hypothesisId: "control", weight: 0.9 },
            { hypothesisId: "uncertainty", weight: 0.35 },
          ],
        },
        {
          id: "might_be_wrong",
          label: "担心结果证明自己当时选错了",
          effects: [
            { hypothesisId: "fear_of_error", weight: 0.95 },
            { hypothesisId: "self_evaluation", weight: 0.45 },
            { hypothesisId: "uncertainty", weight: 0.15 },
          ],
        },
        {
          id: "others_will_judge",
          label: "担心重要的人如何评价这次结果",
          effects: [
            { hypothesisId: "external_evaluation", weight: 0.95 },
            { hypothesisId: "self_evaluation", weight: 0.3 },
            { hypothesisId: "fear_of_error", weight: 0.15 },
          ],
        },
        {
          id: "focus_abstain",
          label: "我也说不清",
          semanticKey: "distress_focus_not_clear",
          effects: [],
          isAbstain: true,
        },
      ],
    },
    {
      id: "current_need_priority",
      kind: "ranking",
      source: "relative_position",
      evidenceFamily: "current_need_priority",
      key: "need_priority",
      prompt: "如果只能先照顾一部分，哪一项更应该靠前？",
      options: [
        {
          id: "certainty",
          label: rankingLabels.certainty,
          effects: [{ hypothesisId: "uncertainty", weight: 0.45 }],
        },
        {
          id: "agency",
          label: rankingLabels.agency,
          effects: [{ hypothesisId: "control", weight: 0.45 }],
        },
        {
          id: "performance",
          label: rankingLabels.performance,
          effects: [
            { hypothesisId: "self_evaluation", weight: 0.45 },
            { hypothesisId: "fear_of_error", weight: 0.2 },
          ],
        },
        {
          id: "evaluation",
          label: rankingLabels.evaluation,
          effects: [{ hypothesisId: "external_evaluation", weight: 0.45 }],
        },
        {
          id: "avoid",
          label: rankingLabels.avoid,
          effects: [
            { hypothesisId: "uncertainty", weight: -0.15 },
            { hypothesisId: "control", weight: -0.1 },
          ],
        },
        {
          id: "priority_abstain",
          label: "我现在还选不出来",
          semanticKey: "need_priority_not_clear",
          effects: [],
          isAbstain: true,
        },
      ],
    },
    {
      id: "result_arrives_counterfactual",
      source: "scenario",
      evidenceFamily: "counterfactual_result",
      key: "if_result_arrived",
      prompt: "假设结果明天出现，但并不理想，哪种变化更接近你？",
      options: [
        {
          id: "relief_even_if_bad",
          label: "即使不理想，终于确定也会先让我松一口气",
          effects: [
            { hypothesisId: "uncertainty", weight: 0.95 },
            { hypothesisId: "fear_of_error", weight: -0.6 },
            { hypothesisId: "control", weight: -0.45 },
            { hypothesisId: "self_evaluation", weight: -0.25 },
            { hypothesisId: "external_evaluation", weight: -0.25 },
          ],
        },
        {
          id: "harder_if_i_was_wrong",
          label: "如果它证明我当时判断错了，反而会更难受",
          effects: [
            { hypothesisId: "fear_of_error", weight: 1.15 },
            { hypothesisId: "uncertainty", weight: -0.95 },
            { hypothesisId: "self_evaluation", weight: 0.25 },
          ],
        },
        {
          id: "neither_changes",
          label: "结果出现也不会真正改变最难受的部分",
          effects: [
            { hypothesisId: "uncertainty", weight: -2.2 },
            { hypothesisId: "fear_of_error", weight: -1.5 },
            { hypothesisId: "control", weight: -1.4 },
            { hypothesisId: "self_evaluation", weight: -1.2 },
            { hypothesisId: "external_evaluation", weight: -1.2 },
          ],
        },
      ],
    },
  ],
  discriminators: [
    {
      id: "uncertainty_vs_fear_of_error",
      hypothesisA: "uncertainty",
      hypothesisB: "fear_of_error",
      interactionId: "result_arrives_counterfactual",
    },
  ],
  insightRules: [
    {
      id: "insight_uncertainty_attention",
      hypothesisId: "uncertainty",
      statement: "这次等待之所以消耗你，可能不只因为结果好坏，而是悬而未决让注意力持续无法落下。",
      semanticKey: "uncertainty_sustains_attention",
      cognitiveGainKey: "connects_open_outcome_to_attention_load",
      contextScenarioId: "uncertain_outcome",
      inferenceDepth: 1,
    },
    {
      id: "insight_control_action_position",
      hypothesisId: "control",
      statement: "这次更难承受的也许不是等待本身，而是你暂时失去了可以影响进程的位置。",
      semanticKey: "lack_of_action_position",
      cognitiveGainKey: "distinguishes_waiting_from_action_loss",
      contextScenarioId: "uncertain_outcome",
      inferenceDepth: 1,
    },
    {
      id: "insight_error_self_trust",
      hypothesisId: "fear_of_error",
      statement: "这次更难承受的可能不是结果本身，而是它会反过来影响你如何评价当时的判断。",
      semanticKey: "error_impacts_self_trust",
      cognitiveGainKey: "connects_outcome_to_evaluation_of_judgment",
      contextScenarioId: "uncertain_outcome",
      inferenceDepth: 1,
    },
    {
      id: "insight_result_self_evaluation",
      hypothesisId: "self_evaluation",
      statement: "这个尚未落定的结果，可能正在临时接管你对这次表现的评价。",
      semanticKey: "result_drives_current_self_evaluation",
      cognitiveGainKey: "connects_pending_result_to_current_self_evaluation",
      contextScenarioId: "uncertain_outcome",
      inferenceDepth: 1,
    },
    {
      id: "insight_external_evaluation",
      hypothesisId: "external_evaluation",
      statement: "这次不确定感可能还夹着一层：结果会改变重要的人如何看待这次选择。",
      semanticKey: "outcome_changes_external_evaluation",
      cognitiveGainKey: "connects_outcome_to_current_social_evaluation",
      contextScenarioId: "uncertain_outcome",
      inferenceDepth: 1,
    },
  ],
};
