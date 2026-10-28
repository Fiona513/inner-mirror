"use client";

import { useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "../locale/locale";
import { getLivingCopy, labelEnum } from "../locale/living";
import { orchestrateAgentStep, validateAgentDecision } from "./agent";
import { EvidenceDrawer } from "./EvidenceDrawer";
import { LivingShell } from "./LivingShell";
import { StateSnapshotCapture } from "./StateSnapshotCapture";
import styles from "./LivingModel.module.css";
import { useLivingModel } from "./LivingModelProvider";
import type { AgentDecision, } from "./agent";
import type { AgentState, ReflectionSession, ReflectionTool } from "./types";
import { ReturnComparison } from './ReflectionContinuity';
import { localizeDemoText } from "./demo-data";

const stateCopy = (zh: boolean): Record<AgentState, string> => zh
  ? { LISTEN: "倾听", CLARIFY: "澄清", STRUCTURE: "整理", EXPLORE: "探索", RESOLVE: "收束", REFLECT: "回看", COMPLETE: "完成" }
  : { LISTEN: "Listen", CLARIFY: "Clarify", STRUCTURE: "Structure", EXPLORE: "Explore", RESOLVE: "Resolve", REFLECT: "Reflect", COMPLETE: "Complete" };
const clarifyCopy = (zh: boolean) => zh ? {
  decision: { question: "这里最难放下的是什么？", choices: ["我自己的方向感", "某个重要之人的信任", "已经拥有的安全感", "暂时还分不开"] },
  feeling: { question: "怎样才能不急着解释，而是先和这份感受待一会儿？", choices: ["说清发生了什么", "给这份感受留一点空间", "注意身体正在承受什么", "暂时还不知道"] },
  repeating: { question: "这一次，最熟悉的部分是什么？", choices: ["我对自己的期待", "我怎样照顾别人的反应", "事后出现的怀疑", "暂时还分不开"] },
  explore: { question: "从哪里开始会更容易一点？", choices: ["发生了什么", "我没有说出口的内容", "我总会回到的地方", "暂时还不知道"] },
} as const : {
  decision: { question: "What feels hardest to lose here?", choices: ["My own sense of direction", "Someone important's trust", "The security I already have", "I cannot separate those yet"] },
  feeling: { question: "What would help you stay with this feeling without explaining it away?", choices: ["Name what happened", "Make room for the feeling", "Notice what my body is holding", "I do not know yet"] },
  repeating: { question: "What feels most familiar this time?", choices: ["What I expected from myself", "How I managed someone else's reaction", "The doubt that arrived afterwards", "I cannot separate those yet"] },
  explore: { question: "Where would it feel easiest to begin?", choices: ["What happened", "What I have not said", "What I keep returning to", "I do not know yet"] },
} as const;

export default function ReflectionPage({ sessionId }: { sessionId: string }) {
  const { state, dispatch } = useLivingModel();
  const { locale } = useLocale();
  const copy = getLivingCopy(locale);
  const isZh = locale === "zh-CN";
  const states = stateCopy(isZh);
  const clarify = clarifyCopy(isZh);
  const d = (value: string) => state.sampleDataLoaded ? localizeDemoText(value, locale) : value;
  const params = useSearchParams();
  const session = state.sessions.find((item) => item.id === sessionId);
  const [drawer, setDrawer] = useState(false);
  const [candidateMode, setCandidateMode] = useState<"idle" | "context" | "rewrite">("idle");
  const [rewrite, setRewrite] = useState(session?.candidate?.statement ?? "");
  const [applies, setApplies] = useState(session?.candidate?.appliesWhen.join("\n") ?? "");
  const [doesNot, setDoesNot] = useState(session?.candidate?.doesNotApplyWhen.join("\n") ?? "");
  const [agentBusy, setAgentBusy] = useState(false);

  if (!session) return <LivingShell><div className={styles.page}><section className={styles.emptyState}><p className={styles.eyebrow}>{isZh ? "反思" : "Reflection"}</p><h1>{copy.reflection.unavailableTitle}</h1><p>{copy.reflection.unavailableBody}</p><a href="/now" className={styles.primaryLink}>{copy.reflection.returnNow}</a></section></div></LivingShell>;

  const update = (patch: Partial<ReflectionSession>) => dispatch({ type: "UPDATE_SESSION", sessionId, patch: { ...patch, updatedAt: new Date().toISOString() } });
  const now = () => new Date().toISOString();
  const allEvidenceIds = session.candidate ? [...session.candidate.supportingEvidenceIds, ...session.candidate.counterSignalIds] : [];
  const previousTensionPosition = state.sessions.filter((item) => item.id !== session.id && item.context === session.context && item.tool === "contextual_tension" && Date.parse(item.createdAt) < Date.parse(session.createdAt)).sort((a,b) => Date.parse(b.createdAt)-Date.parse(a.createdAt))[0]?.toolData.tensionPosition;
  const traceVisible = process.env.NODE_ENV !== "production" || params.get("trace") === "1";
  const latestTrace = session.agentTrace?.at(-1);

  async function advance(nextState: AgentState, patch: Partial<ReflectionSession> = {}) {
    const workingSession = { ...session!, ...patch };
    const plan = orchestrateAgentStep(state, workingSession, nextState, locale);
    let decision: AgentDecision = plan;
    setAgentBusy(true);
    if (state.mode === "real") {
      try {
        const response = await fetch("/api/living-reflection", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: workingSession.input, context: workingSession.context, preferences: state.preferences, plan, locale }),
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

  if (session.outcome === "safety") return <LivingShell><div className={styles.canvasPage}><header className={styles.canvasHeader}><a href="/now">← {copy.common.now}</a><span>{copy.reflection.safetyFirst}</span></header><section className={styles.safetyState}><p className={styles.eyebrow}>{copy.reflection.pause}</p><h1>{copy.reflection.safetyTitle}</h1><p>{copy.reflection.safetyBody}</p><p>{copy.reflection.safetyImmediate}</p><a className={styles.primaryLink} href="/now">{copy.reflection.leave}</a></section></div></LivingShell>;

  return (
    <LivingShell>
      <div className={styles.canvasPage}>
        <header className={styles.canvasHeader}>
          <a href="/now">← {copy.common.now}</a>
          <div className={styles.stateRail} aria-label={copy.reflection.progress}>{Object.keys(states).filter((item) => item !== "COMPLETE").map((item) => <span key={item} className={session.state === item ? styles.stateCurrent : ""}>{states[item as AgentState]}</span>)}</div>
          <span>{labelEnum(locale, session.context)}</span>
        </header>
        {state.memoryPaused ? <div className={styles.temporaryBanner}>{copy.reflection.temporary}</div> : null}
        <article className={styles.canvas}>
          <section className={styles.sourceBlock}>
            <p className={styles.sectionLabel}>{copy.reflection.source}</p>
            <blockquote>{d(session.input)}</blockquote>
          </section>
          {session.state !== "COMPLETE" ? <StateSnapshotCapture session={session} /> : null}
          <ReturnComparison key={session.id} session={session} />

          {session.state === "LISTEN" ? <section className={styles.canvasBlock}>
            <p className={styles.blockIndex}>{copy.reflection.listenIndex}</p>
            <h1>{copy.reflection.listenTitle}</h1>
            <p>{copy.reflection.listenBody}</p>
            <button className={styles.primaryButton} type="button" onClick={() => advance("CLARIFY")} disabled={agentBusy}>{agentBusy ? copy.reflection.connecting : copy.reflection.listenCta}</button>
          </section> : null}

          {session.state === "CLARIFY" ? <section className={styles.canvasBlock}>
            <p className={styles.blockIndex}>{copy.reflection.clarifyIndex}</p>
            <h1>{clarify[session.context].question}</h1>
            <div className={styles.choiceLines}>
              {clarify[session.context].choices.map((choice) => <button type="button" key={choice} disabled={agentBusy} onClick={() => advance("STRUCTURE", { clarification: choice })}>{choice}<span>→</span></button>)}
            </div>
          </section> : null}

          {session.state === "STRUCTURE" ? <StructureBlock session={session} update={update} advance={advance} busy={agentBusy} /> : null}
          {session.state === "EXPLORE" ? <ExploreBlock session={session} update={update} advance={advance} busy={agentBusy} previousTensionPosition={previousTensionPosition} /> : null}
          {session.state === "RESOLVE" ? <ResolveBlock session={session} update={update} advance={advance} busy={agentBusy} /> : null}
          {session.state === "REFLECT" ? <section className={styles.canvasBlock}>
            <p className={styles.blockIndex}>{copy.reflection.candidateIndex}</p>
            {session.candidate && session.candidate.supportingEvidenceIds.length ? <>
              <div className={styles.candidateHeading}><div><p className={styles.sectionLabel}>{copy.reflection.noticing}</p><span className={styles.statusLabel}>{labelEnum(locale, session.candidate.evidenceState)}</span></div><div className={styles.evidenceCounts}><span>{session.candidate.supportingEvidenceIds.length} {copy.reflection.supporting}</span><span>{session.candidate.counterSignalIds.length} {copy.reflection.complicating}</span></div></div>
              <h1 className={styles.candidateStatement}>{d(session.candidate.statement)}</h1>
              <button className={styles.evidenceLink} type="button" onClick={() => setDrawer(true)}>{copy.reflection.why}</button>
              {candidateMode === "context" ? <div className={styles.inlineEditor}>
                <label>{copy.reflection.applies}<textarea value={applies} onChange={(event) => setApplies(event.target.value)} /></label>
                <label>{copy.reflection.notApplies}<textarea value={doesNot} onChange={(event) => setDoesNot(event.target.value)} /></label>
                <div className={styles.buttonRow}><button type="button" className={styles.primaryButton} onClick={() => dispatch({ type: "CONTEXTUALIZE_CANDIDATE", sessionId, appliesWhen: applies.split("\n").filter(Boolean), doesNotApplyWhen: doesNot.split("\n").filter(Boolean), now: now() })}>{copy.reflection.keepContext}</button><button className={styles.quietButton} type="button" onClick={() => setCandidateMode("idle")}>{copy.common.cancel}</button></div>
              </div> : null}
              {candidateMode === "rewrite" ? <div className={styles.inlineEditor}><label>{copy.reflection.rewritePrompt}<textarea value={rewrite} onChange={(event) => setRewrite(event.target.value)} /></label><div className={styles.buttonRow}><button type="button" className={styles.primaryButton} onClick={() => dispatch({ type: "REWRITE_CANDIDATE", sessionId, statement: rewrite, now: now() })}>{copy.reflection.keepVersion}</button><button className={styles.quietButton} type="button" onClick={() => setCandidateMode("idle")}>{copy.common.cancel}</button></div></div> : null}
              {candidateMode === "idle" ? <div className={styles.candidateActions}>
                <button type="button" onClick={() => dispatch({ type: "ACCEPT_CANDIDATE", sessionId, now: now() })}>{copy.reflection.fits}</button>
                <button type="button" onClick={() => setCandidateMode("context")}>{copy.reflection.someSituations}</button>
                <button type="button" onClick={() => setCandidateMode("rewrite")}>{copy.reflection.notQuite}</button>
                <button type="button" onClick={() => setCandidateMode("rewrite")}>{copy.reflection.rewrite}</button>
                <button type="button" onClick={() => dispatch({ type: "REJECT_CANDIDATE", sessionId, now: now() })}>{copy.reflection.disagree}</button>
              </div> : null}
            </> : <div className={styles.openEnding}><h1>{copy.reflection.noContextTitle}</h1><p>{copy.reflection.noContextBody}</p><button className={styles.primaryButton} type="button" onClick={() => update({ state: "COMPLETE", outcome: "resolved_only" })}>{copy.reflection.finishNoMirror}</button></div>}
          </section> : null}

          {session.state === "COMPLETE" ? <section className={styles.completionState}>
            <p className={styles.eyebrow}>{session.outcome === "rejected" ? copy.reflection.notAdded : session.outcome === "resolved_only" ? copy.reflection.complete : copy.reflection.mirrorChanged}</p>
            <h1>{session.outcome === "rejected" ? copy.reflection.rejectedTitle : session.outcome === "resolved_only" ? copy.reflection.resolvedTitle : copy.reflection.acceptedTitle}</h1>
            <p>{state.memoryPaused ? copy.reflection.temporaryDone : session.outcome === "rejected" ? copy.reflection.rejectedBody : session.outcome === "resolved_only" ? copy.reflection.resolvedBody : copy.reflection.acceptedBody}</p>
            {session.outcome === "rejected" ? <div className={styles.buttonRow}><a className={styles.primaryLink} href="/settings/privacy">{copy.reflection.reviewRejected}</a><a className={styles.textLink} href="/now">{copy.reflection.returnNow}</a></div> : <div className={styles.buttonRow}><a className={styles.primaryLink} href="/mirror">{copy.reflection.openMirror}</a><a className={styles.textLink} href="/journey">{copy.reflection.seeChanged}</a><a className={styles.textLink} href="/now">{copy.reflection.returnNow}</a></div>}
          </section> : null}
          {traceVisible && latestTrace ? <details className={styles.agentTracePanel}><summary>{copy.reflection.trace}</summary><dl><div><dt>{copy.reflection.currentState}</dt><dd>{latestTrace.currentState}</dd></div><div><dt>{copy.reflection.component}</dt><dd>{latestTrace.selectedComponentType}</dd></div><div><dt>{copy.reflection.retrieved}</dt><dd>{latestTrace.retrievedSourceIds.join(", ") || copy.common.none}</dd></div><div><dt>{copy.reflection.rejectedIds}</dt><dd>{latestTrace.excludedRejectedIds.join(", ") || copy.common.none}</dd></div><div><dt>{copy.reflection.archivedIds}</dt><dd>{latestTrace.excludedArchivedIds.join(", ") || copy.common.none}</dd></div><div><dt>{copy.reflection.validation}</dt><dd>{latestTrace.schemaValidationResult}</dd></div><div><dt>{copy.reflection.persistence}</dt><dd>{latestTrace.persistenceAction}</dd></div></dl></details> : null}
        </article>
      </div>
      {drawer && session.candidate ? <EvidenceDrawer evidenceIds={allEvidenceIds} hypothesis={d(session.candidate.statement)} onClose={() => setDrawer(false)} /> : null}
    </LivingShell>
  );
}

function StructureBlock({ session, update, advance, busy }: { session: ReflectionSession; update: (patch: Partial<ReflectionSession>) => void; advance: (state: AgentState, patch?: Partial<ReflectionSession>) => Promise<void>; busy: boolean }) {
  const { locale } = useLocale();
  const { state } = useLivingModel();
  const copy = getLivingCopy(locale);
  const d = (value: string) => state.sampleDataLoaded ? localizeDemoText(value, locale) : value;
  const change = (key: keyof ReflectionSession["structure"], value: string) => update({ structure: { ...session.structure, [key]: value } });
  return <section className={styles.canvasBlock}><p className={styles.blockIndex}>{copy.reflection.structureIndex}</p><h1>{copy.reflection.structureTitle}</h1><p>{copy.reflection.structureBody}</p><div className={styles.structuredFields}>
    <label className={styles.structureField}><span>{copy.reflection.reality}<small>{copy.reflection.realityHelp}</small></span><textarea value={d(session.structure.reality)} onChange={(event) => change("reality", event.target.value)} /></label>
    <label className={styles.structureField}><span>{copy.reflection.expectation}<small>{copy.reflection.expectationHelp}</small></span><textarea value={d(session.structure.expectation)} onChange={(event) => change("expectation", event.target.value)} /></label>
    <label className={styles.structureField}><span>{copy.reflection.selfDoubt}<small>{copy.reflection.selfDoubtHelp}</small></span><textarea value={d(session.structure.selfDoubt)} onChange={(event) => change("selfDoubt", event.target.value)} /></label>
  </div><button className={styles.primaryButton} type="button" disabled={busy} onClick={() => advance("EXPLORE")}>{busy ? copy.reflection.selectingCanvas : copy.reflection.useStructure}</button></section>;
}

function ExploreBlock({ session, update, advance, busy, previousTensionPosition }: { session: ReflectionSession; update: (patch: Partial<ReflectionSession>) => void; advance: (state: AgentState, patch?: Partial<ReflectionSession>) => Promise<void>; busy: boolean; previousTensionPosition?: number }) {
  const { locale } = useLocale();
  const { state } = useLivingModel();
  const copy = getLivingCopy(locale);
  const d = (value: string) => state.sampleDataLoaded ? localizeDemoText(value, locale) : value;
  const tools: { id: ReflectionTool; label: string }[] = [{ id: "contextual_tension", label: copy.reflection.tension }, { id: "perspective_split", label: copy.reflection.perspective }, { id: "unsaid", label: copy.reflection.unsaid }];
  const data = session.toolData;
  const setData = (patch: Partial<typeof data>) => update({ toolData: { ...data, ...patch } });
  return <section className={styles.canvasBlock}><p className={styles.blockIndex}>{copy.reflection.exploreIndex}</p><div className={styles.toolHeader}><div><h1>{copy.reflection.exploreTitle}</h1><p>{copy.reflection.exploreBody}</p></div><div className={styles.toolTabs}>{tools.map((tool) => <button type="button" key={tool.id} aria-pressed={session.tool === tool.id} onClick={() => update({ tool: tool.id })}>{tool.label}</button>)}</div></div>
    {session.tool === "contextual_tension" ? <div className={styles.tensionTool}>
      <div className={styles.tensionLabels}><strong>{d(data.leftLabel)}</strong><strong>{d(data.rightLabel)}</strong></div>
      <div className={styles.tensionAxis} style={{ "--current-position": `${data.tensionPosition}%`, "--previous-position": `${previousTensionPosition ?? data.tensionPosition}%` } as CSSProperties}>{previousTensionPosition !== undefined ? <span className={styles.previousTensionMarker} aria-hidden="true"><i />{copy.reflection.previous}</span> : null}<span className={styles.currentTensionMarker} aria-hidden="true"><i />{copy.reflection.currentMarker}</span><input aria-label={`${copy.reflection.currentMarker} ${data.tensionPosition}/100`} type="range" min="0" max="100" value={data.tensionPosition} onChange={(event) => setData({ tensionPosition: Number(event.target.value) })} /></div>
      <div className={styles.tensionContexts}><label>{d(data.leftLabel)} {copy.reflection.leftMatters}<textarea value={d(data.leftContext)} onChange={(event) => setData({ leftContext: event.target.value })} /></label><label>{d(data.rightLabel)} {copy.reflection.leftMatters}<textarea value={d(data.rightContext)} onChange={(event) => setData({ rightContext: event.target.value })} /></label></div>
      <label className={styles.fullField}>{copy.reflection.different}<textarea value={d(data.difference)} onChange={(event) => setData({ difference: event.target.value })} /></label>
    </div> : null}
    {session.tool === "perspective_split" ? <div className={styles.perspectiveTool}>{([['think',copy.reflection.think],['feel',copy.reflection.feel],['fear',copy.reflection.fear],['want',copy.reflection.want]] as const).map(([key,label]) => <label key={key} data-filled={Boolean(data[key])}><span>{label}<small>{copy.reflection.tentative}</small></span><textarea value={d(data[key])} onChange={(event) => setData({ [key]: event.target.value })} /></label>)}</div> : null}
    {session.tool === "unsaid" ? <div className={styles.unsaidTool}><label>{copy.reflection.unsaidQuestion}<textarea value={d(data.unsaid)} onChange={(event) => setData({ unsaid: event.target.value })} /></label><label className={styles.privateCheck}><input aria-label={copy.reflection.keepPrivateAria} type="checkbox" checked={data.keepUnsaidPrivate} onChange={(event) => setData({ keepUnsaidPrivate: event.target.checked })} /><span><strong>{copy.reflection.keepPrivate}</strong><small>{copy.reflection.keepPrivateHelp}</small></span></label></div> : null}
    <button className={styles.primaryButton} type="button" disabled={busy} onClick={() => advance("RESOLVE")}>{busy ? copy.reflection.keepingView : copy.reflection.bringBack}</button>
  </section>;
}

function ResolveBlock({ session, update, advance, busy }: { session: ReflectionSession; update: (patch: Partial<ReflectionSession>) => void; advance: (state: AgentState, patch?: Partial<ReflectionSession>) => Promise<void>; busy: boolean }) {
  const { locale } = useLocale();
  const copy = getLivingCopy(locale);
  return <section className={styles.canvasBlock}><p className={styles.blockIndex}>{copy.reflection.resolveIndex}</p><h1>{copy.reflection.resolveTitle}</h1><p>{copy.reflection.resolveBody}</p><label className={styles.fullField}>{copy.reflection.nextStep}<textarea value={session.nextStep} onChange={(event) => update({ nextStep: event.target.value })} /></label><div className={styles.buttonRow}><button className={styles.primaryButton} type="button" disabled={busy} onClick={() => advance("REFLECT")}>{busy ? copy.reflection.checking : copy.reflection.lookPattern}</button><button className={styles.outlineButton} type="button" onClick={() => update({ state: "COMPLETE", outcome: "resolved_only" })}>{copy.reflection.enough}</button></div></section>;
}
