import type { ScenarioPack } from "./types.ts";

export const importantChoicePack: ScenarioPack = {
  id: "important_choice",
  label: "两个对我都重要的方向，很难选",
  entry: {
    kicker: "先不急着决定",
    title: "有两个对你都重要的方向，现在很难选。",
    support: "先看看为什么两个都很难放下，不替你选择其中一个。",
    action: "看看卡在哪里",
    boundary: "只理解这一次选择里的拉扯，不把它写成你的固定价值观。",
  },
  lifeContext: {
    scenarioId: "important_choice",
    label: "两个对你都重要的方向，现在很难选",
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
  openQuestion: "这次收集到的线索之外，真正还拉住你的可能是什么？",
  noValidSummary: "这次收集到的线索，还不足以让其中一种理解站稳。",
  noValidCopyRules: [
    {
      hypothesisIds: ["stability", "autonomy"],
      summary: "安心、自己做决定，好像都还不是这次最关键的部分。",
      openQuestion: "如果安心和自己做决定都只说中了一部分，真正还拉住你的是什么？",
    },
    {
      hypothesisIds: ["external_expectation", "internal_preference"],
      summary: "重要的人的期待、你自己的倾向，好像都还不是这次最关键的部分。",
      openQuestion: "如果重要的人的期待和你自己的倾向都只说中了一部分，真正还拉住你的是什么？",
    },
  ],
  correctionPrompt: "换一个方向看，这次是否更接近：你并不是不知道选项差异，而是不想失去由自己决定的感觉？",
  journey: {
    clarifyInteractionIds: ["choice_loss", "reversibility_test", "ownership_test"],
  },
  hypotheses: [
    {
      id: "stability",
      order: 0,
      statement: "放掉已经比较确定的部分，可能会让这次选择少了一个可以站稳的位置。",
    },
    {
      id: "autonomy",
      order: 1,
      statement: "另一种可能是：结果之外，你也在意这件事是不是由自己真正决定。",
    },
    {
      id: "fear_of_regret",
      order: 2,
      statement: "也可能更难放下的是：无论舍弃哪边，都担心以后回头觉得当时选错了。",
    },
    {
      id: "external_expectation",
      order: 3,
      statement: "这次选择里，重要的人的期待或许也占着一个不容易忽略的位置。",
    },
    {
      id: "internal_preference",
      order: 4,
      statement: "也可能是：你已经有一点自己的倾向，只是它还和其他顾虑缠在一起。",
    },
  ],
  interactions: [
    {
      id: "choice_loss",
      source: "comparison",
      evidenceFamily: "choice_loss",
      key: "hardest_loss",
      prompt: "如果必须先放掉其中一边，你最舍不得失去哪一部分？",
      options: [
        {
          id: "established_foundation",
          label: "已经建立起来的稳定和基础",
          effects: [
            { hypothesisId: "stability", weight: 0.78 },
            { hypothesisId: "fear_of_regret", weight: 0.48 },
          ],
        },
        {
          id: "self_chosen_direction",
          label: "自己真正想试一次的方向",
          effects: [
            { hypothesisId: "autonomy", weight: 0.78 },
            { hypothesisId: "internal_preference", weight: 0.48 },
          ],
        },
        {
          id: "important_expectations",
          label: "重要的人对我的期待",
          effects: [
            { hypothesisId: "external_expectation", weight: 0.78 },
            { hypothesisId: "stability", weight: 0.32 },
          ],
        },
        {
          id: "future_regret",
          label: "不想以后回头觉得错过了",
          effects: [
            { hypothesisId: "fear_of_regret", weight: 0.78 },
            { hypothesisId: "internal_preference", weight: 0.44 },
          ],
        },
        {
          id: "choice_loss_abstain",
          label: "现在还说不上来",
          semanticKey: "choice_loss_not_clear",
          effects: [],
          isAbstain: true,
        },
      ],
    },
    {
      id: "reversibility_test",
      source: "scenario",
      evidenceFamily: "relief_test",
      key: "if_reversible",
      prompt: "如果半年后还可以重新调整，这个选择会变容易一点吗？",
      options: [
        {
          id: "much_easier_if_reversible",
          label: "会，知道还能调整会轻松很多",
          effects: [
            { hypothesisId: "fear_of_regret", weight: 0.72 },
            { hypothesisId: "autonomy", weight: 0.25 },
            { hypothesisId: "stability", weight: -0.1 },
          ],
        },
        {
          id: "still_hard_if_reversible",
          label: "还是很难，两边各自重要的部分都还在",
          effects: [
            { hypothesisId: "stability", weight: 0.58 },
            { hypothesisId: "autonomy", weight: 0.48 },
          ],
        },
        {
          id: "preference_gets_clearer",
          label: "会，我自己的倾向好像会更清楚一点",
          effects: [
            { hypothesisId: "internal_preference", weight: 0.7 },
            { hypothesisId: "autonomy", weight: 0.45 },
          ],
        },
        {
          id: "reversibility_abstain",
          label: "现在想象不出来",
          semanticKey: "reversibility_not_clear",
          effects: [],
          isAbstain: true,
        },
      ],
    },
    {
      id: "ownership_test",
      source: "comparison",
      evidenceFamily: "ownership",
      key: "choice_ownership",
      prompt: "如果两个方向最后结果差不多，哪一部分会让你更难忽略？",
      options: [
        {
          id: "self_decided_matters",
          label: "这个决定是不是我自己真正做出的",
          effects: [
            { hypothesisId: "autonomy", weight: 0.62 },
            { hypothesisId: "internal_preference", weight: 0.42 },
          ],
        },
        {
          id: "others_expected_matters",
          label: "它是否回应了重要的人对我的期待",
          effects: [
            { hypothesisId: "external_expectation", weight: 0.68 },
            { hypothesisId: "stability", weight: 0.28 },
          ],
        },
        {
          id: "ownership_not_decisive",
          label: "由谁决定好像都不是最关键的",
          effects: [
            { hypothesisId: "fear_of_regret", weight: 0.25 },
            { hypothesisId: "stability", weight: 0.18 },
            { hypothesisId: "autonomy", weight: 0.18 },
          ],
        },
        {
          id: "ownership_abstain",
          label: "这两种现在也分不清",
          semanticKey: "ownership_not_clear",
          effects: [],
          isAbstain: true,
        },
      ],
    },
    {
      id: "equal_stability_counterfactual",
      source: "scenario",
      evidenceFamily: "forced_choice",
      key: "if_equally_stable",
      prompt: "如果两个方向未来的稳定程度其实差不多，哪一种变化更像你？",
      options: [
        {
          id: "own_direction_emerges",
          label: "我会更想走那个自己真正想试的方向",
          effects: [
            { hypothesisId: "autonomy", weight: 1.05 },
            { hypothesisId: "internal_preference", weight: 0.35 },
            { hypothesisId: "stability", weight: -0.95 },
          ],
        },
        {
          id: "known_position_still_matters",
          label: "即使差不多，我还是更想留在熟悉的位置",
          effects: [
            { hypothesisId: "stability", weight: 0.85 },
            { hypothesisId: "autonomy", weight: -0.45 },
          ],
        },
        {
          id: "neither_is_key",
          label: "稳定或自己决定，好像都不是最关键的",
          effects: [
            { hypothesisId: "stability", weight: -1.8 },
            { hypothesisId: "autonomy", weight: -1.8 },
          ],
        },
      ],
    },
    {
      id: "private_choice_counterfactual",
      source: "scenario",
      evidenceFamily: "social_visibility",
      key: "if_private_choice",
      prompt: "如果没有任何人会知道你最后怎么选，决定会变容易吗？",
      options: [
        {
          id: "private_preference_clearer",
          label: "会，我自己的倾向会更容易出现",
          effects: [
            { hypothesisId: "internal_preference", weight: 1 },
            { hypothesisId: "external_expectation", weight: -0.85 },
          ],
        },
        {
          id: "private_choice_same",
          label: "不会，别人知不知道并不会改变这份为难",
          effects: [
            { hypothesisId: "external_expectation", weight: 0.65 },
            { hypothesisId: "internal_preference", weight: -0.45 },
          ],
        },
        {
          id: "private_choice_another_factor",
          label: "也不是，真正拉住我的好像是别的部分",
          effects: [
            { hypothesisId: "external_expectation", weight: -1.8 },
            { hypothesisId: "internal_preference", weight: -1.4 },
          ],
        },
      ],
    },
  ],
  discriminators: [
    {
      id: "stability_vs_autonomy",
      hypothesisA: "stability",
      hypothesisB: "autonomy",
      interactionId: "equal_stability_counterfactual",
    },
    {
      id: "expectation_vs_preference",
      hypothesisA: "external_expectation",
      hypothesisB: "internal_preference",
      interactionId: "private_choice_counterfactual",
    },
  ],
  insightRules: [
    {
      id: "insight_choice_stability",
      hypothesisId: "stability",
      statement: "这次真正拉住你的，可能不只是哪个结果更好，而是放掉已有基础也会放掉一部分确定感。",
      semanticKey: "choice_protects_existing_certainty",
      cognitiveGainKey: "connects_choice_loss_to_current_stability_tension",
      contextScenarioId: "important_choice",
      inferenceDepth: 1,
    },
    {
      id: "insight_choice_autonomy",
      hypothesisId: "autonomy",
      statement: "当两个方向的稳定差异被拿开以后，这次选择里更清楚的可能是：你也在保护由自己作出决定的感觉。",
      semanticKey: "equal_stability_reveals_choice_ownership",
      cognitiveGainKey: "connects_removed_stability_difference_to_current_ownership_tension",
      contextScenarioId: "important_choice",
      inferenceDepth: 1,
    },
    {
      id: "insight_choice_regret",
      hypothesisId: "fear_of_regret",
      statement: "这次难放掉的可能不只是某个选项，而是放掉以后可能出现的那句“当时是不是应该选另一边”。",
      semanticKey: "choice_loss_carries_future_regret",
      cognitiveGainKey: "connects_current_choice_loss_to_future_self_evaluation",
      contextScenarioId: "important_choice",
      inferenceDepth: 1,
    },
    {
      id: "insight_choice_expectation",
      hypothesisId: "external_expectation",
      statement: "这次选择不只发生在两个方向之间，重要的人的期待也让其中一边更难被轻易放下。",
      semanticKey: "choice_includes_current_social_expectation",
      cognitiveGainKey: "connects_current_choice_to_social_visibility_tension",
      contextScenarioId: "important_choice",
      inferenceDepth: 1,
    },
    {
      id: "insight_choice_preference",
      hypothesisId: "internal_preference",
      statement: "当别人的看法暂时被拿开以后，你自己的倾向才更容易出现一点，但它仍不是替你作出的决定。",
      semanticKey: "private_context_clarifies_current_preference",
      cognitiveGainKey: "connects_removed_social_visibility_to_emerging_preference",
      contextScenarioId: "important_choice",
      inferenceDepth: 1,
    },
  ],
};
