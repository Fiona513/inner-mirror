# Inner Mirror V2 Architecture

## Current repo audit

项目沿用 React 19、TypeScript、Next-compatible App Router、Vinext/Vite 与 Sites 部署。根路由保持单页客户端体验；V1 的固定问卷、画像、房间、信件和时间轴源码仍保留在 `InnerMirrorApp.tsx` / `inner-mirror.ts`，没有删除或迁移框架。D1/R2 继续关闭，数据默认只在设备浏览器中。

升级前的 V2 使用自由文字开场、六项临时 Profile 和单一 Broken Mirror 路由，Reflection 是 Observe / Connect / Ask。新 V2 在同一入口增量替换为五维 Inner Model、结构化 Signal/Hypothesis、Question Bank、Room Composer、三层 Reflection 和 Inner Map。

## Runtime flow

```text
Landing
  → Exploration Entry
  → SCAN: state / attention / needs
  → PRIORITIZE: ranked needs
  → UPDATE MODEL
  → AGENT DECISION
      ├─ optional LLM: select an approved Question ID
      └─ deterministic information-gain fallback
  → ADAPTIVE QUESTION × 2
  → VERIFY
      ├─ confirmed / partial → ROOM REVEAL
      ├─ rejected → lower hypothesis + different question
      └─ alternative → user selects a replacement hypothesis
  → ROOM COMPOSER
  → INNER ROOM
  → Mirror / Window / Letter (complete one, at most two recommended)
  → REFLECTION: certain / learning / unclear
  → INNER MAP
```

## Structured Engine

- `Signal` 统一存储 dimension、trait、value、source、reliability 和 questionId。
- Ranking、Scenario、Tradeoff、Confirmation 使用不同基础贡献；同源重复信号不会被当成独立证据无限累加。
- 每个 Hypothesis 维护 supporting / contradicting Signal IDs、ConfirmationState 和规则计算 Confidence。
- Reject 至少扣除 0.32，并将当前解释降到低置信区间，确保主假设与下一信息需要改变。
- `selectNextQuestion` 比较 Primary / Alternative，并结合 intent、矛盾与信息价值选择审核过的题目。
- 2 个自适应题后进入 Verify；一次 Reject 可增加一个区分题，避免无限追问。

## Optional LLM boundary

`POST /api/agent` 只接收 Primary/Alternative key、focus dimensions 和候选 Question IDs。服务端模型只能返回候选中的一个 ID、短过渡文案和 reasonCode。JSON Schema、本地 allowlist 与 4.2 秒超时共同约束返回；Key 或模型缺失、网络失败、无效 JSON 都使用确定性 fallback。LLM 不接收自由文本、不生成心理问题、不控制 Confidence。

## Room mapping

- Mirror：Self。至少两个独立 Self 证据且达到置信阈值或用户确认才 Fragmented；单一弱信号最多 Blurred。
- Window：Relationship + Safety。表达保留、冲突、边界与距离共同映射 open / fogged / closed。
- Light：State。energy、stress、mental load、avoidance、clarity 共同映射亮度。
- Letter：Expression。连接需要与表达保留同时出现才 unspoken。
- 推荐互动最多两个；完成一个即可进入 Reflection。

## Persistence and migration

Active Session 使用 `schemaVersion: 2`，持久化 currentSessionStep、intent、signals、rankings、hypotheses、confirmations、roomState、mirror shards、interactions、reflection 和 analytics。损坏 JSON 安全回退。旧 V2 已保存会话会转换为标记过的 Inner Map 历史摘要；旧 key 不会导致新页面崩溃。

## Analytics

本地事件包括 `session_started`、`entry_selected`、`scan_completed`、`ranking_completed`、`adaptive_question_answered`、`hypothesis_shown`、三类 hypothesis feedback、`room_revealed`、interaction start/complete、`reflection_viewed`、`inner_map_saved` 与 `session_completed`。Payload 只保存枚举、数量和 ID，不保存自由文本。
