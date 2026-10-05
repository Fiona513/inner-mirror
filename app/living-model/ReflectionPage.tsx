"use client";

import { useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { orchestrateAgentStep, validateAgentDecision } from "./agent";
import { EvidenceDrawer } from "./EvidenceDrawer";
import { LivingShell } from "./LivingShell";
import { StateSnapshotCapture } from "./StateSnapshotCapture";
import styles from "./LivingModel.module.css";
import { useCopy, useLocale } from "../locale/locale";
import { useSampleText } from "../locale/sample-text";
import { useLivingModel } from "./LivingModelProvider";
import type { AgentDecision, } from "./agent";
import type { AgentState, ReflectionSession, ReflectionTool } from "./types";

const stateCopy: Record<AgentState, string> = { LISTEN: "Listen", CLARIFY: "Clarify", STRUCTURE: "Structure", EXPLORE: "Explore", RESOLVE: "Resolve", REFLECT: "Reflect", COMPLETE: "Complete" };
const clarifyCopy = {
  decision: { question: "What feels hardest to lose here?", choices: ["My own sense of direction", "Someone important's trust", "The security I already have", "I cannot separate those yet"] },
  feeling: { question: "What would help you stay with this feeling without explaining it away?", choices: ["Name what happened", "Make room for the feeling", "Notice what my body is holding", "I do not know yet"] },
  repeating: { question: "What feels most familiar this time?", choices: ["What I expected from myself", "How I managed someone else's reaction", "The doubt that arrived afterwards", "I cannot separate those yet"] },
  explore: { question: "Where would it feel easiest to begin?", choices: ["What happened", "What I have not said", "What I keep returning to", "I do not know yet"] },
} as const;

export default function ReflectionPage({ sessionId }: { sessionId: string }) {
  const { state, dispatch } = useLivingModel();
  const copy = useCopy();
  const sampleText = useSampleText();
  const { locale } = useLocale();
  const params = useSearchParams();
  const session = state.sessions.find((item) => item.id === sessionId);
  const [drawer, setDrawer] = useState(false);
  const [candidateMode, setCandidateMode] = useState<"idle" | "context" | "rewrite">("idle");
  const [rewrite, setRewrite] = useState(session?.candidate?.statement ?? "");
  const [applies, setApplies] = useState(session?.candidate?.appliesWhen.join("\n") ?? "");
  const [doesNot, setDoesNot] = useState(session?.candidate?.doesNotApplyWhen.join("\n") ?? "");
  const [agentBusy, setAgentBusy] = useState(false);

  if (!session) return <LivingShell><div className={styles.page}><section className={styles.emptyState}><p className={styles.eyebrow}>{copy("反思", "Reflection")}</p><h1>{copy("找不到这次反思。", "This reflection is not available.")}</h1><p>{copy("它可能已从这台设备清除。", "It may have been cleared from this device.")}</p><a href="/now" className={styles.primaryLink}>{copy("返回此刻", "Return to Now")}</a></section></div></LivingShell>;

  const update = (patch: Partial<ReflectionSession>) => dispatch({ type: "UPDATE_SESSION", sessionId, patch: { ...patch, updatedAt: new Date().toISOString() } });
  const now = () => new Date().toISOString();
  const allEvidenceIds = session.candidate ? [...session.candidate.supportingEvidenceIds, ...session.candidate.counterSignalIds] : [];
  const previousTensionPosition = state.sessions.filter((item) => item.id !== session.id && item.context === session.context && item.tool === "contextual_tension" && Date.parse(item.createdAt) < Date.parse(session.createdAt)).sort((a,b) => Date.parse(b.createdAt)-Date.parse(a.createdAt))[0]?.toolData.tensionPosition;
  const traceVisible = process.env.NODE_ENV !== "production" || params.get("trace") === "1";
  const latestTrace = session.agentTrace?.at(-1);

  async function advance(nextState: AgentState, patch: Partial<ReflectionSession> = {}) {
    const workingSession = { ...session!, ...patch };
    const plan = orchestrateAgentStep(state, workingSession, nextState);
    let decision: AgentDecision = plan;
    setAgentBusy(true);
    if (state.mode === "real") {
      try {
        const response = await fetch("/api/living-reflection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: workingSession.input, context: workingSession.context, locale, preferences: state.preferences, plan }),
        });
        const result = await response.json() as { mode?: unknown; structured?: unknown };
        dispatch({ type: "SET_AGENT_RUNTIME_STATUS", status: result.mode === "real" ? "connected" : "falling_back", checkedAt: new Date().toISOString() });
        decision = validateAgentDecision(result.structured, plan) ?? { ...plan, trace: { ...plan.trace, schemaValidationResult: "fallback" } };
      } catch {
        dispatch({ type: "SET_AGENT_RUNTIME_STATUS", status: "unavailable", checkedAt: new Date().toISOString() });
        decision = { ...plan, trace: { ...plan.trace, schemaValidationResult: "fallback" } };
      }
    }
    const data = decision.ui.data as Partial<{ reality: string; expectation: string; self_doubt: string }>;
    const tool = decision.ui.type === "contextual_tension" || decision.ui.type === "perspective_split" || decision.ui.type === "unsaid" ? decision.ui.type : workingSession.tool;
    const agentTrace = [...(workingSession.agentTrace ?? []), decision.trace];
    if (process.env.NODE_ENV !== "production") {
      console.debug("[Inner Mirror Agent Trace]", decision.trace);
    }
    update({
      ...patch,
      state: decision.safety.state === "high_risk" ? "COMPLETE" : decision.next_state,
      outcome: decision.safety.state === "high_risk" ? "safety" : workingSession.outcome,
      structure: decision.ui.type === "editable_summary" ? {
        reality: data.reality ?? workingSession.structure.reality,
        expectation: data.expectation ?? workingSession.structure.expectation,
        selfDoubt: data.self_doubt ?? workingSession.structure.selfDoubt,
      } : workingSession.structure,
      tool,
      candidate: decision.next_state === "REFLECT" ? decision.candidate_insight ?? undefined : workingSession.candidate,
      agentTrace,
    });
    setAgentBusy(false);
  }

  if (session.outcome === "safety") return <LivingShell><div className={styles.canvasPage}><header className={styles.canvasHeader}><a href="/now">{copy("← 此刻", "← Now")}</a><span>{copy("安全优先", "Safety first")}</span></header><section className={styles.safetyState}><p className={styles.eyebrow}>{copy("暂停反思", "Pause the reflection")}</p><h1>{copy("我担心你现在可能并不安全。", "I\u0027m concerned you may not be safe right now.")}</h1><p>{copy("此刻不适合继续解释你的状态。请联系当地紧急服务或危机热线，或告诉一位能够陪在你身边、你信任的人。", "This is not the moment for Inner Mirror to interpret what this says about you. Please contact local emergency services or a crisis line where you are, or tell someone you trust who can stay with you.")}</p><p>{copy("如果眼前有迫切危险，请远离可能伤害自己的物品，并立即拨打当地紧急电话。", "If there is immediate danger, move away from anything you could use to hurt yourself and call emergency services now.")}</p><a className={styles.primaryLink} href="/now">{copy("离开这次反思", "Leave this reflection")}</a></section></div></LivingShell>;

  return (
    <LivingShell>
      <div className={styles.canvasPage}>
        <header className={styles.canvasHeader}>
          <a href="/now">{copy("← 此刻", "← Now")}</a>
          <div className={styles.stateRail} aria-label={copy("反思进度", "Reflection progress")}>{Object.keys(stateCopy).filter((item) => item !== "COMPLETE").map((item) => <span key={item} className={session.state === item ? styles.stateCurrent : ""}>{locale === "zh-CN" ? ({ LISTEN: "倾听", CLARIFY: "澄清", STRUCTURE: "梳理", EXPLORE: "探索", RESOLVE: "行动", REFLECT: "回看", COMPLETE: "完成" } as Record<AgentState, string>)[item as AgentState] : stateCopy[item as AgentState]}</span>)}</div>
          <span>{sampleText(session.context.replaceAll("_", " "))}</span>
        </header>
        {state.memoryPaused ? <div className={styles.temporaryBanner}>{copy("临时反思模式 · 这次内容不会进入长期记忆。", "Temporary reflection mode · Nothing from this session will enter long-term memory.")}</div> : null}
        <article className={styles.canvas}>
          <section className={styles.sourceBlock}>
            <p className={styles.sectionLabel}>{copy("是什么让你来到这里", "What brought you here")}</p>
            <blockquote>{sampleText(session.input)}</blockquote>
          </section>
          {session.state !== "COMPLETE" ? <StateSnapshotCapture session={session} /> : null}

          {session.state === "LISTEN" ? <section className={styles.canvasBlock}>
            <p className={styles.blockIndex}>{copy("01 · 倾听", "01 · Listen")}</p>
            <h1>{copy("先停留在眼前的处境里。", "Let\u0027s stay with the current situation first.")}</h1>
            <p>{copy("先把发生的事，和它逐渐对你意味着什么分开看看；此刻不急着定义你是谁。", "I will not turn this into a claim about who you are. First, we can separate what happened from what the situation has started to mean.")}</p>
            <button className={styles.primaryButton} type="button" onClick={() => advance("CLARIFY")} disabled={agentBusy}>{agentBusy ? copy("正在联系已有情境…", "Connecting this with retained context…") : copy("寻找核心张力", "Find the central tension")}</button>
          </section> : null}

          {session.state === "CLARIFY" ? <section className={styles.canvasBlock}>
            <p className={styles.blockIndex}>{copy("02 · 一个有用的问题", "02 · One useful question")}</p>
            <h1>{sampleText(clarifyCopy[session.context].question)}</h1>
            <div className={styles.choiceLines}>
              {clarifyCopy[session.context].choices.map((choice) => <button type="button" key={choice} disabled={agentBusy} onClick={() => advance("STRUCTURE", { clarification: choice })}>{sampleText(choice)}<span>→</span></button>)}
            </div>
          </section> : null}

          {session.state === "STRUCTURE" ? <StructureBlock session={session} update={update} advance={advance} busy={agentBusy} /> : null}
          {session.state === "EXPLORE" ? <ExploreBlock session={session} update={update} advance={advance} busy={agentBusy} previousTensionPosition={previousTensionPosition} /> : null}
          {session.state === "RESOLVE" ? <ResolveBlock session={session} update={update} advance={advance} busy={agentBusy} /> : null}
          {session.state === "REFLECT" ? <section className={styles.canvasBlock}>
            <p className={styles.blockIndex}>{copy("06 · 候选理解", "06 · Candidate understanding")}</p>
            {session.candidate && session.candidate.supportingEvidenceIds.length ? <>
              <div className={styles.candidateHeading}><div><p className={styles.sectionLabel}>{copy("我可能注意到了", "Something I may be noticing")}</p><span className={styles.statusLabel}>{sampleText(session.candidate.evidenceState.replaceAll("_", " "))}</span></div><div className={styles.evidenceCounts}><span>{locale === "zh-CN" ? `${session.candidate.supportingEvidenceIds.length} 条支持线索` : `${session.candidate.supportingEvidenceIds.length} supporting moments`}</span><span>{locale === "zh-CN" ? `${session.candidate.counterSignalIds.length} 条反向线索` : `${session.candidate.counterSignalIds.length} that complicate it`}</span></div></div>
              <h1 className={styles.candidateStatement}>{sampleText(session.candidate.statement)}</h1>
              <button className={styles.evidenceLink} type="button" onClick={() => setDrawer(true)}>{copy("查看依据 →", "Show me why →")}</button>
              {candidateMode === "context" ? <div className={styles.inlineEditor}>
                <label>{copy("这在什么时候适用？", "When does this seem true?")}<textarea value={sampleText(applies)} onChange={(event) => setApplies(event.target.value)} /></label>
                <label>{copy("这在什么时候不适用？", "When doesn\u0027t it seem true?")}<textarea value={sampleText(doesNot)} onChange={(event) => setDoesNot(event.target.value)} /></label>
                <div className={styles.buttonRow}><button type="button" className={styles.primaryButton} onClick={() => dispatch({ type: "CONTEXTUALIZE_CANDIDATE", sessionId, appliesWhen: applies.split("\n").filter(Boolean), doesNotApplyWhen: doesNot.split("\n").filter(Boolean), now: now() })}>{copy("带着情境保留", "Keep with this context")}</button><button className={styles.quietButton} type="button" onClick={() => setCandidateMode("idle")}>{copy("取消", "Cancel")}</button></div>
              </div> : null}
              {candidateMode === "rewrite" ? <div className={styles.inlineEditor}><label>{copy("用自己的话改写这条理解", "Rewrite it in words that belong to you")}<textarea value={sampleText(rewrite)} onChange={(event) => setRewrite(event.target.value)} /></label><div className={styles.buttonRow}><button type="button" className={styles.primaryButton} onClick={() => dispatch({ type: "REWRITE_CANDIDATE", sessionId, statement: rewrite, now: now() })}>{copy("保留我的版本", "Keep my version")}</button><button className={styles.quietButton} type="button" onClick={() => setCandidateMode("idle")}>{copy("取消", "Cancel")}</button></div></div> : null}
              {candidateMode === "idle" ? <div className={styles.candidateActions}>
                <button type="button" onClick={() => dispatch({ type: "ACCEPT_CANDIDATE", sessionId, now: now() })}>{copy("这符合我", "This fits")}</button>
                <button type="button" onClick={() => setCandidateMode("context")}>{copy("只在某些情况下适用", "Only in some situations")}</button>
                <button type="button" onClick={() => setCandidateMode("rewrite")}>{copy("不太准确", "Not quite")}</button>
                <button type="button" onClick={() => setCandidateMode("rewrite")}>{copy("改写", "Rewrite")}</button>
                <button type="button" onClick={() => dispatch({ type: "REJECT_CANDIDATE", sessionId, now: now() })}>{copy("我不同意", "I don\u0027t agree")}</button>
              </div> : null}
            </> : <div className={styles.openEnding}><h1>{copy("目前保留的情境还不足以形成有用的理解。", "There is not enough retained context to say something useful yet.")}</h1><p>{copy("这次反思仍可以到此结束。每次经历都不必形成一条镜像理解。", "This reflection can still end here. Your mirror does not need an insight from every session.")}</p><button className={styles.primaryButton} type="button" onClick={() => update({ state: "COMPLETE", outcome: "resolved_only" })}>{copy("结束，不加入镜像", "Finish without adding to Mirror")}</button></div>}
          </section> : null}

          {session.state === "COMPLETE" ? <section className={styles.completionState}>
            <p className={styles.eyebrow}>{session.outcome === "rejected" ? copy("未加入镜像", "Not added") : session.outcome === "resolved_only" ? copy("反思已完成", "Reflection complete") : copy("你的镜像已更新", "Your mirror changed")}</p>
            <h1>{session.outcome === "rejected" ? copy("明白了。我不会把它视为你镜像的一部分。", "Got it. I won't treat this as part of your mirror.") : session.outcome === "resolved_only" ? copy("这次反思帮助你看清眼前问题，无需形成一条自我理解。", "This session helped with the current issue. It does not need to become a self-understanding.") : copy("你决定了哪些理解值得留下。", "You decided what was worth keeping.")}</h1>
            <p>{state.memoryPaused ? copy("临时模式让这次反思留在长期记忆之外。", "Temporary mode kept this reflection out of long-term memory.") : session.outcome === "rejected" ? copy("拒绝记录已保存，这条解释不会用于后续个性化理解。", "The rejection is saved so this interpretation will not be reused as personalization context.") : session.outcome === "resolved_only" ? copy("没有新增解释。眼前的问题可以结束，而不必改变镜像。", "No interpretation was added. The current issue can be complete without changing your mirror.") : copy("你的选择与证据已保存在本地，之后仍可编辑或归档。", "The decision and its evidence are saved locally. You can still edit or archive it later.")}</p>
            {session.outcome === "rejected" ? <div className={styles.buttonRow}><a className={styles.primaryLink} href="/settings/privacy">{copy("查看已拒绝的解释", "Review rejected interpretations")}</a><a className={styles.textLink} href="/now">{copy("返回此刻", "Return to Now")}</a></div> : <div className={styles.buttonRow}><a className={styles.primaryLink} href="/mirror">{copy("打开镜像", "Open Mirror")}</a><a className={styles.textLink} href="/journey">{copy("查看变化", "See what changed")}</a><a className={styles.textLink} href="/now">{copy("返回此刻", "Return to Now")}</a></div>}
          </section> : null}
          {traceVisible && latestTrace ? <details className={styles.agentTracePanel}><summary>{copy("Agent 轨迹 · 仅供验证", "Agent trace · acceptance only")}</summary><dl><div><dt>{copy("当前状态", "Current state")}</dt><dd>{latestTrace.currentState}</dd></div><div><dt>{copy("选中的组件", "Selected component")}</dt><dd>{latestTrace.selectedComponentType}</dd></div><div><dt>{copy("检索来源 ID", "Retrieved source IDs")}</dt><dd>{latestTrace.retrievedSourceIds.join(", ") || copy("无", "none")}</dd></div><div><dt>{copy("排除的拒绝项 ID", "Excluded rejected IDs")}</dt><dd>{latestTrace.excludedRejectedIds.join(", ") || copy("无", "none")}</dd></div><div><dt>{copy("排除的归档项 ID", "Excluded archived IDs")}</dt><dd>{latestTrace.excludedArchivedIds.join(", ") || copy("无", "none")}</dd></div><div><dt>{copy("结构校验", "Schema validation")}</dt><dd>{latestTrace.schemaValidationResult}</dd></div><div><dt>{copy("保存操作", "Persistence action")}</dt><dd>{latestTrace.persistenceAction}</dd></div></dl></details> : null}
        </article>
      </div>
      {drawer && session.candidate ? <EvidenceDrawer evidenceIds={allEvidenceIds} hypothesis={session.candidate.statement} onClose={() => setDrawer(false)} /> : null}
    </LivingShell>
  );
}

function StructureBlock({ session, update, advance, busy }: { session: ReflectionSession; update: (patch: Partial<ReflectionSession>) => void; advance: (state: AgentState, patch?: Partial<ReflectionSession>) => Promise<void>; busy: boolean }) {
  const copy = useCopy();
  const sampleText = useSampleText();
  const change = (key: keyof ReflectionSession["structure"], value: string) => update({ structure: { ...session.structure, [key]: value } });
  return <section className={styles.canvasBlock}><p className={styles.blockIndex}>{copy("03 · 可编辑的梳理", "03 · Editable structure")}</p><h1>{copy("可以这样把处境分开看看。", "Here is one way to separate the situation.")}</h1><p>{copy("这些只是可修改的工作笔记，不是关于你的定论。哪里不贴切，都可以改。", "These are working notes, not facts about you. Change anything that misses.")}</p><div className={styles.structuredFields}>
    <label className={styles.structureField}><span>{copy("现实情况", "Reality")}<small>{copy("实际发生了什么", "What is actually happening")}</small></span><textarea value={sampleText(session.structure.reality)} onChange={(event) => change("reality", event.target.value)} /></label>
    <label className={styles.structureField}><span>{copy("期待", "Expectation")}<small>{copy("他人或情境可能期待什么", "What others or the situation may expect")}</small></span><textarea value={sampleText(session.structure.expectation)} onChange={(event) => change("expectation", event.target.value)} /></label>
    <label className={styles.structureField}><span>{copy("自我怀疑", "Self-doubt")}<small>{copy("你正在质疑什么", "What you are questioning")}</small></span><textarea value={sampleText(session.structure.selfDoubt)} onChange={(event) => change("selfDoubt", event.target.value)} /></label>
  </div><button className={styles.primaryButton} type="button" disabled={busy} onClick={() => advance("EXPLORE")}>{busy ? copy("正在选择下一步…", "Selecting the next canvas…") : copy("沿着这个梳理继续", "Use this structure")}</button></section>;
}

function ExploreBlock({ session, update, advance, busy, previousTensionPosition }: { session: ReflectionSession; update: (patch: Partial<ReflectionSession>) => void; advance: (state: AgentState, patch?: Partial<ReflectionSession>) => Promise<void>; busy: boolean; previousTensionPosition?: number }) {
  const copy = useCopy();
  const sampleText = useSampleText();
  const { locale } = useLocale();
  const tools: { id: ReflectionTool; label: string }[] = [{ id: "contextual_tension", label: copy("张力", "Tension") }, { id: "perspective_split", label: copy("视角", "Perspective") }, { id: "unsaid", label: copy("未说出口", "Unsaid") }];
  const data = session.toolData;
  const setData = (patch: Partial<typeof data>) => update({ toolData: { ...data, ...patch } });
  return <section className={styles.canvasBlock}><p className={styles.blockIndex}>{copy("04 · 探索", "04 · Explore")}</p><div className={styles.toolHeader}><div><h1>{copy("看看彼此之间的关系。", "Look at the relation, not a score.")}</h1><p>{copy("选择最能帮助你理解当前处境的视角。", "Use the view that makes this situation easier to work with.")}</p></div><div className={styles.toolTabs}>{tools.map((tool) => <button type="button" key={tool.id} aria-pressed={session.tool === tool.id} onClick={() => update({ tool: tool.id })}>{tool.label}</button>)}</div></div>
    {session.tool === "contextual_tension" ? <div className={styles.tensionTool}>
      <div className={styles.tensionLabels}><strong>{sampleText(data.leftLabel)}</strong><strong>{sampleText(data.rightLabel)}</strong></div>
      <div className={styles.tensionAxis} style={{ "--current-position": `${data.tensionPosition}%`, "--previous-position": `${previousTensionPosition ?? data.tensionPosition}%` } as CSSProperties}>{previousTensionPosition !== undefined ? <span className={styles.previousTensionMarker} aria-hidden="true"><i />{copy("之前", "Previous")}</span> : null}<span className={styles.currentTensionMarker} aria-hidden="true"><i />{copy("当前", "Current")}</span><input aria-label={locale === "zh-CN" ? `当前位置：${data.tensionPosition}/100，位于${sampleText(data.leftLabel)}与${sampleText(data.rightLabel)}之间` : `Current position ${data.tensionPosition} of 100 between ${data.leftLabel} and ${data.rightLabel}`} type="range" min="0" max="100" value={data.tensionPosition} onChange={(event) => setData({ tensionPosition: Number(event.target.value) })} /></div>
      <div className={styles.tensionContexts}><label>{sampleText(data.leftLabel)}{copy("在什么情况下更重要", " tends to matter more when")}<textarea value={sampleText(data.leftContext)} onChange={(event) => setData({ leftContext: event.target.value })} /></label><label>{sampleText(data.rightLabel)}{copy("在什么情况下更重要", " tends to matter more when")}<textarea value={sampleText(data.rightContext)} onChange={(event) => setData({ rightContext: event.target.value })} /></label></div>
      <label className={styles.fullField}>{copy("这次有什么不同？", "What\u0027s different this time?")}<textarea value={sampleText(data.difference)} onChange={(event) => setData({ difference: event.target.value })} /></label>
    </div> : null}
    {session.tool === "perspective_split" ? <div className={styles.perspectiveTool}>{([['think',copy('我在想什么','What I think')],['feel',copy('我有什么感受','What I feel')],['fear',copy('我在担心什么','What I fear')],['want',copy('我想要什么','What I want')]] as const).map(([key,label]) => <label key={key} data-filled={Boolean(data[key])}><span>{label}<small>{copy("暂定 · 可编辑", "tentative · editable")}</small></span><textarea value={sampleText(data[key])} onChange={(event) => setData({ [key]: event.target.value })} /></label>)}</div> : null}
    {session.tool === "unsaid" ? <div className={styles.unsaidTool}><label>{copy("如果不用顾虑对方的反应，你想说什么？", "What would you say if you didn\u0027t have to manage their reaction?")}<textarea value={sampleText(data.unsaid)} onChange={(event) => setData({ unsaid: event.target.value })} /></label><label className={styles.privateCheck}><input aria-label={copy("将未说出口的文字保密", "Keep the unsaid text private")} type="checkbox" checked={data.keepUnsaidPrivate} onChange={(event) => setData({ keepUnsaidPrivate: event.target.checked })} /><span><strong>{copy("仅自己可见", "Keep private")}</strong><small>{copy("完整文字不会进入你的自我模型。", "The full text will not be added to your Self Model.")}</small></span></label></div> : null}
    <button className={styles.primaryButton} type="button" disabled={busy} onClick={() => advance("RESOLVE")}>{busy ? copy("正在回到眼前的问题…", "Keeping the current problem in view…") : copy("回到当前处境", "Bring this back to the situation")}</button>
  </section>;
}

function ResolveBlock({ session, update, advance, busy }: { session: ReflectionSession; update: (patch: Partial<ReflectionSession>) => void; advance: (state: AgentState, patch?: Partial<ReflectionSession>) => Promise<void>; busy: boolean }) {
  const copy = useCopy();
  const sampleText = useSampleText();
  return <section className={styles.canvasBlock}><p className={styles.blockIndex}>{copy("05 · 先看眼前的问题", "05 · Current problem first")}</p><h1>{copy("下一步怎样才更诚实、也更可行？", "What would make the next step more honest and workable?")}</h1><p>{copy("这一步不必解决所有问题，只需要让你对真实处境多了解一点。", "This does not need to solve everything. It should give you new information about the actual situation.")}</p><label className={styles.fullField}>{copy("一个可以调整的下一步", "A next step you can revise")}<textarea value={sampleText(session.nextStep)} onChange={(event) => update({ nextStep: event.target.value })} /></label><div className={styles.buttonRow}><button className={styles.primaryButton} type="button" disabled={busy} onClick={() => advance("REFLECT")}>{busy ? copy("正在核对支持与反向线索…", "Checking support and counter-signals…") : copy("看看是否有可能的模式", "Look for a possible pattern")}</button><button className={styles.outlineButton} type="button" onClick={() => update({ state: "COMPLETE", outcome: "resolved_only" })}>{copy("目前这样就够了", "This is enough for now")}</button></div></section>;
}
