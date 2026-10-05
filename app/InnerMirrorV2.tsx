"use client";

import { useEffect, useRef, useState } from "react";
import {
  QUESTION_BANK,
  AgentDecision,
  ExplorationIntent,
  InnerMapEntry,
  NeedKey,
  QuestionOption,
  RoomState,
  SessionStep,
  V2Session,
  answerAdaptiveQuestion,
  attentionOptions,
  buildReflection,
  completeInteraction,
  composeRoomState,
  createInnerMapEntry,
  createSession,
  detectSafetyRisk,
  getHypothesis,
  intentOptions,
  letterCandidates,
  makeAgentDecision,
  migrateLegacySessions,
  needLabels,
  needOptions,
  rankNeeds,
  recordSelections,
  restoreInnerMap,
  restoreSession,
  shortHypothesisName,
  stateOptions,
  track,
  verifyHypothesis,
} from "./v2-model";

const ACTIVE_SESSION_KEY = "inner-mirror:v2:active-session";
const INNER_MAP_KEY = "inner-mirror:v2:inner-map";
const LEGACY_SESSIONS_KEY = "inner-mirror:v2:saved-sessions";

const intentLabels: Record<ExplorationIntent, string> = {
  current_state: "最近的我",
  specific_concern: "正在困扰我的事",
  repeated_pattern: "反复出现的自己",
  find_direction: "我真正想要的方向",
};

const interactionLabels = { mirror: "镜子", window: "窗", letter: "信件" } as const;

function Brand({ onClick }: { onClick: () => void }) {
  return (
    <button className="im2-brand" type="button" onClick={onClick} aria-label="返回 Inner Mirror 首页">
      <span aria-hidden="true">◐</span><b>INNER MIRROR</b><small>内在镜像</small>
    </button>
  );
}

function Header({ onHome, onReset, onMap, step }: { onHome: () => void; onReset?: () => void; onMap?: () => void; step?: string }) {
  return (
    <header className="im2-header">
      <Brand onClick={onHome} />
      <div className="im2-header-actions">
        {step && <span>{step}</span>}
        {onMap && <button type="button" onClick={onMap}>Inner Map</button>}
        {onReset && <button type="button" onClick={onReset}>重新开始</button>}
      </div>
    </header>
  );
}

function Progress({ current }: { current: number }) {
  return <div className="im2-progress" aria-label={`探索进度 ${current}%`}><i style={{ width: `${current}%` }} /></div>;
}

function Landing({ hasDraft, mapCount, onStart, onFresh, onMap }: { hasDraft: boolean; mapCount: number; onStart: () => void; onFresh: () => void; onMap: () => void }) {
  return (
    <main className="im2-landing im2-enter">
      <div className="im2-grain" aria-hidden="true" />
      <Header onHome={() => undefined} onMap={mapCount ? onMap : undefined} />
      <section className="im2-landing-copy">
        <p className="im2-kicker">ADAPTIVE SELF-DISCOVERY · DEVICE-LOCAL</p>
        <h1>看见此刻的自己。</h1>
        <p>用几个轻量选择开始。Inner Mirror 会根据你的回答调整探索，逐渐形成属于你此刻的空间。</p>
        <div className="im2-actions">
          <button className="im2-primary" type="button" onClick={onStart}>{hasDraft ? "继续这次探索" : "开始探索"}<span>→</span></button>
          {hasDraft && <button className="im2-text-button" type="button" onClick={onFresh}>开始新的探索</button>}
        </div>
        <small>约 2–4 分钟 · 无需长篇表达 · 内容只保留在当前设备</small>
      </section>
      <button className="im2-portal" type="button" onClick={onStart} aria-label="进入探索">
        <i /><span><b>BEGIN</b><small>从一个简单选择开始</small></span>
      </button>
      <p className="im2-disclaimer">Inner Mirror 用于自我探索，不提供心理或医疗诊断。</p>
    </main>
  );
}

function StepLayout({ eyebrow, title, support, progress, children, footer, onHome, onReset }: { eyebrow: string; title: string; support: string; progress: number; children: React.ReactNode; footer?: React.ReactNode; onHome: () => void; onReset: () => void }) {
  return (
    <main className="im2-shell im2-enter">
      <Header onHome={onHome} onReset={onReset} step={`EXPLORATION · ${String(Math.max(1, Math.round(progress / 12))).padStart(2, "0")}`} />
      <Progress current={progress} />
      <section className="im2-step">
        <div className="im2-step-copy"><p className="im2-kicker">{eyebrow}</p><h1>{title}</h1><p>{support}</p></div>
        <div className="im2-step-body">{children}</div>
      </section>
      {footer}
    </main>
  );
}

function Entry({ session, onContinue, onHome, onReset }: { session: V2Session; onContinue: (next: V2Session) => void; onHome: () => void; onReset: () => void }) {
  return (
    <StepLayout eyebrow="EXPLORATION ENTRY" title="今天，你想从哪里开始？" support="这会决定系统先关注哪一组线索。" progress={6} onHome={onHome} onReset={onReset}>
      <div className="im2-intent-grid">
        {intentOptions.map((option, index) => (
          <button key={option.id} type="button" onClick={() => onContinue(track({ ...session, explorationIntent: option.id, currentSessionStep: "scan_state" }, "entry_selected", { intent: option.id }))}>
            <span>{String(index + 1).padStart(2, "0")}</span><strong>{option.label}</strong><small>{option.detail}</small><i>↗</i>
          </button>
        ))}
      </div>
    </StepLayout>
  );
}

function MultiChoice({ options, initial, max, min = 1, noneId, buttonLabel, onSubmit }: { options: QuestionOption[]; initial: string[]; max: number; min?: number; noneId?: string; buttonLabel?: string; onSubmit: (selected: string[]) => void }) {
  const [selected, setSelected] = useState(initial);
  const toggle = (id: string) => {
    setSelected((current) => {
      if (id === noneId) return current.includes(id) ? [] : [id];
      const withoutNone = current.filter((item) => item !== noneId);
      if (withoutNone.includes(id)) return withoutNone.filter((item) => item !== id);
      return withoutNone.length >= max ? withoutNone : [...withoutNone, id];
    });
  };
  return (
    <>
      <div className="im2-option-grid">
        {options.map((option) => <button key={option.id} className={selected.includes(option.id) ? "is-selected" : ""} type="button" onClick={() => toggle(option.id)} aria-pressed={selected.includes(option.id)}><span>{option.label}</span><i aria-hidden="true" /></button>)}
      </div>
      <div className="im2-submit-row"><small>已选择 {selected.length} / {max}</small><button className="im2-primary" type="button" disabled={selected.length < min} onClick={() => onSubmit(selected)}>{buttonLabel ?? "继续"}<span>→</span></button></div>
    </>
  );
}

function ScanState({ session, onContinue, onHome, onReset }: ScreenProps) {
  return <StepLayout eyebrow="SCAN · CURRENT STATE" title="现在的你，更接近哪些状态？" support="最多选择 3 项。这里只收集线索，不形成结论。" progress={16} onHome={onHome} onReset={onReset}><MultiChoice options={stateOptions} initial={session.selections.scan_state ?? []} max={3} noneId="none" onSubmit={(ids) => onContinue({ ...recordSelections(session, "scan_state", ids, stateOptions), currentSessionStep: "scan_attention" })} /></StepLayout>;
}

type ScreenProps = { session: V2Session; onContinue: (next: V2Session) => void; onHome: () => void; onReset: () => void };

function ScanAttention({ session, onContinue, onHome, onReset }: ScreenProps) {
  return <StepLayout eyebrow="SCAN · ATTENTION" title="最近最容易占据你注意力的是什么？" support="选择 1–2 项。" progress={26} onHome={onHome} onReset={onReset}><MultiChoice options={attentionOptions} initial={session.selections.scan_attention ?? []} max={2} onSubmit={(ids) => onContinue({ ...recordSelections(session, "scan_attention", ids, attentionOptions), currentSessionStep: "scan_needs" })} /></StepLayout>;
}

function ScanNeeds({ session, onContinue, onHome, onReset }: ScreenProps) {
  return <StepLayout eyebrow="SCAN · CURRENT NEEDS" title="如果现在能立刻得到一些东西，你最希望是哪几种？" support="选择 2–4 项，下一步会真正排列优先级。" progress={36} onHome={onHome} onReset={onReset}><MultiChoice options={needOptions} initial={session.selections.scan_needs ?? []} min={2} max={4} buttonLabel="排列优先级" onSubmit={(ids) => { const scanned = recordSelections(session, "scan_needs", ids, needOptions); onContinue(track({ ...scanned, currentSessionStep: "prioritize" }, "scan_completed", { selected_needs: ids.length })); }} /></StepLayout>;
}

function Prioritize({ session, onContinue, onHome, onReset }: ScreenProps) {
  const initial = (session.rankings.length ? [...session.rankings].sort((a, b) => a.rank - b.rank).map((item) => item.need) : session.selections.scan_needs ?? []) as NeedKey[];
  const [order, setOrder] = useState(initial);
  const move = (index: number, delta: number) => setOrder((current) => { const target = index + delta; if (target < 0 || target >= current.length) return current; const next = [...current]; [next[index], next[target]] = [next[target], next[index]]; return next; });
  return (
    <StepLayout eyebrow="PRIORITIZE · A REAL TRADEOFF" title="如果现在只能先满足一个，你会把什么放在最前面？" support="用上下按钮排列。移动端也能稳定操作，这不是普通单选。" progress={46} onHome={onHome} onReset={onReset}>
      <ol className="im2-ranking">
        {order.map((need, index) => <li key={need}><span>{String(index + 1).padStart(2, "0")}</span><strong>{needLabels[need]}</strong><div><button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`上移${needLabels[need]}`}>↑</button><button type="button" onClick={() => move(index, 1)} disabled={index === order.length - 1} aria-label={`下移${needLabels[need]}`}>↓</button></div></li>)}
      </ol>
      <div className="im2-submit-row"><small>排序会比普通选择获得更高的结构化可靠度。</small><button className="im2-primary" type="button" onClick={() => { let next = track(rankNeeds(session, order), "ranking_completed", { ranked_needs: order.length }); next = { ...next, agentDecision: makeAgentDecision(next), currentSessionStep: "agent_transition" }; onContinue(next); }}>让系统继续<span>→</span></button></div>
    </StepLayout>
  );
}

function AgentTransition({ session, onUpdate, onContinue, onHome, onReset }: { session: V2Session; onUpdate: (next: V2Session) => void; onContinue: () => void; onHome: () => void; onReset: () => void }) {
  const decision = session.agentDecision ?? makeAgentDecision(session);
  useEffect(() => {
    if (decision.engine === "llm_assisted" || decision.nextAction !== "ask_question") return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 4800);
    fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ primaryHypothesisKey: session.primaryHypothesisKey, alternativeHypothesisKey: session.alternativeHypothesisKey, focusDimensions: decision.focusDimensions, candidateQuestionIds: QUESTION_BANK.filter((item) => !session.adaptiveQuestionIds.includes(item.id)).map((item) => item.id) }) })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        const selected = data?.decision?.selectedQuestionId;
        if (data?.mode !== "llm_assisted" || typeof selected !== "string") return;
        const assisted: AgentDecision = { ...makeAgentDecision(session, selected, "llm_assisted"), transitionCopy: typeof data.decision.transitionCopy === "string" ? data.decision.transitionCopy : decision.transitionCopy, reasonCode: String(data.decision.reasonCode ?? decision.reasonCode) };
        onUpdate({ ...session, agentDecision: assisted });
      }).catch(() => undefined).finally(() => window.clearTimeout(timer));
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [decision.engine, decision.focusDimensions, decision.nextAction, decision.reasonCode, decision.transitionCopy, session, onUpdate]);
  return (
    <main className="im2-shell im2-agent-screen im2-enter">
      <Header onHome={onHome} onReset={onReset} step="ADAPTIVE AGENT" />
      <section>
        <div className="im2-agent-orbit" aria-hidden="true"><i /><i /><span>◐</span></div>
        <p className="im2-kicker">A DIRECTION IS FORMING</p>
        <h1>我开始看到一个方向了。</h1>
        <p>{decision.transitionCopy}</p>
        <div className="im2-agent-note"><span>{decision.engine === "llm_assisted" ? "LLM-ASSISTED ROUTING" : "STRUCTURED FALLBACK"}</span><p>问题只能从审核过的题库中选择；置信度始终由本地结构化规则计算。</p></div>
        <button className="im2-primary" type="button" onClick={onContinue}>{decision.nextAction === "verify_hypothesis" ? "看看当前理解" : "继续一个具体情境"}<span>→</span></button>
      </section>
    </main>
  );
}

function AdaptiveQuestion({ session, onContinue, onHome, onReset }: ScreenProps) {
  const decision = session.agentDecision ?? makeAgentDecision(session);
  const question = QUESTION_BANK.find((item) => item.id === decision.selectedQuestionId) ?? QUESTION_BANK[0];
  const [selected, setSelected] = useState(session.selections[question.id]?.[0] ?? "");
  return (
    <StepLayout eyebrow={`AGENT EXPLORE · ${question.type.toUpperCase()}`} title={question.prompt} support={question.support} progress={58 + session.adaptiveQuestionIds.length * 9} onHome={onHome} onReset={onReset}>
      <div className="im2-adaptive-options">
        {question.options.map((option, index) => <button key={option.id} className={selected === option.id ? "is-selected" : ""} type="button" onClick={() => setSelected(option.id)}><span>{String(index + 1).padStart(2, "0")}</span><div><strong>{option.label}</strong>{option.detail && <small>{option.detail}</small>}</div><i /></button>)}
      </div>
      <div className="im2-submit-row"><small>这一题用于区分两个解释，不会单独定义你。</small><button className="im2-primary" type="button" disabled={!selected} onClick={() => { const answered = answerAdaptiveQuestion(session, question.id, selected); const nextDecision = makeAgentDecision(answered); const targetStep = nextDecision.nextAction === "verify_hypothesis" ? "verify" : "agent_transition"; const next = targetStep === "verify" ? track(answered, "hypothesis_shown", { hypothesis_key: answered.primaryHypothesisKey ?? "unknown" }) : answered; onContinue({ ...next, agentDecision: nextDecision, currentSessionStep: targetStep }); }}>继续<span>→</span></button></div>
    </StepLayout>
  );
}

function Verify({ session, onContinue, onHome, onReset }: ScreenProps) {
  const primary = getHypothesis(session);
  if (!primary) return null;
  const finish = (state: "confirmed" | "partial") => { let next = verifyHypothesis(session, state); next = track(next, "room_revealed", { primary: next.primaryHypothesisKey ?? "unknown" }); onContinue({ ...next, roomState: composeRoomState(next), currentSessionStep: "room_reveal" }); };
  const reject = () => { const next = verifyHypothesis(session, "rejected"); const decision = makeAgentDecision(next); onContinue(next.verificationAttempts >= 2 ? { ...next, roomState: composeRoomState(next), currentSessionStep: "room_reveal" } : { ...next, agentDecision: decision, currentSessionStep: "agent_transition" }); };
  return (
    <StepLayout eyebrow="VERIFY · YOU KEEP THE LAST WORD" title="我现在更倾向于觉得：" support="这是等待你修正的假设，不是诊断，也不是人格标签。" progress={78} onHome={onHome} onReset={onReset}>
      <blockquote className="im2-hypothesis">{primary.statement}</blockquote>
      <div className="im2-verify-actions">
        <button type="button" onClick={() => finish("confirmed")}><strong>很贴近我</strong><small>提高这条假设的可靠度</small></button>
        <button type="button" onClick={() => finish("partial")}><strong>有一点像</strong><small>保留不确定性</small></button>
        <button type="button" onClick={reject}><strong>不太像</strong><small>降低它，并改变后续问题</small></button>
        <button type="button" onClick={() => onContinue({ ...session, currentSessionStep: "alternative" })}><strong>更接近另一个方向</strong><small>由你选择更贴近的解释</small></button>
      </div>
    </StepLayout>
  );
}

function Alternative({ session, onContinue, onHome, onReset }: ScreenProps) {
  const alternatives = session.hypotheses.filter((item) => item.key !== session.primaryHypothesisKey && item.confirmation !== "rejected").slice(0, 3);
  return (
    <StepLayout eyebrow="CORRECT THE MODEL" title="哪个方向更接近你？" support="你的选择会替换当前主要假设，并重新组合房间。" progress={82} onHome={onHome} onReset={onReset}>
      <div className="im2-alternatives">{alternatives.map((item) => <button key={item.key} type="button" onClick={() => { let next = verifyHypothesis(session, "confirmed", item.key); next = track(next, "room_revealed", { primary: item.key }); onContinue({ ...next, roomState: composeRoomState(next), currentSessionStep: "room_reveal" }); }}><span>{shortHypothesisName(item.key)}</span><p>{item.statement}</p><i>→</i></button>)}</div>
    </StepLayout>
  );
}

function RoomScene({ room, onObject }: { room: RoomState; onObject?: (kind: "mirror" | "window" | "letter") => void }) {
  const mirrorState = room.mirror.state;
  return (
    <div className={`im2-room-scene mirror-${mirrorState} window-${room.window.state}`} style={{ "--room-light": room.light.level, "--room-open": room.space.openness } as React.CSSProperties}>
      <div className="im2-room-glow" /><div className="im2-room-wall left" /><div className="im2-room-wall right" /><div className="im2-room-floor" />
      <button className="im2-window-object" type="button" onClick={() => onObject?.("window")} aria-label={`窗，当前状态 ${room.window.state}`}><i /><i /><span>WINDOW</span></button>
      <button className="im2-mirror-object" type="button" onClick={() => onObject?.("mirror")} aria-label={`镜子，当前状态 ${mirrorState}`}>
        <span className="im2-mirror-frame">{[1, 2, 3, 4, 5, 6].map((id) => <i key={id} className={`piece p${id}`} />)}</span><small>MIRROR</small>
      </button>
      <button className="im2-letter-object" type="button" onClick={() => onObject?.("letter")} aria-label={`信件，当前状态 ${room.letter.state}`}><span>✦</span><i /><small>LETTER</small></button>
      <div className="im2-room-lamp"><i /><span /></div>
    </div>
  );
}

function RoomReveal({ session, onEnter, onHome, onReset }: { session: V2Session; onEnter: () => void; onHome: () => void; onReset: () => void }) {
  const room = session.roomState ?? composeRoomState(session);
  return (
    <main className="im2-shell im2-reveal im2-enter"><Header onHome={onHome} onReset={onReset} step="ROOM REVEAL" /><section><RoomScene room={room} /><div className="im2-reveal-copy"><p className="im2-kicker">YOUR INNER ROOM · NOW</p><h1>这是你此刻的 Inner Room。</h1><p>这里的变化，都来自你刚才留下的线索。先看一会儿，再进入。</p><button className="im2-primary" type="button" onClick={onEnter}>进入房间<span>→</span></button></div></section></main>
  );
}

function Room({ session, onContinue, onHome, onReset }: ScreenProps) {
  const room = session.roomState ?? composeRoomState(session); const completed = session.completedInteractions.length;
  const open = (kind: "mirror" | "window" | "letter") => onContinue(track({ ...session, currentSessionStep: `${kind}_interaction` as SessionStep }, "interaction_started", { interaction: kind }));
  return (
    <main className="im2-shell im2-room-page im2-enter"><Header onHome={onHome} onReset={onReset} step="INNER ROOM" /><section><RoomScene room={room} onObject={open} /><aside className="im2-room-panel"><p className="im2-kicker">A SPACE BUILT FROM YOUR SIGNALS</p><h1>先靠近一个地方。</h1><p>推荐：{room.recommendedInteractions.map((item) => interactionLabels[item]).join(" · ")}。完成 1 个互动即可继续。</p><div className="im2-room-status"><span>{completed ? `${completed} 个地方已经变得不同。` : "点击房间中的物件，观察它为何呈现现在的状态。"}</span><i /></div><ul>{room.recommendedInteractions.map((item) => <li key={item}><b>{interactionLabels[item]}</b><span>{room.evidence[item][0]}</span></li>)}</ul><button className="im2-primary" type="button" disabled={!completed} onClick={() => onContinue(track({ ...session, reflection: buildReflection(session), currentSessionStep: "reflection" }, "reflection_viewed"))}>看见这次发现<span>→</span></button></aside></section></main>
  );
}

const mirrorShardLabels = ["我的选择", "别人的期待", "害怕失败", "希望被认可", "仍在成长", "真正想要的"];

function MirrorInteraction({ session, onContinue, onHome, onReset }: ScreenProps) {
  const room = session.roomState ?? composeRoomState(session); const fragmented = room.mirror.state === "fragmented" || room.mirror.state === "restored"; const placedRef = useRef(session.restoredMirrorShards); const [placed, setPlaced] = useState(session.restoredMirrorShards); const restored = room.mirror.state === "restored" && placed.length === 6;
  const place = (id: string) => { const current = placedRef.current; if (current.includes(id)) return; const shards = [...current, id]; placedRef.current = shards; setPlaced(shards); let next = { ...session, restoredMirrorShards: shards }; if (shards.length === 6) next = completeInteraction(next, "mirror"); onContinue(next); };
  return (
    <main className="im2-shell im2-object-page im2-enter"><Header onHome={onHome} onReset={onReset} step="MIRROR" /><section><div className={`im2-mirror-game ${fragmented ? "is-fragmented" : "is-stable"}`}><div className="im2-game-frame">{mirrorShardLabels.map((label, index) => { const id = `shard-${index + 1}`; return <i key={id} aria-hidden="true" className={`game-shard gs${index + 1} ${placed.includes(id) ? "is-placed" : ""}`}><span>{label}</span></i>; })}</div>{fragmented && placed.length < 6 && <div className="im2-shard-tray" aria-label="待归位的镜面碎片">{mirrorShardLabels.map((label, index) => { const id = `shard-${index + 1}`; return !placed.includes(id) && <button key={id} type="button" onClick={() => place(id)}><i aria-hidden="true" />{label}</button>; })}</div>}</div><div className="im2-object-copy"><p className="im2-kicker">SELF · MIRROR</p><h1>{restored ? "镜面已经重新归位。" : fragmented ? "重新组织你怎么看自己。" : room.mirror.state === "blurred" ? "镜面有些模糊，但没有破碎。" : "这面镜子保持完整。"}</h1><p>{room.evidence.mirror[0]}</p>{fragmented ? <><div className="im2-piece-progress"><i style={{ width: `${placed.length / 6 * 100}%` }} /><span>{placed.length} / 6 已归位</span></div>{placed.length === 6 && <button className="im2-primary" type="button" onClick={() => onContinue({ ...session, currentSessionStep: "room" })}>回到房间<span>→</span></button>}</> : <button className="im2-primary" type="button" onClick={() => onContinue({ ...completeInteraction(session, "mirror"), currentSessionStep: "room" })}>完成观察<span>→</span></button>}</div></section></main>
  );
}

function WindowInteraction({ session, onContinue, onHome, onReset }: ScreenProps) {
  const room = session.roomState ?? composeRoomState(session); const [choice, setChoice] = useState("");
  const options = ["一点安静", "一点确定", "一点连接", "一点空间"];
  return (
    <main className="im2-shell im2-object-page im2-window-page im2-enter"><Header onHome={onHome} onReset={onReset} step="WINDOW" /><section><div className={`im2-window-large state-${room.window.state}`}><i /><i /><span /></div><div className="im2-object-copy"><p className="im2-kicker">RELATIONSHIP · OPENNESS</p><h1>此刻，你更愿意让什么进入这里？</h1><p>{room.evidence.window[0]}</p><div className="im2-small-options">{options.map((item) => <button key={item} className={choice === item ? "is-selected" : ""} type="button" onClick={() => setChoice(item)}>{item}</button>)}</div><button className="im2-primary" type="button" disabled={!choice} onClick={() => onContinue({ ...completeInteraction(session, "window"), currentSessionStep: "room" })}>打开这扇窗<span>→</span></button></div></section></main>
  );
}

function LetterInteraction({ session, onContinue, onSafety, onHome, onReset }: ScreenProps & { onSafety: (next: V2Session) => void }) {
  const candidates = letterCandidates(session); const [selected, setSelected] = useState(""); const [edited, setEdited] = useState("");
  const save = () => { const text = edited.trim() || selected; if (!text) return; if (detectSafetyRisk(text)) return onSafety({ ...session, safetyExit: true, currentSessionStep: "safety" }); onContinue({ ...completeInteraction(session, "letter", text), currentSessionStep: "room" }); };
  return (
    <main className="im2-shell im2-letter-page im2-enter"><Header onHome={onHome} onReset={onReset} step="LETTER" /><section><div className="im2-letter-visual" aria-hidden="true"><div><span>TO · THE PART I DIDN&apos;T SAY</span><i /></div></div><div className="im2-object-copy"><p className="im2-kicker">EXPRESSION · OPTIONAL WRITING</p><h1>选择一句想留下的话。</h1><p>你可以直接使用候选句。修改文字完全可选。</p><div className="im2-letter-candidates">{candidates.map((item) => <button key={item} className={selected === item ? "is-selected" : ""} type="button" onClick={() => { setSelected(item); setEdited(""); }}>{item}</button>)}</div>{selected && <label className="im2-optional-input"><span>修改这句话 <small>可选</small></span><textarea rows={3} maxLength={240} value={edited} onChange={(event) => setEdited(event.target.value)} placeholder={selected} /></label>}<div className="im2-inline-actions"><button className="im2-text-button" type="button" onClick={() => onContinue({ ...session, currentSessionStep: "room" })}>暂时不留</button><button className="im2-primary" type="button" disabled={!selected && !edited.trim()} onClick={save}>封存这句话<span>→</span></button></div></div></section></main>
  );
}

function Reflection({ session, onSave, onHome, onReset }: { session: V2Session; onSave: (next: V2Session) => void; onHome: () => void; onReset: () => void }) {
  const reflection = session.reflection ?? buildReflection(session); const [takeaway, setTakeaway] = useState(session.selectedTakeaway ?? "");
  return (
    <main className="im2-shell im2-reflection im2-enter"><Header onHome={onHome} onReset={onReset} step="REFLECTION" /><section className="im2-reflection-head"><p className="im2-kicker">WHAT DID I DISCOVER?</p><h1>这一趟，你发现了什么？</h1><p>确定、仍在理解、暂时看不清，被清楚地分开。</p></section><section className="im2-reflection-layers"><article><span>01</span><div><small>我比较确定的</small><p>{reflection.certain}</p></div></article><article><span>02</span><div><small>我正在理解的</small><p>{reflection.learning}</p></div></article><article><span>03</span><div><small>我还没有看清的</small><p>{reflection.unclear}</p></div></article></section><details className="im2-evidence"><summary>为什么会有这个判断？</summary>{reflection.evidence.map((item) => <p key={item}>— {item}</p>)}</details><section className="im2-takeaway"><h2>今天你最想带走哪一句？</h2><div>{reflection.takeaways.map((item) => <button key={item} className={takeaway === item ? "is-selected" : ""} type="button" onClick={() => setTakeaway(item)}>{item}</button>)}</div><button className="im2-primary" type="button" disabled={!takeaway} onClick={() => onSave({ ...session, reflection, selectedTakeaway: takeaway })}>保存到 Inner Map<span>→</span></button></section></main>
  );
}

function InnerMap({ entries, onStart, onHome }: { entries: InnerMapEntry[]; onStart: () => void; onHome: () => void }) {
  return (
    <main className="im2-shell im2-map im2-enter"><Header onHome={onHome} step="INNER MAP" /><section className="im2-map-head"><p className="im2-kicker">A CONTINUING RECORD, NOT A LABEL</p><h1>我的 Inner Map</h1><p>每一次只记录当时更确定的、仍不确定的，以及空间发生过的变化。</p><button className="im2-primary" type="button" onClick={onStart}>开始新的探索<span>→</span></button></section><section className="im2-map-list">{entries.length ? entries.map((entry) => <article key={entry.id}><time>{new Date(entry.createdAt).toLocaleDateString("zh-CN", { month: "short", day: "2-digit", year: "numeric" })}</time><div><small>{intentLabels[entry.explorationIntent]}</small><h2>我比较确定</h2><p>{entry.confirmedInsights[0]}</p><h2>还没有看清</h2><p>{entry.openQuestions[0] || "这次没有留下新的开放问题。"}</p><blockquote>{entry.takeaway}</blockquote><footer><span>空间</span><b>Mirror {entry.roomSnapshot.mirror.state}</b><b>Window {entry.roomSnapshot.window.state}</b>{entry.migratedFromLegacy && <i>由早期记录迁移</i>}</footer></div></article>) : <div className="im2-empty-map"><span>◐</span><h2>地图还没有记录。</h2><p>完成一次探索后，你选择带走的那句话会出现在这里。</p></div>}</section></main>
  );
}

function SafetyExit({ onEnd }: { onEnd: () => void }) {
  return <main className="im2-shell im2-safety im2-enter"><Brand onClick={onEnd} /><section><p className="im2-kicker">SAFETY EXIT</p><h1>先不要继续向内走。</h1><p>你刚才的文字可能表示此刻需要即时的人际支持。Inner Mirror 已停止探索，也不会继续分析这段文字。</p><ol><li>如果你正处于紧急危险中，请联系所在地的紧急服务，或立即去有人在的安全地点。</li><li>联系一位你信任的人，直接说：“我现在需要你陪我。”</li><li>如果可以，联系本地危机干预或专业心理支持服务。</li></ol><button className="im2-primary" type="button" onClick={onEnd}>结束并回到首页<span>→</span></button></section></main>;
}

function ResetDialog({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return <div className="im2-modal"><section role="dialog" aria-modal="true" aria-labelledby="reset-title"><p className="im2-kicker">BEGIN AGAIN</p><h2 id="reset-title">重新开始这次探索？</h2><p>当前探索会被清除；已经保存到 Inner Map 的历史会保留。</p><div><button className="im2-text-button" type="button" onClick={onCancel}>保留现在</button><button className="im2-danger" type="button" onClick={onConfirm}>清除当前探索</button></div></section></div>;
}

export default function InnerMirrorV2() {
  const [session, setSession] = useState<V2Session | null>(null);
  const [mapEntries, setMapEntries] = useState<InnerMapEntry[]>([]);
  const [ready, setReady] = useState(false);
  const [atLanding, setAtLanding] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    const restored = restoreSession(localStorage.getItem(ACTIVE_SESSION_KEY));
    const currentMap = restoreInnerMap(localStorage.getItem(INNER_MAP_KEY));
    const migrated = migrateLegacySessions(localStorage.getItem(LEGACY_SESSIONS_KEY));
    const merged = [...currentMap, ...migrated.filter((entry) => !currentMap.some((item) => item.id === entry.id))].sort((a, b) => b.createdAt - a.createdAt).slice(0, 20);
    queueMicrotask(() => { setSession(restored); setMapEntries(merged); setReady(true); });
    if (migrated.length) localStorage.setItem(INNER_MAP_KEY, JSON.stringify(merged));
  }, []);

  useEffect(() => { if (!ready) return; if (session) localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session)); else localStorage.removeItem(ACTIVE_SESSION_KEY); }, [ready, session]);
  useEffect(() => { if (ready) localStorage.setItem(INNER_MAP_KEY, JSON.stringify(mapEntries)); }, [ready, mapEntries]);

  const startNew = () => { setShowMap(false); setAtLanding(false); setSession(track(createSession(), "session_started")); };
  const reset = () => { setSession(null); setShowMap(false); setAtLanding(true); setConfirmReset(false); };
  const goHome = () => { setShowMap(false); setAtLanding(true); };
  const goLanding = () => setAtLanding(true);
  const update = (next: V2Session) => setSession(next);
  const saveMap = (next: V2Session) => {
    const takeaway = next.selectedTakeaway ?? next.reflection?.takeaways[0] ?? "";
    const entry = createInnerMapEntry(next, takeaway);
    const complete = track(track({ ...next, currentSessionStep: "inner_map" }, "inner_map_saved", { completed_interactions: next.completedInteractions.length }), "session_completed");
    setMapEntries((current) => [entry, ...current.filter((item) => item.id !== entry.id)].slice(0, 20)); setSession(complete); setShowMap(true);
  };

  if (showMap) return <div className={`im2-root ${ready ? "is-ready" : ""}`}><InnerMap entries={mapEntries} onStart={startNew} onHome={goHome} /></div>;
  if (atLanding || !session) return <div className={`im2-root ${ready ? "is-ready" : ""}`}><Landing hasDraft={Boolean(session)} mapCount={mapEntries.length} onStart={() => session ? setAtLanding(false) : startNew()} onFresh={startNew} onMap={() => setShowMap(true)} /></div>;

  const common = { session, onContinue: update, onHome: goLanding, onReset: () => setConfirmReset(true) };
  let content: React.ReactNode;
  switch (session.currentSessionStep) {
    case "entry": content = <Entry {...common} />; break;
    case "scan_state": content = <ScanState {...common} />; break;
    case "scan_attention": content = <ScanAttention {...common} />; break;
    case "scan_needs": content = <ScanNeeds {...common} />; break;
    case "prioritize": content = <Prioritize {...common} />; break;
    case "agent_transition": content = <AgentTransition session={session} onUpdate={update} onContinue={() => update({ ...session, currentSessionStep: (session.agentDecision ?? makeAgentDecision(session)).nextAction === "verify_hypothesis" ? "verify" : "adaptive" })} onHome={goLanding} onReset={() => setConfirmReset(true)} />; break;
    case "adaptive": content = <AdaptiveQuestion {...common} />; break;
    case "verify": content = <Verify {...common} />; break;
    case "alternative": content = <Alternative {...common} />; break;
    case "room_reveal": content = <RoomReveal session={session} onEnter={() => update({ ...session, currentSessionStep: "room" })} onHome={goLanding} onReset={() => setConfirmReset(true)} />; break;
    case "room": content = <Room {...common} />; break;
    case "mirror_interaction": content = <MirrorInteraction {...common} />; break;
    case "window_interaction": content = <WindowInteraction {...common} />; break;
    case "letter_interaction": content = <LetterInteraction {...common} onSafety={update} />; break;
    case "reflection": content = <Reflection session={session} onSave={saveMap} onHome={goLanding} onReset={() => setConfirmReset(true)} />; break;
    case "inner_map": content = <InnerMap entries={mapEntries} onStart={startNew} onHome={goHome} />; break;
    case "safety": content = <SafetyExit onEnd={reset} />; break;
    default: content = <Entry {...common} />;
  }

  return <div className={`im2-root ${ready ? "is-ready" : ""}`}>{content}{confirmReset && <ResetDialog onCancel={() => setConfirmReset(false)} onConfirm={reset} />}</div>;
}
