# Inner Mirror V3 Phase 1 Architecture

## Product boundary

Phase 1 只形成 Current Inner Map。首次 Session 只理解当前状态、当前需要与当前可能存在的关系或冲突；不进入 Mirror、Window、Letter、Inner Space、长期趋势或人格结论。

## Runtime

```text
ENTRY
  → SCAN CURRENT STATE
  → SCAN ATTENTION
  → SCAN NEED CANDIDATES
  → RANK 3–4 NEEDS
  → FIRST BRANCH
  → STRUCTURED MODEL UPDATE
  → DECISION ACTION
      ASK / VERIFY / BRANCH / REWEIGHT / REVEAL_MAP
  → CURRENT INNER MAP
  → USER CONFIRM / CORRECT
      confirmed / partial → STOP
      rejected / alternative → REWEIGHT → NEXT QUESTION
```

## Signal and independent evidence

每条 Signal 保存 domain、trait、value、source、reliability、questionId、sessionId 与 createdAt。Hypothesis 只从不同 source 类型中各取一个最强贡献，避免多个相似 multi-choice 被误算为多份独立证据。Ranking、Scenario、Tradeoff、Verification 与 Confirmation 可形成独立产品来源。

## Hypothesis and correction

系统同时维护 Primary 与 Alternative。supportScore 只代表当前独立产品信号的内部支持排序，不作为心理概率展示。Reject 会把 Primary 标记为 rejected，限制其支持值，重新选择 Primary / Alternative，重建 Map，并把下一动作设为 REWEIGHT。

## Contradiction

同一 trait 同时存在足够强的正、负 Signal，且它们来自至少两种 source 时，生成 Contradiction。`external_validation` 的矛盾优先选择 `recognition_verify`；处理前 Map 使用“出现矛盾”，而不是直接宣布认可依赖。

## Decision layer

每次有效输入执行：

```text
COLLECT SIGNAL
  → UPDATE HYPOTHESES
  → CHECK CONTRADICTION
  → CALCULATE INFORMATION NEED
  → SELECT APPROVED QUESTION
  → SELECT ACTION
```

问题按 Primary / Alternative 区分价值、Intent 亲和度、Contradiction 目标与 informationValue 排序。停止由独立来源、支持程度、信息需要、用户确认与疲劳预算共同决定，不依赖固定题数。

## Current Inner Map

Map 使用 `clear / emerging / uncertain / contradictory` 节点和 `related / possibly_related / conflicting` 关系。第一次状态扫描出现首个节点；Attention、Need、Ranking、Scenario、Verify 与 User Correction 都会提高 Map version 并更新节点或关系。点击节点或关系只显示简短产品证据，不暴露内部权重或推理过程。

## Persistence and migration

- Active key：`inner-mirror:v3:phase1-session`
- Schema：`3`
- 损坏 JSON、缺字段或非 Phase 1 的 schema v3 数据会安全失效。
- 旧 `inner-mirror:v3:active-session` 与 Phase 1 结构不兼容，因此只清除未完成旧 Session，不触碰旧历史记录。

## Optional server decision

客户端只发送 Primary / Alternative key、矛盾布尔值、候选 Action 与批准 Question ID。服务端再次用 allowlist 校验，使用 JSON Schema 限制输出，并在 4.2 秒后超时。缺少环境密钥、网络失败或输出无效时返回 `structured_fallback`，本地 Structured Engine 仍能完整结束 Phase 1。
