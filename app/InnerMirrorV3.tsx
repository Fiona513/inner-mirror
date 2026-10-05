"use client";

import { useEffect, useRef, useState } from "react";
import {
  QUESTION_BANK,
  answerQuestion,
  buildHistoricalComparison,
  buildReflection,
  chooseIntent,
  completeMirror,
  createHistoryEntry,
  createMirrorState,
  createSession,
  decideAgent,
  intentOptions,
  migrateV2History,
  moveMirrorItem,
  priorityLabels,
  pulseOptions,
  recordPriorities,
  recordPulse,
  restoreHistory,
  restoreSession,
  shouldOfferMirror,
  track,
  verifyHypothesis,
  withAgentDecision,
  type Confirmation,
  type CurrentInnerMap,
  type HistoryEntry,
  type MirrorZone,
  type V3Session,
} from "./v3-model";

const ACTIVE_KEY = "inner-mirror:v3:active-session";
const HISTORY_KEY = "inner-mirror:v3:sessions";
const V2_HISTORY_KEY = "inner-mirror:v2:inner-map";
const initialPriorities = ["stability", "freedom", "recognition", "connection", "achievement", "rest", "autonomy", "exploration"];

const stateLabel: Record<string, string> = { clear: "比较明确", forming: "正在形成", possible: "可能有关", uncertain: "尚不确定", contradiction: "出现矛盾", recent_change: "最近变化" };
const actionLabel: Record<string, string> = { ASK: "继续收集", VERIFY: "区分矛盾", BRANCH: "改变路径", REWEIGHT: "重新安排", REVEAL_MAP: "地图出现", UPDATE_MAP: "地图更新", SELECT_SPATIAL_INTERACTION: "选择空间互动", UPDATE_SPACE: "空间更新", COMPARE_HISTORY: "比较变化", REFLECT: "整理发现", STOP: "停在这里" };

function Brand({ onClick }: { onClick: () => void }) {
  return <button className="v3-brand" type="button" onClick={onClick} aria-label="回到 Inner Mirror 首页"><i aria-hidden="true">◐</i><span>INNER MIRROR</span><small>内在镜像</small></button>;
}

function Header({ onHome, onMap, historyCount, onReset }: { onHome: () => void; onMap?: () => void; historyCount: number; onReset?: () => void }) {
  return <header className="v3-header"><Brand onClick={onHome} /><nav aria-label="体验导航">{onMap && <button type="button" onClick={onMap}>INNER MAP <b>{historyCount}</b></button>}{onReset && <button type="button" onClick={onReset}>重新开始</button>}</nav></header>;
}

function AgentStatus({ session }: { session: V3Session }) {
  const decision = session.agentDecision ?? decideAgent(session);
  return <aside className={`v3-agent-note action-${decision.action.toLowerCase()}`} aria-live="polite"><span>ORCHESTRATOR</span><p>{decision.message}</p><small>{actionLabel[decision.action]} · {decision.engine === "llm_assisted" ? "AI ASSISTED" : "STRUCTURED"}</small></aside>;
}

function MapDiagram({ map, compact = false }: { map: CurrentInnerMap; compact?: boolean }) {
  return <div className={`v3-map-diagram ${compact ? "is-compact" : ""}`} aria-label="当前内在地图">
    <div className="v3-map-plane" aria-hidden="true"><i /><i /><i /></div>
    {map.nodes.map((node, index) => <article key={node.id} className={`v3-map-node state-${node.state} node-${index + 1}`}><small>{stateLabel[node.state]}</small><strong>{node.label}</strong><span>{node.domain}</span></article>)}
    {map.relations.map((relation, index) => <div key={relation.id} className={`v3-map-link state-${relation.state} link-${index + 1}`}><i /><span>{stateLabel[relation.state]}</span></div>)}
  </div>;
}

function MapPeek({ session }: { session: V3Session }) {
  if (!session.signals.length) return null;
  return <aside className="v3-map-peek"><header><span>CURRENT INNER MAP</span><b>正在随选择变化</b></header><MapDiagram map={session.currentInnerMap} compact /></aside>;
}

function Landing({ draft, history, onContinue, onStart, onHistory, onLegal }: { draft: V3Session | null; history: HistoryEntry[]; onContinue: () => void; onStart: () => void; onHistory: () => void; onLegal: (kind: "privacy" | "terms") => void }) {
  return <main id="main-content" className="v3-landing v3-enter">
    <Header onHome={() => undefined} onMap={history.length ? onHistory : undefined} historyCount={history.length} />
    <section className="v3-hero">
      <div className="v3-hero-copy"><p className="v3-kicker">INNER MIRROR · 内在镜像</p><h1>看见此刻的自己。</h1><p>通过几个简单选择，把那些说不清的状态慢慢理清。你会先看到一张正在形成的 Inner Map，再决定什么值得继续。</p><div className="v3-hero-actions"><button className="v3-primary" type="button" onClick={draft ? onContinue : onStart}>{draft ? "继续刚才的探索" : history.length ? "看看今天有什么不同" : "开始看看"}<span>↗</span></button>{draft && <button className="v3-text" type="button" onClick={onStart}>开始新的</button>}</div><small>不是心理测试，也不提供医疗诊断。通常只需要几分钟。</small></div>
      <div className="v3-hero-map" aria-hidden="true"><span>STATE</span><span>NEED</span><span>SELF</span><i className="line-a" /><i className="line-b" /><div><b>此刻</b><small>从这里开始</small></div></div>
    </section>
    <footer className="v3-footer"><span>© 2026 INNER MIRROR</span><div><button type="button" onClick={() => onLegal("privacy")}>隐私说明</button><button type="button" onClick={() => onLegal("terms")}>使用边界</button></div></footer>
  </main>;
}

function Entry({ session, history, onChange, onHome, onReset }: StepProps & { history: HistoryEntry[] }) {
  const last = history[0];
  return <main id="main-content" className="v3-experience v3-enter"><Header onHome={onHome} historyCount={history.length} onReset={onReset} /><section className="v3-step-layout"><div className="v3-step-copy"><p className="v3-kicker">ACT 1 · OPEN</p><h1>{last ? "先看看今天，从哪里开始不同。" : "这一次，想先看清什么？"}</h1><p>{last ? <>上一次你带走的是：<em>“{last.keptInsight}”</em>。这次不会重跑同一份问卷，只从今天的新信号开始比较。</> : "选择一个入口就够了。它只决定从哪里开始，不会定义你。"}</p></div><div className="v3-intent-list">{intentOptions.map((option, index) => <button key={option.id} type="button" onClick={() => onChange(chooseIntent(session, option.id))}><span>0{index + 1}</span><div><strong>{option.label}</strong><small>{option.detail}</small></div><i>→</i></button>)}</div></section></main>;
}

type StepProps = { session: V3Session; onChange: (session: V3Session) => void; onHome: () => void; onReset: () => void };

function Pulse({ session, onChange, onHome, onReset }: StepProps) {
  const [selected, setSelected] = useState<string[]>(session.answers.pulse ?? []);
  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : current.length < 2 ? [...current, id] : [current[1], id]);
  const commit = () => onChange(withAgentDecision(recordPulse(session, selected)));
  return <main id="main-content" className="v3-experience v3-enter"><Header onHome={onHome} historyCount={session.historyCountAtStart} onReset={onReset} /><section className="v3-step-layout has-map"><div className="v3-step-copy"><p className="v3-kicker">LIGHT SIGNAL · 01</p><h1>此刻，哪两种感觉离你最近？</h1><p>最多选两项。地图会在第一个选择后开始出现，不必先把自己解释完整。</p></div><div className="v3-choice-grid">{pulseOptions.map((option) => <button key={option.id} className={selected.includes(option.id) ? "is-selected" : ""} type="button" aria-pressed={selected.includes(option.id)} onClick={() => toggle(option.id)}><i /><strong>{option.label}</strong><small>{option.detail}</small></button>)}<div className="v3-submit"><span>{selected.length}/2 个此刻信号</span><button className="v3-primary" type="button" disabled={!selected.length} onClick={commit}>让地图开始出现 <b>→</b></button></div></div>{selected.length > 0 && <aside className={`v3-first-feedback progress-${selected.length}`} aria-live="polite"><span>第一次变化</span><p>{pulseOptions.find((item) => item.id === selected[0])?.effects[0]?.label}</p><i /></aside>}</section></main>;
}

function Priorities({ session, onChange, onHome, onReset }: StepProps) {
  const [order, setOrder] = useState(session.priorityOrder.length ? session.priorityOrder : initialPriorities);
  const move = (index: number, direction: -1 | 1) => setOrder((current) => { const target = index + direction; if (target < 0 || target >= current.length) return current; const copy = [...current]; [copy[index], copy[target]] = [copy[target], copy[index]]; return copy; });
  const commit = () => { const ranked = recordPriorities(session, order); const decided = withAgentDecision({ ...ranked, currentStep: "adaptive" }); onChange(decided); };
  return <main id="main-content" className="v3-experience v3-enter"><Header onHome={onHome} historyCount={session.historyCountAtStart} onReset={onReset} /><section className="v3-step-layout has-map"><div className="v3-step-copy"><p className="v3-kicker">RANK · 02</p><h1>把此刻更重要的，往前移。</h1><p>只代表今天。点箭头调整顺序，系统会优先读取前四项。</p></div><ol className="v3-ranking">{order.map((id, index) => <li key={id} className={index < 4 ? "is-active" : ""}><span>{String(index + 1).padStart(2, "0")}</span><strong>{priorityLabels[id]}</strong><div><button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`上移${priorityLabels[id]}`}>↑</button><button type="button" disabled={index === order.length - 1} onClick={() => move(index, 1)} aria-label={`下移${priorityLabels[id]}`}>↓</button></div></li>)}<div className="v3-submit"><span>前四项进入本次模型</span><button className="v3-primary" type="button" onClick={commit}>确认这个顺序 <b>→</b></button></div></ol><MapPeek session={session} /></section></main>;
}

function Adaptive({ session, onChange, onHome, onReset }: StepProps) {
  const decision = session.agentDecision ?? decideAgent(session);
  const question = QUESTION_BANK.find((item) => item.id === decision.nextQuestionId) ?? QUESTION_BANK.find((item) => !session.askedQuestionIds.includes(item.id));
  const attemptedAgentRequest = useRef<string | null>(null);
  useEffect(() => {
    if (!question || decision.engine !== "structured_fallback") return;
    const signature = `${session.primaryKey}:${session.alternativeKey}:${session.askedQuestionIds.join(",")}:${session.contradictions.length}`;
    if (attemptedAgentRequest.current === signature) return;
    attemptedAgentRequest.current = signature;
    const candidateQuestionIds = QUESTION_BANK.filter((item) => !session.askedQuestionIds.includes(item.id)).map((item) => item.id);
    const controller = new AbortController();
    fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ primaryHypothesisKey: session.primaryKey, alternativeHypothesisKey: session.alternativeKey, hasContradiction: session.contradictions.length > 0, candidateActions: [decision.action, "ASK", "VERIFY", "REVEAL_MAP"], candidateQuestionIds }) })
      .then((response) => response.json())
      .then((payload: { mode?: string; decision?: { action?: string; selectedQuestionId?: string; transitionCopy?: string; reasonCode?: string } }) => {
        if (payload.mode !== "llm_assisted" || !payload.decision || !candidateQuestionIds.includes(payload.decision.selectedQuestionId ?? "")) return;
        const allowed = [decision.action, "ASK", "VERIFY", "REVEAL_MAP"];
        if (!allowed.includes(payload.decision.action ?? "")) return;
        onChange({ ...session, agentDecision: { ...decision, action: payload.decision.action as typeof decision.action, nextQuestionId: payload.decision.selectedQuestionId, message: payload.decision.transitionCopy?.slice(0, 92) || decision.message, reasonCode: payload.decision.reasonCode || decision.reasonCode, engine: "llm_assisted" } });
      }).catch(() => undefined);
    return () => controller.abort();
  }, [decision, onChange, question, session]);
  if (!question) return <MapScreen session={{ ...session, currentStep: "map" }} onChange={onChange} onHome={onHome} onReset={onReset} />;
  const answer = (optionId: string) => {
    let next = answerQuestion(session, question.id, optionId);
    next = withAgentDecision(next);
    const action = next.agentDecision?.action;
    next = { ...next, currentStep: action === "REVEAL_MAP" ? "map" : "adaptive" };
    if (next.currentStep === "map") {
      next = track(next, "hypothesis_shown", { hypothesis: next.primaryKey ?? "unknown" });
      next = track(next, "inner_map_revealed", { version: next.currentInnerMap.version });
    }
    onChange(next);
  };
  return <main id="main-content" className="v3-experience v3-enter"><Header onHome={onHome} historyCount={session.historyCountAtStart} onReset={onReset} /><section className="v3-adaptive-layout"><div><AgentStatus session={session} /><p className="v3-kicker">{question.type.toUpperCase()} · {String(session.askedQuestionIds.length + 3).padStart(2, "0")}</p><h1>{question.prompt}</h1><p>{question.support}</p></div><div className="v3-adaptive-options">{question.options.map((option, index) => <button key={option.id} type="button" onClick={() => answer(option.id)}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{option.label}</strong><small>{option.detail}</small></div><i>→</i></button>)}</div><MapPeek session={session} /></section></main>;
}

function EvidenceDetails({ evidence }: { evidence: string[] }) {
  return <details className="v3-evidence"><summary>为什么出现这条关系？</summary>{evidence.length ? evidence.map((item) => <p key={item}>{item}</p>) : <p>目前只有初步线索，因此仍标记为尚不确定。</p>}</details>;
}

function MapScreen({ session, onChange, onHome, onReset }: StepProps) {
  const primary = session.hypotheses.find((item) => item.key === session.primaryKey);
  const alternative = session.hypotheses.find((item) => item.key === session.alternativeKey);
  const hasResponded = primary && primary.confirmation !== "unknown";
  const respond = (confirmation: Confirmation) => {
    let next = verifyHypothesis(session, confirmation);
    if (confirmation === "rejected" || confirmation === "alternative") {
      next = withAgentDecision({ ...next, currentStep: "adaptive" });
      onChange(next);
      return;
    }
    next = withAgentDecision({ ...next, currentStep: "map" });
    onChange(next);
  };
  const continueFlow = (spatial: boolean) => {
    if (spatial) {
      let next: V3Session = { ...session, currentStep: "mirror", spatialInteractionState: createMirrorState(session), agentDecision: { action: "SELECT_SPATIAL_INTERACTION", primaryKey: session.primaryKey, alternativeKey: session.alternativeKey, reasonCode: "self_relation_is_spatial", message: "这组关系适合通过位置继续看清。", engine: "structured_fallback" } };
      next = track(next, "agent_action_selected", { action: "SELECT_SPATIAL_INTERACTION", reason: "self_relation_is_spatial" });
      next = track(next, "spatial_interaction_started", { kind: "mirror_self_arrangement" });
      onChange(next);
    } else onChange(track({ ...session, currentStep: "reflection", agentDecision: { action: "REFLECT", primaryKey: session.primaryKey, alternativeKey: session.alternativeKey, reasonCode: "map_is_sufficient", message: "当前地图已经足够进入整理。", engine: "structured_fallback" } }, "agent_action_selected", { action: "REFLECT", reason: "map_is_sufficient" }));
  };
  return <main id="main-content" className="v3-map-page v3-enter"><Header onHome={onHome} historyCount={session.historyCountAtStart} onReset={onReset} /><section className="v3-map-stage"><div className="v3-map-copy"><p className="v3-kicker">ACT 2 · CURRENT INNER MAP</p><h1>一张关于“此刻”的地图。</h1><p>它只显示当前突出的关系、证据强弱与未知，不给你打分，也不把今天变成长期性格。</p>{primary && <article className="v3-hypothesis"><span>{session.contradictions.length ? "出现矛盾" : "正在形成"}</span><p>{primary.statement}</p><EvidenceDetails evidence={primary.evidence} /></article>}{alternative && <p className="v3-alternative"><span>另一个仍保留的方向</span>{alternative.statement}</p>}</div><MapDiagram map={session.currentInnerMap} /></section>
    {!hasResponded ? <section className="v3-map-response"><p>这组理解离你有多近？</p><div><button type="button" onClick={() => respond("confirmed")}>很贴近</button><button type="button" onClick={() => respond("partial")}>有一点像</button><button type="button" onClick={() => respond("rejected")}>不太像</button><button type="button" onClick={() => respond("alternative")}>更接近另一个方向</button></div></section> : <section className="v3-map-next"><AgentStatus session={session} />{shouldOfferMirror(session) ? <><div><p>这组关系适合通过位置继续看清。</p><small>Mirror 来自当前的 Self 线索；可以跳过，不影响保存。</small></div><button className="v3-primary" type="button" onClick={() => continueFlow(true)}>用空间重新排列 <b>→</b></button><button className="v3-text" type="button" onClick={() => continueFlow(false)}>跳过空间互动</button></> : <><div><p>当前关系已经可以进入整理。</p><small>这一次不需要强制进入空间。</small></div><button className="v3-primary" type="button" onClick={() => continueFlow(false)}>看看今天留下什么 <b>→</b></button></>}</section>}
  </main>;
}

const zoneLabels: Record<MirrorZone, string> = { center: "更属于我", edge: "放在外缘", outside: "推远一些", pending: "暂时不处理" };

function MirrorArrangement({ session, onChange, onHome, onReset }: StepProps) {
  const state = session.spatialInteractionState ?? createMirrorState(session);
  const [selected, setSelected] = useState<string | null>(null);
  const place = (itemId: string, zone: MirrorZone) => { onChange(moveMirrorItem(session, itemId, zone)); setSelected(null); };
  const drop = (event: React.DragEvent, zone: MirrorZone) => { event.preventDefault(); const itemId = event.dataTransfer.getData("text/plain"); if (itemId) place(itemId, zone); };
  const finish = () => onChange({ ...completeMirror(session), currentStep: "reflection" });
  return <main id="main-content" className="v3-mirror-page v3-enter"><Header onHome={onHome} historyCount={session.historyCountAtStart} onReset={onReset} /><section className="v3-mirror-layout"><div className="v3-mirror-copy"><p className="v3-kicker">ACT 3 · MIRROR / SELF ARRANGEMENT</p><h1>不是把自己拼完整，而是重新安排距离。</h1><p>这些内容来自刚才的地图。拖动，或先点选一个内容再选择位置。没有正确排列。</p><div className="v3-source-note"><span>为什么是 Mirror</span><p>“结果 / 评价 / 自己的判断”同时进入了当前 Self 关系，因此 Agent 选择了位置互动。</p></div></div><div className={`v3-mirror-workspace mirror-${state.mirrorState.toLowerCase()}`}>
      <div className="v3-mirror-frame" aria-label={`可重新排列的镜子，当前状态 ${state.mirrorState}`} onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, "center")}><div className="v3-glass"><i className="v3-reflection-a" /><i className="v3-reflection-b" /><span>更属于我</span>{state.items.filter((item) => item.zone === "center").map((item) => <button key={item.id} className="v3-mirror-token" draggable type="button" aria-pressed={selected === item.id} onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)} onClick={() => setSelected(item.id)}>{item.label}</button>)}</div><div className="v3-frame-edge" onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, "edge")}>{state.items.filter((item) => item.zone === "edge").map((item) => <button key={item.id} className="v3-edge-token" draggable type="button" aria-pressed={selected === item.id} onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)} onClick={() => setSelected(item.id)}>{item.label}</button>)}</div></div>
      <div className="v3-mirror-outside" onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, "outside")}><span>更远处</span>{state.items.filter((item) => item.zone === "outside").map((item) => <button key={item.id} draggable type="button" aria-pressed={selected === item.id} onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)} onClick={() => setSelected(item.id)}>{item.label}</button>)}</div>
      <div className="v3-mirror-pending" onDragOver={(event) => event.preventDefault()} onDrop={(event) => drop(event, "pending")}><span>暂不处理</span>{state.items.filter((item) => item.zone === "pending").map((item) => <button key={item.id} draggable type="button" aria-pressed={selected === item.id} onDragStart={(event) => event.dataTransfer.setData("text/plain", item.id)} onClick={() => setSelected(item.id)}>{item.label}</button>)}</div>
    </div><div className="v3-placement-controls" aria-live="polite"><span>{selected ? `把“${state.items.find((item) => item.id === selected)?.label}”放到：` : "选择镜面里的一个内容，再决定位置"}</span><div>{(Object.keys(zoneLabels) as MirrorZone[]).map((zone) => <button key={zone} type="button" disabled={!selected} onClick={() => selected && place(selected, zone)}>{zoneLabels[zone]}</button>)}</div><footer><small>{state.moves ? `已经发生 ${state.moves} 次位置变化，地图会据此更新。` : "至少移动一次，观察关系怎样变化。"}</small><button className="v3-primary" type="button" disabled={!state.moves} onClick={finish}>保留这个排列 <b>→</b></button></footer></div></section></main>;
}

function ReflectionScreen({ session, onChange, onHome, onReset }: StepProps) {
  const reflection = session.reflection ?? buildReflection(session);
  const select = (insight: string) => onChange(track({ ...session, keptInsight: insight, openQuestion: reflection.openQuestion, currentStep: "keep" }, "insight_kept", { candidate: reflection.candidates.indexOf(insight) }));
  const setReason = (reason: string) => onChange({ ...session, answers: { ...session.answers, history_reason: [reason] } });
  return <main id="main-content" className="v3-reflection v3-enter"><Header onHome={onHome} historyCount={session.historyCountAtStart} onReset={onReset} /><section className="v3-reflection-head"><div><p className="v3-kicker">ACT 4 · REFLECT</p><h1>只整理今天<br />足够清楚的部分。</h1></div><p>没有长报告，也不替你决定结论。三层内容分别表示支持、正在形成与明确保留的未知。</p></section>
    {session.historicalComparison && (session.historicalComparison.difference || session.historicalComparison.recurrence) && <section className="v3-comparison"><span>与上一次相比</span>{session.historicalComparison.difference && <p>{session.historicalComparison.difference}</p>}{session.historicalComparison.recurrence && <p>{session.historicalComparison.recurrence}</p>}{session.historicalComparison.possiblePattern && <strong>{session.historicalComparison.possiblePattern}</strong>}<div>{session.historicalComparison.reasonOptions.map((reason) => <button key={reason} className={session.answers.history_reason?.[0] === reason ? "is-selected" : ""} type="button" onClick={() => setReason(reason)}>{reason}</button>)}</div></section>}
    <section className="v3-reflection-layers"><article><span>01</span><div><small>比较确定的</small><p>{reflection.certain}</p></div></article><article><span>02</span><div><small>正在理解的</small><p>{reflection.forming}</p></div></article><article><span>03</span><div><small>还没有看清的</small><p>{reflection.unknown}</p></div></article></section>
    <section className="v3-keep-one"><div><p className="v3-kicker">KEEP ONE INSIGHT</p><h2>今天最值得留下的是哪一个？</h2><p>最终由你选择，不由系统替你宣布。</p></div><div>{reflection.candidates.map((candidate, index) => <button key={candidate} type="button" onClick={() => select(candidate)}><span>0{index + 1}</span><p>{candidate}</p><i>→</i></button>)}</div></section>
  </main>;
}

function KeepScreen({ session, onChange, onHome, onReset, onSave }: StepProps & { onSave: (session: V3Session) => void }) {
  const reflection = session.reflection ?? buildReflection(session);
  return <main id="main-content" className="v3-keep-page v3-enter"><Header onHome={onHome} historyCount={session.historyCountAtStart} onReset={onReset} /><section className="v3-keep-stage"><div><p className="v3-kicker">TODAY · KEEP</p><h1>今天先到这里。</h1><p>你选择带走一条关系，同时保留一个还不需要回答的问题。</p><button className="v3-text" type="button" onClick={() => onChange({ ...session, currentStep: "reflection" })}>重新选择</button></div><article><span>今天比较清楚的</span><blockquote>{session.keptInsight}</blockquote><span>还没有看清的</span><p>{session.openQuestion ?? reflection.openQuestion}</p><footer><button className="v3-text" type="button" onClick={() => onChange({ ...session, currentStep: "map" })}>回到当前地图</button><button className="v3-primary" type="button" onClick={() => onSave(session)}>保存今天的地图 <b>→</b></button></footer></article></section></main>;
}

function DoneScreen({ session, onEnd, onHistory, onStart }: { session: V3Session; onEnd: () => void; onHistory: () => void; onStart: () => void }) {
  return <main id="main-content" className="v3-done v3-enter"><Header onHome={onEnd} historyCount={session.historyCountAtStart + 1} /><section><p className="v3-kicker">SAVED · CURRENT INNER MAP</p><h1>这次探索已经留下。</h1><blockquote>{session.keptInsight}</blockquote><div><span>仍然开放</span><p>{session.openQuestion}</p></div>{session.historicalComparison?.difference && <aside><small>最近变化</small><p>{session.historicalComparison.difference}</p></aside>}<footer><button className="v3-primary" type="button" onClick={onHistory}>查看变化地图 <b>→</b></button><button className="v3-text" type="button" onClick={onStart}>开始下一次观察</button></footer></section></main>;
}

function HistoryView({ history, onHome, onStart }: { history: HistoryEntry[]; onHome: () => void; onStart: () => void }) {
  return <main id="main-content" className="v3-history v3-enter"><Header onHome={onHome} historyCount={history.length} /><section className="v3-history-head"><div><p className="v3-kicker">LONGITUDINAL INNER MAP</p><h1>不是记录答案，<br />而是看见变化。</h1></div><p>第一次只留下 State 与 Current Hypothesis。多次探索后，系统才会谨慎提出 Difference、Recurrence 与可能的关联。</p><button className="v3-primary" type="button" onClick={onStart}>看看今天的变化 <b>→</b></button></section><section className="v3-history-list">{history.length ? history.map((entry) => <article key={entry.id}><time>{new Date(entry.createdAt).toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" })}</time><div><span>{entry.migratedFromV2 ? "早期记录迁移" : "我选择带走"}</span><h2>{entry.keptInsight}</h2><p><b>仍未看清</b>{entry.openQuestion}</p></div></article>) : <div className="v3-empty"><i>◐</i><h2>还没有可以比较的变化。</h2><p>完成一次探索后，自己选择留下的 Insight 会出现在这里。</p></div>}</section></main>;
}

function LegalPanel({ kind, onClose }: { kind: "privacy" | "terms"; onClose: () => void }) {
  return <div className="v3-modal"><section role="dialog" aria-modal="true" aria-labelledby="legal-title"><button type="button" onClick={onClose} aria-label="关闭">×</button><p className="v3-kicker">{kind === "privacy" ? "PRIVACY" : "BOUNDARIES"}</p><h2 id="legal-title">{kind === "privacy" ? "数据如何流动" : "Inner Mirror 的使用边界"}</h2>{kind === "privacy" ? <><p>你的选择、地图、空间排列与历史默认保存在当前浏览器的 LocalStorage。</p><p>若站点配置了可选 AI，服务端只接收假设 ID、候选动作与问题 ID，不接收自由文字；提供商可能短暂处理这些结构化信息。AI 不可用时，流程完全由本地规则继续。</p></> : <><p>Inner Mirror 是自我探索产品，不是心理测试、医疗诊断或危机服务。所有内容都只描述“此刻”，不定义长期人格。</p><p>如果你正处于紧急危险或需要即时支持，请联系所在地紧急服务或一位可信任的人。</p></>}</section></div>;
}

function ResetDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return <div className="v3-modal"><section role="dialog" aria-modal="true" aria-labelledby="reset-title"><button type="button" onClick={onCancel} aria-label="关闭">×</button><p className="v3-kicker">BEGIN AGAIN</p><h2 id="reset-title">重新开始今天的探索？</h2><p>当前未保存的进度会清除；已经进入长期地图的记录仍会保留。</p><footer><button className="v3-text" type="button" onClick={onCancel}>保留现在</button><button className="v3-danger" type="button" onClick={onConfirm}>清除本次进度</button></footer></section></div>;
}

export default function InnerMirrorV3() {
  const [session, setSession] = useState<V3Session | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<"landing" | "session" | "history">("landing");
  const [legal, setLegal] = useState<"privacy" | "terms" | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    const restored = restoreSession(localStorage.getItem(ACTIVE_KEY));
    const saved = restoreHistory(localStorage.getItem(HISTORY_KEY));
    const migrated = migrateV2History(localStorage.getItem(V2_HISTORY_KEY));
    const merged = [...saved, ...migrated.filter((entry) => !saved.some((item) => item.id === entry.id))].sort((a, b) => b.createdAt - a.createdAt).slice(0, 30);
    queueMicrotask(() => { setSession(restored); setHistory(merged); setReady(true); });
    if (migrated.length) localStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
  }, []);
  useEffect(() => { if (!ready) return; if (session) localStorage.setItem(ACTIVE_KEY, JSON.stringify(session)); else localStorage.removeItem(ACTIVE_KEY); }, [ready, session]);
  useEffect(() => { if (ready) localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }, [history, ready]);
  useEffect(() => { window.scrollTo(0, 0); }, [session?.currentStep, view]);

  const start = () => { setSession(createSession(history.length)); setView("session"); };
  const reset = () => { setSession(null); setResetOpen(false); setView("landing"); };
  const update = (next: V3Session) => {
    let enriched = next.historyCountAtStart > 0 && next.priorityOrder.length ? { ...next, historicalComparison: buildHistoricalComparison(history, next) } : next;
    if (enriched.currentStep === "reflection" && !enriched.reflection) {
      const reflection = buildReflection(enriched);
      enriched = track({ ...enriched, reflection, openQuestion: reflection.openQuestion }, "reflection_viewed");
      const comparison = enriched.historicalComparison;
      if (comparison) {
        enriched = track(enriched, "agent_action_selected", { action: "COMPARE_HISTORY", reason: "returning_session" });
        enriched = track(enriched, "history_comparison_shown", { has_difference: Boolean(comparison.difference), has_recurrence: Boolean(comparison.recurrence) });
      }
    }
    setSession(enriched);
  };
  const save = (current: V3Session) => {
    const entry = createHistoryEntry(current);
    let complete = track({ ...current, currentStep: "done", agentDecision: { action: "STOP", primaryKey: current.primaryKey, alternativeKey: current.alternativeKey, reasonCode: "user_kept_one_insight", message: "今天先停在这里。", engine: "structured_fallback" } }, "agent_action_selected", { action: "STOP", reason: "user_kept_one_insight" });
    complete = track(complete, "session_saved", { history_count: history.length + 1 });
    complete = track(complete, "session_completed");
    setHistory((items) => [entry, ...items.filter((item) => item.sessionId !== entry.sessionId)].slice(0, 30));
    setSession(complete);
  };
  const page = (() => {
    if (view === "history") return <HistoryView history={history} onHome={() => setView("landing")} onStart={start} />;
    if (view === "landing" || !session) return <Landing draft={session} history={history} onContinue={() => setView("session")} onStart={start} onHistory={() => setView("history")} onLegal={setLegal} />;
    const common = { session, onChange: update, onHome: () => setView("landing"), onReset: () => setResetOpen(true) };
    switch (session.currentStep) {
      case "entry": return <Entry {...common} history={history} />;
      case "pulse": return <Pulse {...common} />;
      case "priorities": return <Priorities {...common} />;
      case "adaptive": return <Adaptive {...common} />;
      case "map": return <MapScreen {...common} />;
      case "mirror": return <MirrorArrangement {...common} />;
      case "reflection": return <ReflectionScreen {...common} />;
      case "keep": return <KeepScreen {...common} onSave={save} />;
      case "done": return <DoneScreen session={session} onEnd={() => { setSession(null); setView("landing"); }} onHistory={() => setView("history")} onStart={start} />;
      default: return <Entry {...common} history={history} />;
    }
  })();

  return <div className={`v3-root ${ready ? "is-ready" : ""}`}><a className="v3-skip" href="#main-content">跳到主要内容</a>{page}{legal && <LegalPanel kind={legal} onClose={() => setLegal(null)} />}{resetOpen && <ResetDialog onCancel={() => setResetOpen(false)} onConfirm={reset} />}</div>;
}
