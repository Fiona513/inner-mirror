"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  QUESTION_BANK,
  answerQuestion,
  attentionOptions,
  chooseIntent,
  confirmHypothesis,
  createSession,
  getDomainLabel,
  getHypothesisLabel,
  intentOptions,
  needLabels,
  needOptions,
  recordRanking,
  recordScan,
  restoreSession,
  revealMap,
  selectNextQuestion,
  stateOptions,
  type AgentDecision,
  type ChoiceOption,
  type CurrentInnerMap,
  type Phase1Session,
} from "./phase1-model";

const ACTIVE_KEY = "inner-mirror:v3:phase1-session";
const LEGACY_ACTIVE_KEY = "inner-mirror:v3:active-session";

const stepOrder: Phase1Session["currentStep"][] = ["entry", "scan_state", "scan_attention", "scan_needs", "prioritize", "branch", "adaptive", "map_review", "complete"];
const statusLabel: Record<CurrentInnerMap["nodes"][number]["status"], string> = {
  clear: "比较明确",
  emerging: "正在形成",
  uncertain: "尚不确定",
  contradictory: "出现矛盾",
};
const relationLabel: Record<CurrentInnerMap["edges"][number]["relation"], string> = {
  related: "比较明确",
  possibly_related: "可能有关",
  conflicting: "出现矛盾",
};

function Brand({ onClick }: { onClick: () => void }) {
  return <button className="p1-brand" type="button" onClick={onClick} aria-label="回到 Inner Mirror 首页"><i aria-hidden="true">◐</i><span>INNER MIRROR</span><small>内在镜像</small></button>;
}

function Header({ session, onHome, onReset }: { session?: Phase1Session | null; onHome: () => void; onReset?: () => void }) {
  const current = session ? Math.max(0, stepOrder.indexOf(session.currentStep)) : 0;
  return <header className="p1-header">
    <Brand onClick={onHome} />
    {session && <div className="p1-progress" aria-label={`Phase 1 进度 ${current} / ${stepOrder.length - 1}`}><span style={{ transform: `scaleX(${current / (stepOrder.length - 1)})` }} /></div>}
    <nav aria-label="体验导航">
      {session && <span>MAP · {String(session.currentInnerMap.version).padStart(2, "0")}</span>}
      {onReset && <button type="button" onClick={onReset}>重新开始</button>}
    </nav>
  </header>;
}

function Landing({ draft, onStart, onContinue, onLegal }: { draft: Phase1Session | null; onStart: () => void; onContinue: () => void; onLegal: (kind: "privacy" | "boundary") => void }) {
  return <main id="main-content" className="p1-landing p1-enter">
    <Header onHome={() => undefined} />
    <section className="p1-hero">
      <div className="p1-hero-copy">
        <p className="p1-kicker">INNER MIRROR · CURRENT INNER MAP</p>
        <h1>让选择，<br />改变接下来的路。</h1>
        <p>几个轻量选择会逐步改变系统接下来的提问、暂时保留的解释，以及一张只属于“这一次”的 Inner Map。</p>
        <div className="p1-hero-actions">
          <button className="p1-primary" type="button" onClick={draft ? onContinue : onStart}>{draft ? draft.currentStep === "complete" ? "回到这次 Inner Map" : "继续刚才的探索" : "开始探索"}<span>↗</span></button>
          {draft && <button className="p1-text" type="button" onClick={onStart}>开始新的</button>}
        </div>
        <small>不是心理测试，也不提供医疗诊断。只理解这一次的状态与需要。</small>
      </div>
      <div className="p1-hero-map" aria-hidden="true">
        <span className="p1-orbit orbit-one" />
        <span className="p1-orbit orbit-two" />
        <i className="p1-hero-node node-state">当前状态</i>
        <i className="p1-hero-node node-need">当前需要</i>
        <i className="p1-hero-node node-open">尚未确定</i>
        <b>这一次</b>
      </div>
    </section>
    <footer className="p1-footer"><span>© 2026 INNER MIRROR</span><div><button type="button" onClick={() => onLegal("privacy")}>隐私说明</button><button type="button" onClick={() => onLegal("boundary")}>使用边界</button></div></footer>
  </main>;
}

type ScreenProps = { session: Phase1Session; onChange: (session: Phase1Session) => void; onHome: () => void; onReset: () => void };

function EntryScreen({ session, onChange, onHome, onReset }: ScreenProps) {
  return <main id="main-content" className="p1-shell p1-enter">
    <Header session={session} onHome={onHome} onReset={onReset} />
    <section className="p1-entry-layout">
      <div className="p1-step-copy"><p className="p1-kicker">ENTRY · 00</p><h1>今天，你想看清什么？</h1><p>入口会改变初始关注领域与候选问题的优先级。它只决定从哪里开始，不会定义你。</p></div>
      <div className="p1-intents">{intentOptions.map((option, index) => <button key={option.id} type="button" onClick={() => onChange(chooseIntent(session, option.id))}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{option.label}</strong><small>{option.detail}</small></div><i>→</i></button>)}</div>
    </section>
  </main>;
}

function toggleSelection(current: string[], optionId: string, max: number, exclusiveId?: string) {
  if (current.includes(optionId)) return current.filter((item) => item !== optionId);
  if (optionId === exclusiveId) return [optionId];
  const withoutExclusive = current.filter((item) => item !== exclusiveId);
  return withoutExclusive.length < max ? [...withoutExclusive, optionId] : [...withoutExclusive.slice(1), optionId];
}

function ScanScreen({ session, onChange, onHome, onReset, scanId, title, intro, options, max, min = 1, number, exclusiveId }: ScreenProps & { scanId: "scan_state" | "scan_attention" | "scan_needs"; title: string; intro: string; options: ChoiceOption[]; max: number; min?: number; number: string; exclusiveId?: string }) {
  const [selected, setSelected] = useState<string[]>(session.answers[scanId] ?? []);
  const commit = () => onChange(recordScan(session, scanId, selected));
  return <main id="main-content" className="p1-shell p1-enter">
    <Header session={session} onHome={onHome} onReset={onReset} />
    <section className="p1-scan-layout">
      <div className="p1-step-copy"><p className="p1-kicker">LIGHT SIGNAL · {number}</p><h1>{title}</h1><p>{intro}</p><small>最多选择 {max} 项 · {min > 1 ? `至少选择 ${min} 项` : "都不太像也可以"}</small></div>
      <div className="p1-choice-grid">{options.map((option) => {
        const active = selected.includes(option.id);
        return <button key={option.id} className={active ? "is-selected" : ""} type="button" aria-pressed={active} onClick={() => setSelected((current) => toggleSelection(current, option.id, max, exclusiveId))}><i /><strong>{option.label}</strong>{option.detail && <small>{option.detail}</small>}</button>;
      })}<div className="p1-submit"><span>{selected.length} / {max}</span><button className="p1-primary" type="button" disabled={selected.length < min} onClick={commit}>记录这组信号 <b>→</b></button></div></div>
      {session.currentInnerMap.nodes.length > 0 && <MapPeek session={session} />}
    </section>
  </main>;
}

function RankingScreen({ session, onChange, onHome, onReset }: ScreenProps) {
  const candidates = session.answers.scan_needs ?? [];
  const [order, setOrder] = useState(session.priorityOrder.length ? session.priorityOrder : candidates);
  const move = (index: number, direction: -1 | 1) => setOrder((current) => {
    const target = index + direction;
    if (target < 0 || target >= current.length) return current;
    const copy = [...current];
    [copy[index], copy[target]] = [copy[target], copy[index]];
    return copy;
  });
  return <main id="main-content" className="p1-shell p1-enter">
    <Header session={session} onHome={onHome} onReset={onReset} />
    <section className="p1-ranking-layout">
      <div className="p1-step-copy"><p className="p1-kicker">PRIORITIZE · 04</p><h1>如果只能先满足一个，什么应该在最前面？</h1><p>用箭头完成相对排序。不是只选一个；前后位置都会成为本次模型的真实信号。</p></div>
      <ol className="p1-ranking">{order.map((id, index) => <li key={id}><span>{String(index + 1).padStart(2, "0")}</span><strong>{needLabels[id] ?? id}</strong><div><button type="button" disabled={index === 0} aria-label={`上移${needLabels[id]}`} onClick={() => move(index, -1)}>↑</button><button type="button" disabled={index === order.length - 1} aria-label={`下移${needLabels[id]}`} onClick={() => move(index, 1)}>↓</button></div></li>)}<footer><span>排序会改变下一步</span><button className="p1-primary" type="button" onClick={() => onChange(recordRanking(session, order))}>确认这个顺序 <b>→</b></button></footer></ol>
      <MapPeek session={session} />
    </section>
  </main>;
}

function DecisionNote({ decision }: { decision: AgentDecision }) {
  const label: Record<AgentDecision["action"], string> = { ASK: "继续区分", VERIFY: "验证矛盾", BRANCH: "路径已改变", REWEIGHT: "重新安排", REVEAL_MAP: "地图可见", UPDATE_MAP: "地图更新", REFLECT: "整理线索", STOP: "停在这里" };
  return <aside className={`p1-decision action-${decision.action.toLowerCase()}`} aria-live="polite"><span>NEXT MOVE · {label[decision.action]}</span><p>{decision.message}</p></aside>;
}

function BranchScreen({ session, onChange, onHome, onReset }: ScreenProps) {
  const decision = session.agentDecision;
  return <main id="main-content" className="p1-shell p1-enter">
    <Header session={session} onHome={onHome} onReset={onReset} />
    <section className="p1-branch-layout">
      <div className="p1-branch-copy"><p className="p1-kicker">FIRST CHANGE · 05</p><h1>{session.contradictions.length ? "这里出现了两个不完全一致的线索。" : "目前有两个方向开始变得突出。"}</h1><p>下一步不会继续固定题序，而是优先区分这两个方向。</p><div className="p1-direction-pair"><article><span>更突出</span><strong>{getHypothesisLabel(session.primaryKey)}</strong></article><article><span>仍需区分</span><strong>{getHypothesisLabel(session.alternativeKey)}</strong></article></div>{decision && <DecisionNote decision={decision} />}<button className="p1-primary" type="button" onClick={() => onChange({ ...session, currentStep: "adaptive" })}>{decision?.action === "VERIFY" ? "先验证这组矛盾" : "继续区分"}<b>→</b></button></div>
      <MapCanvas map={session.currentInnerMap} compact />
    </section>
  </main>;
}

function MapPeek({ session }: { session: Phase1Session }) {
  return <aside className="p1-map-peek"><header><span>CURRENT INNER MAP</span><b>选择正在改变它</b></header><div>{session.currentInnerMap.nodes.slice(0, 3).map((node) => <span key={node.id} className={`status-${node.status}`}><i />{node.label}</span>)}</div>{session.currentInnerMap.edges[0] && <small>{relationLabel[session.currentInnerMap.edges[0].relation]}</small>}</aside>;
}

type SelectedMapItem = { kind: "node" | "edge"; id: string } | null;

function MapCanvas({ map, compact = false }: { map: CurrentInnerMap; compact?: boolean }) {
  const [selected, setSelected] = useState<SelectedMapItem>(null);
  const node = selected?.kind === "node" ? map.nodes.find((item) => item.id === selected.id) : undefined;
  const edge = selected?.kind === "edge" ? map.edges.find((item) => item.id === selected.id) : undefined;
  const evidence = node?.evidence ?? edge?.evidence ?? [];
  return <section className={`p1-map-canvas ${compact ? "is-compact" : ""}`} aria-label="Current Inner Map">
    <div className="p1-map-field">
      <i className="p1-map-axis axis-x" aria-hidden="true" /><i className="p1-map-axis axis-y" aria-hidden="true" />
      {map.nodes.map((item, index) => <button key={item.id} type="button" className={`p1-map-node node-${index + 1} status-${item.status}`} onClick={() => setSelected({ kind: "node", id: item.id })}><small>{statusLabel[item.status]}</small><strong>{item.label}</strong><span>{getDomainLabel(item.domain)}</span></button>)}
    </div>
    <div className="p1-map-relations">{map.edges.length ? map.edges.map((item) => {
      const source = map.nodes.find((nodeItem) => nodeItem.id === item.source)?.label;
      const target = map.nodes.find((nodeItem) => nodeItem.id === item.target)?.label;
      return <button key={item.id} type="button" className={`relation-${item.relation}`} onClick={() => setSelected({ kind: "edge", id: item.id })}><span>{source}</span><i>{relationLabel[item.relation]}</i><span>{target}</span></button>;
    }) : <p>更多关系会在排序与情境选择后出现。</p>}</div>
    {!compact && <aside className="p1-evidence" aria-live="polite"><span>为什么会出现这个？</span>{selected ? evidence.length ? evidence.map((item) => <p key={item}>{item}</p>) : <p>目前只有初步线索，因此仍标记为尚不确定。</p> : <p>点击任一节点或关系，查看形成它的简短证据。</p>}</aside>}
  </section>;
}

function QuestionScreen({ session, onChange, onHome, onReset }: ScreenProps) {
  const decision = session.agentDecision;
  const questionDefinition = QUESTION_BANK.find((item) => item.id === decision?.nextQuestionId) ?? selectNextQuestion(session);
  const attempted = useRef<string | null>(null);

  useEffect(() => {
    if (!questionDefinition || !decision || decision.action === "REVEAL_MAP" || decision.action === "STOP") return;
    const signature = `${session.primaryKey}:${session.alternativeKey}:${session.askedQuestionIds.join(",")}:${decision.action}`;
    if (attempted.current === signature) return;
    attempted.current = signature;
    const hasOpenContradiction = session.contradictions.some((item) => !session.handledContradictionIds.includes(item.id));
    const candidateQuestionIds = QUESTION_BANK
      .filter((item) => !session.askedQuestionIds.includes(item.id))
      .filter((item) => item.type !== "verification" || hasOpenContradiction)
      .filter((item) => item.id === questionDefinition.id || item.discriminatesBetween?.includes(session.primaryKey ?? "") || item.discriminatesBetween?.includes(session.alternativeKey ?? ""))
      .sort((a, b) => Number(b.id === questionDefinition.id) - Number(a.id === questionDefinition.id) || b.informationValue - a.informationValue)
      .slice(0, 3)
      .map((item) => item.id);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 4300);
    fetch("/api/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ primaryHypothesisKey: session.primaryKey, alternativeHypothesisKey: session.alternativeKey, hasContradiction: hasOpenContradiction, candidateActions: [decision.action], candidateQuestionIds }),
    }).then((response) => response.json()).then((payload: { mode?: string; decision?: { action?: string; selectedQuestionId?: string; transitionCopy?: string; reasonCode?: string } }) => {
      if (payload.mode !== "llm_assisted" || !payload.decision || payload.decision.action !== decision.action || !candidateQuestionIds.includes(payload.decision.selectedQuestionId ?? "")) return;
      onChange({ ...session, agentDecision: { ...decision, nextQuestionId: payload.decision.selectedQuestionId, message: payload.decision.transitionCopy?.slice(0, 92) || decision.message, reasonCode: payload.decision.reasonCode || decision.reasonCode, engine: "llm_assisted" } });
    }).catch(() => undefined).finally(() => window.clearTimeout(timeout));
    return () => { window.clearTimeout(timeout); controller.abort(); };
  }, [decision, onChange, questionDefinition, session]);

  if (!questionDefinition || decision?.action === "REVEAL_MAP") {
    return <main id="main-content" className="p1-shell p1-enter"><Header session={session} onHome={onHome} onReset={onReset} /><section className="p1-ready-map"><DecisionNote decision={decision ?? { action: "REVEAL_MAP", reasonCode: "enough", message: "目前的信息已经足够形成第一张 Inner Map。", engine: "structured_fallback" }} /><h1>先看看，地图现在变成了什么样。</h1><MapPeek session={session} /><button className="p1-primary" type="button" onClick={() => onChange(revealMap(session))}>打开 Current Inner Map <b>→</b></button></section></main>;
  }

  const answer = (optionId: string) => {
    let next = answerQuestion(session, questionDefinition.id, optionId);
    if (next.agentDecision?.action === "REVEAL_MAP") next = revealMap(next);
    onChange(next);
  };

  return <main id="main-content" className="p1-shell p1-enter">
    <Header session={session} onHome={onHome} onReset={onReset} />
    <section className="p1-question-layout">
      <div><DecisionNote decision={decision ?? { action: "ASK", reasonCode: "information", message: "这里还有一点没有区分清楚。", engine: "structured_fallback" }} /><p className="p1-kicker">{questionDefinition.type === "verification" ? "VERIFY" : questionDefinition.type.toUpperCase()} · {String(session.actionCount + 1).padStart(2, "0")}</p><h1>{questionDefinition.prompt}</h1><p>{questionDefinition.support}</p></div>
      <div className="p1-question-options">{questionDefinition.options.map((option, index) => <button key={option.id} type="button" onClick={() => answer(option.id)}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{option.label}</strong>{option.detail && <small>{option.detail}</small>}</div><i>→</i></button>)}</div>
      <MapPeek session={session} />
    </section>
  </main>;
}

function MapReviewScreen({ session, onChange, onHome, onReset, onStart }: ScreenProps & { onStart: () => void }) {
  const primary = session.hypotheses.find((item) => item.key === session.primaryKey);
  const alternative = session.hypotheses.find((item) => item.key === session.alternativeKey);
  const complete = session.currentStep === "complete";
  const respond = (response: "confirmed" | "partial" | "rejected" | "alternative") => onChange(confirmHypothesis(session, response));
  return <main id="main-content" className="p1-map-page p1-enter">
    <Header session={session} onHome={onHome} onReset={onReset} />
    <section className="p1-map-layout">
      <div className="p1-map-copy"><p className="p1-kicker">CURRENT INNER MAP · {complete ? "CONFIRMED" : "EMERGING"}</p><h1>{complete ? "已经形成第一张属于这次探索的 Inner Map。" : "这不是结论，而是一张可以被你修正的地图。"}</h1><p>{complete ? "一条方向已经得到你的确认；另一条仍然保留为尚不确定。今天先停在这里。" : "现在更突出的方向、它可能连接的部分，以及还没有看清的内容，都留在同一张图里。"}</p>
        {primary && <article className="p1-hypothesis"><span>{primary.confirmation === "confirmed" ? "比较明确" : primary.confirmation === "partial" ? "正在形成" : "目前更像是"}</span><p>{primary.statement}</p></article>}
        {alternative && <article className="p1-alternative"><span>仍然保留</span><p>{alternative.statement}</p></article>}
      </div>
      <MapCanvas map={session.currentInnerMap} />
    </section>
    {!complete ? <section className="p1-confirmation"><div><span>USER CORRECTION</span><p>这组理解离你有多近？</p></div><div><button type="button" onClick={() => respond("confirmed")}>很贴近</button><button type="button" onClick={() => respond("partial")}>有一点像</button><button type="button" onClick={() => respond("rejected")}>不太像</button><button type="button" onClick={() => respond("alternative")}>更接近另一个方向</button></div></section> : <section className="p1-complete-actions"><p>Phase 1 到这里结束。地图仍会保存在当前浏览器。</p><div><button className="p1-primary" type="button" onClick={onStart}>开始一次新的观察 <b>↗</b></button><button className="p1-text" type="button" onClick={onHome}>回到首页</button></div></section>}
  </main>;
}

function LegalPanel({ kind, onClose }: { kind: "privacy" | "boundary"; onClose: () => void }) {
  return <div className="p1-modal"><section role="dialog" aria-modal="true" aria-labelledby="legal-title"><button type="button" onClick={onClose} aria-label="关闭">×</button><p className="p1-kicker">{kind === "privacy" ? "PRIVACY" : "BOUNDARIES"}</p><h2 id="legal-title">{kind === "privacy" ? "数据如何流动" : "Inner Mirror 的使用边界"}</h2>{kind === "privacy" ? <><p>你的选择、Signal、Current Inner Map 与本地事件默认保存在当前浏览器的 LocalStorage。</p><p>每轮问题选择会向本站服务端发送假设 ID、候选动作与批准的问题 ID；不包含自由文字。若服务端未配置辅助模型或请求失败，流程会完全由本地规则继续。</p></> : <><p>Inner Mirror 是自我探索产品，不是心理测试、医疗诊断或危机服务。首次探索只描述这一次的状态、需要与尚未确认的关系。</p><p>如果你正处于紧急危险或需要即时支持，请联系所在地紧急服务或一位可信任的人。</p></>}</section></div>;
}

function ResetDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return <div className="p1-modal"><section role="dialog" aria-modal="true" aria-labelledby="reset-title"><button type="button" onClick={onCancel} aria-label="关闭">×</button><p className="p1-kicker">RESTART</p><h2 id="reset-title">重新开始这次探索？</h2><p>当前 Session 的选择与地图会从这台设备清除，然后正常进入新版入口。</p><footer><button className="p1-text" type="button" onClick={onCancel}>保留现在</button><button className="p1-danger" type="button" onClick={onConfirm}>清除本次 Session</button></footer></section></div>;
}

export default function InnerMirrorPhase1() {
  const [session, setSession] = useState<Phase1Session | null>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<"landing" | "session">("landing");
  const [legal, setLegal] = useState<"privacy" | "boundary" | null>(null);
  const [resetOpen, setResetOpen] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(ACTIVE_KEY);
    const restored = restoreSession(raw);
    if (raw && !restored) localStorage.removeItem(ACTIVE_KEY);
    if (localStorage.getItem(LEGACY_ACTIVE_KEY)) localStorage.removeItem(LEGACY_ACTIVE_KEY);
    queueMicrotask(() => { setSession(restored); setReady(true); });
  }, []);
  useEffect(() => {
    if (!ready) return;
    if (session) localStorage.setItem(ACTIVE_KEY, JSON.stringify(session));
    else localStorage.removeItem(ACTIVE_KEY);
  }, [ready, session]);
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [session?.currentStep, view]);

  const start = () => { setSession(createSession()); setView("session"); };
  const reset = () => { setSession(null); setResetOpen(false); setView("landing"); };
  const update = (next: Phase1Session) => setSession(next);
  const common = useMemo(() => session ? { session, onChange: update, onHome: () => setView("landing"), onReset: () => setResetOpen(true) } : null, [session]);

  let page: React.ReactNode;
  if (view === "landing" || !session || !common) page = <Landing draft={session} onStart={start} onContinue={() => setView("session")} onLegal={setLegal} />;
  else {
    switch (session.currentStep) {
      case "entry": page = <EntryScreen {...common} />; break;
      case "scan_state": page = <ScanScreen {...common} scanId="scan_state" title="现在的你，更接近哪些状态？" intro="先收集此刻，不急着解释原因。地图会从这组选择出现第一个节点。" options={stateOptions} max={3} number="01" exclusiveId="none" />; break;
      case "scan_attention": page = <ScanScreen {...common} scanId="scan_attention" title="最近最容易占据你注意力的是什么？" intro="这组选择会决定接下来更先看状态、关系、自我评价，还是方向。" options={attentionOptions} max={2} number="02" />; break;
      case "scan_needs": page = <ScanScreen {...common} scanId="scan_needs" title="如果现在能先改变一点，你希望得到哪些东西？" intro="先留下 3–4 个候选需要；下一步会让它们产生真实的相对优先级。" options={needOptions} max={4} min={3} number="03" />; break;
      case "prioritize": page = <RankingScreen {...common} />; break;
      case "branch": page = <BranchScreen {...common} />; break;
      case "adaptive": page = <QuestionScreen {...common} />; break;
      case "map_review":
      case "complete": page = <MapReviewScreen {...common} onStart={start} />; break;
      default: page = <EntryScreen {...common} />;
    }
  }

  return <div className={`p1-root ${ready ? "is-ready" : ""}`}><a className="p1-skip" href="#main-content">跳到主要内容</a>{page}{legal && <LegalPanel kind={legal} onClose={() => setLegal(null)} />}{resetOpen && <ResetDialog onCancel={() => setResetOpen(false)} onConfirm={reset} />}</div>;
}
