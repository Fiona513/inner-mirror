# Inner Mirror｜内在镜像

[在线体验 / Live demo](https://inner-mirror-reflection.azure-frost-7692.chatgpt.site/)

Inner Mirror 是一个非诊断性的 AI 自我探索体验。它把现实经历、观察、候选理解、支持证据、反向信号和用户修订分开保存，让一次理解能够被查看、纠正和持续更新，而不是被当作固定的人格标签。

## 当前体验

- `Now / Mirror / Journey` 构成主要信息架构。
- 用户从一个当下问题开始；证据不足时可以正常结束，不强制生成 Insight。
- Candidate Understanding 同时展示 Supporting signals 与 Counter-signals，并可通过 `Show me why` 查看来源。
- 用户可以接受、限定适用情境、重写或拒绝理解；拒绝内容不会被悄悄复用。
- Mirror 与 Journey 会记录用户确认的理解、修订和状态变化。
- 中文和 English 完全独立：系统界面、示例历史、搜索结果和 Agent 文案跟随所选语言；用户输入保持原文。
- 数据默认保存在当前浏览器，产品不提供心理测试、医疗诊断或人格定论。

## 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
npm run test:living-model
npm run test:v4
npx tsc --noEmit
npm run lint
npm run build
```

## 主要实现

- `app/living-model/`：Now、Mirror、Journey、Reflection、证据与本地持久化。
- `app/locale/`：中英文文案、系统枚举、日期与示例数据本地化。
- `app/api/living-reflection/route.ts`：受控的结构化 Agent 文案接口与 deterministic fallback。
- `app/v4-core/`：证据、候选解释、Revision、Insight Gate 与空间状态原型。
- `tests/living-model.test.mjs`：Living Self Model、语言隔离、搜索、Agent 与持久化测试。

## 验证状态

- Living Model：36 条自动化测试
- V4 reasoning / journey / spatial：71 条自动化测试
- TypeScript、ESLint 与 Production Build 通过
