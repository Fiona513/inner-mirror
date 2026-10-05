"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import type { Session } from "./core/types.ts";
import { resolveNoValidCopy, type InteractionDefinition, type ScenarioPack } from "./packs/types.ts";
import {
  answerCorrectionFollowup,
  answerJourneyInteraction,
  answerJourneyRanking,
  answerRecognition,
  continueFromFirstAgentMoment,
  continueFromRevision,
  createJourneySession,
  currentJourneyInteraction,
  enterJourney,
  requestRecognition,
} from "./journey/journey-machine.ts";
import { getScenarioPack, scenarioPacks, type ScenarioPackId } from "./packs/registry.ts";
import {
  deriveSpatialReasoningView,
  type SpatialDirection,
  type SpatialReasoningView,
} from "./spatial/spatial-state.ts";
import styles from "./V4CoreJourney.module.css";

const stateLabels: Record<Session["state"], string> = {
  ENTER: "一次具体的探索",
  CLARIFY: "先靠近这件事",
  DIFFERENTIATE: "再看一眼",
  FIRST_AGENT_MOMENT: "两种可能",
  EXPLORE: "再分清一点",
  REVISION: "刚才的答案带来了一点变化",
  GO_DEEPER: "再确认一下",
  RECOGNITION: "暂时留下这一句",
  NO_VALID_INSIGHT: "先留一点空白",
  CORRECT_AND_LEAVE: "这次先到这里",
};

type EntryStage = "PRELUDE" | "SELECTOR" | "HOLDING" | "HOLDING_ENDED";

const entryStageLabels: Record<EntryStage, string> = {
  PRELUDE: "慢慢靠近",
  SELECTOR: "先选一个现实处境",
  HOLDING: "先留一点空间",
  HOLDING_ENDED: "这次先停在这里",
};

function createClientSessionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `journey-${crypto.randomUUID()}`;
  }
  return `journey-${Date.now()}`;
}

function hypothesisStatement(pack: ScenarioPack, id?: string) {
  return pack.hypotheses.find((item) => item.id === id)?.statement;
}

function optionLabel(pack: ScenarioPack, session: Session, signalId?: string) {
  const signal = session.signals.find((item) => item.id === signalId);
  if (!signal) return undefined;
  const interaction = pack.interactions.find((item) => item.key === signal.key);
  if (Array.isArray(signal.value)) {
    return signal.value
      .map((item) => interaction?.options.find((option) => option.id === String(item))?.label)
      .filter((label): label is string => Boolean(label))
      .join(" → ");
  }
  return interaction?.options.find((item) => item.id === signal.value)?.label;
}

function evidenceLabels(pack: ScenarioPack, session: Session, signalIds: string[]) {
  return signalIds
    .map((signalId) => optionLabel(pack, session, signalId))
    .filter((label): label is string => Boolean(label));
}

function Frame({
  session,
  spatialState,
  experienceLabel,
  entryState,
  children,
}: {
  session: Session;
  spatialState?: SpatialReasoningView["state"];
  experienceLabel?: string;
  entryState?: EntryStage;
  children: ReactNode;
}) {
  return (
    <div
      className={styles.root}
      data-journey-state={session.state}
      data-spatial-state={spatialState}
      data-entry-state={entryState}
    >
      <a className={styles.skipLink} href="#v4-main">跳到本次探索</a>
      <header className={styles.header}>
        {/* The V4 preview hands off to the separate V3 root without RSC prefetch. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className={styles.brand} href="/" aria-label="回到 Inner Mirror 当前首页">
          <span>Inner Mirror</span>
          <small>内在镜像</small>
        </a>
        <p aria-live="polite">{experienceLabel ?? stateLabels[session.state]}</p>
      </header>
      <main id="v4-main" className={styles.main} tabIndex={-1}>
        <aside className={styles.position} aria-hidden="true">
          <span className={styles.positionLine} />
          <i className={styles.positionMark} />
        </aside>
        <section className={styles.stage}>
          {children}
        </section>
      </main>
    </div>
  );
}

function PrimaryAction({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button className={styles.primaryAction} type="button" onClick={onClick}>{children}<span aria-hidden="true">→</span></button>;
}

function EvidenceTrace({ labels }: { labels: string[] }) {
  if (!labels.length) return null;
  return (
    <aside className={styles.evidenceTrace} aria-label="刚才留下的选择">
      <span>刚才留下</span>
      <div>
        {labels.map((label, index) => <q key={`${label}:${index}`}>{label}</q>)}
      </div>
    </aside>
  );
}

function RankingView({
  interaction,
  previousEvidence,
  onRank,
  onAbstain,
}: {
  interaction: InteractionDefinition;
  previousEvidence: string[];
  onRank: (order: string[]) => void;
  onAbstain: (optionId: string) => void;
}) {
  const rankable = interaction.options.filter((option) => !option.isAbstain);
  const abstain = interaction.options.find((option) => option.isAbstain);
  const [firstChoice, setFirstChoice] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const visibleOptions = firstChoice
    ? rankable.filter((option) => option.id !== firstChoice)
    : rankable;
  const firstChoiceLabel = interaction.options.find((option) => option.id === firstChoice)?.label;
  const prompt = firstChoice
    ? "如果还可以再留一个呢？"
    : "如果现在只能先照顾一部分，你最不想先放掉哪一个？";
  const chooseOption = (optionId: string) => {
    if (submitting) return;
    if (!firstChoice) {
      setFirstChoice(optionId);
      return;
    }
    setSubmitting(true);
    try {
      onRank([firstChoice, optionId]);
    } catch (error) {
      setSubmitting(false);
      throw error;
    }
  };
  const abstainFromRanking = () => {
    if (!abstain || submitting) return;
    setSubmitting(true);
    try {
      onAbstain(abstain.id);
    } catch (error) {
      setSubmitting(false);
      throw error;
    }
  };
  return (
    <div className={styles.interactionLayout}>
      <div className={styles.copyColumn}>
        <EvidenceTrace labels={previousEvidence} />
        <p className={styles.kicker}>{firstChoice ? "再留一个" : "先留一个"}</p>
        <h1>{prompt}</h1>
      </div>
      <div className={styles.preferencePanel} role="group" aria-label={prompt} data-preference-stage={firstChoice ? "SECOND" : "FIRST"}>
        {firstChoiceLabel && (
          <div className={styles.preferenceAnchor} role="status">
            <span>刚才留下</span>
            <strong>{firstChoiceLabel}</strong>
          </div>
        )}
        <div className={styles.preferenceOptions}>
          {visibleOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              disabled={submitting}
              onClick={() => chooseOption(option.id)}
            >
              <strong>{option.label}</strong>
              <span aria-hidden="true">→</span>
            </button>
          ))}
        </div>
        <div className={styles.preferenceActions}>
          {firstChoice && (
            <button className={styles.resetChoice} type="button" disabled={submitting} onClick={() => setFirstChoice(undefined)}>
              换一个先留下的
            </button>
          )}
          {abstain && (
            <button className={styles.abstainAction} type="button" disabled={submitting} onClick={abstainFromRanking}>
              {abstain.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function InteractionView({
  pack,
  session,
  onAnswer,
  onRank,
}: {
  pack: ScenarioPack;
  session: Session;
  onAnswer: (optionId: string) => void;
  onRank: (order: string[]) => void;
}) {
  const interaction = currentJourneyInteraction(pack, session);
  const [submittedInteractionId, setSubmittedInteractionId] = useState<string>();
  if (!interaction) return null;
  const previousEvidence = session.signals
    .filter((signal) => signal.source !== "confirmation" && !signal.abstained)
    .map((signal) => optionLabel(pack, session, signal.id))
    .filter((label): label is string => Boolean(label));
  if (interaction.kind === "ranking") {
    return <RankingView interaction={interaction} previousEvidence={previousEvidence} onRank={onRank} onAbstain={onAnswer} />;
  }
  const submitting = submittedInteractionId === interaction.id;
  const answerOnce = (optionId: string) => {
    if (submitting) return;
    setSubmittedInteractionId(interaction.id);
    try {
      onAnswer(optionId);
    } catch (error) {
      setSubmittedInteractionId(undefined);
      throw error;
    }
  };
  return (
    <div className={styles.interactionLayout}>
      <div className={styles.copyColumn}>
        <EvidenceTrace labels={previousEvidence} />
        <p className={styles.kicker}>{session.state === "EXPLORE" ? "换一个条件看看" : "先看此刻"}</p>
        <h1>{interaction.prompt}</h1>
        <p className={styles.supportingCopy}>
          {session.state === "EXPLORE"
            ? "想象这个变化，再选更接近你的一项。"
            : "选一个更靠近此刻的，不确定也可以。"}
        </p>
      </div>
      <div className={styles.optionList} role="group" aria-label={interaction.prompt}>
        {interaction.options.map((option) => (
          <button key={option.id} className={option.isAbstain ? styles.abstainOption : undefined} type="button" disabled={submitting} onClick={() => answerOnce(option.id)}>
            <strong>{option.label}</strong>
            <i aria-hidden="true">{option.isAbstain ? "不确定也可以" : "→"}</i>
          </button>
        ))}
      </div>
    </div>
  );
}

const directionStatusLabels: Record<SpatialDirection["status"], string> = {
  leading: "此刻稍微更靠近",
  available: "也仍然说得通",
  dominant: "现在更靠近",
  receded: "暂时退后",
  rejected: "已经放下",
  remaining: "重新被看见",
  stabilized: "暂时稳定下来",
  withdrawn: "暂时不固定",
};

function SpatialDirectionView({ direction }: { direction: SpatialDirection }) {
  const label = direction.slot === "a" ? "一种可能" : "另一种可能";
  const stateLabel = directionStatusLabels[direction.status];
  return (
    <article
      className={`${styles.spatialDirection} ${direction.slot === "a" ? styles.directionA : styles.directionB}`}
      data-direction={direction.slot}
      data-direction-status={direction.status}
      aria-label={`${label}，${stateLabel}`}
    >
      <span className={styles.directionName}>{label}</span>
      <p>{direction.statement}</p>
      <small>{stateLabel}</small>
    </article>
  );
}

function ReasoningSpace({ view, triggerLabel }: { view: SpatialReasoningView; triggerLabel?: string }) {
  const showsRevisionEvidence =
    view.state === "A_DOMINANT" ||
    view.state === "B_DOMINANT" ||
    view.state === "BOTH_WEAKENED";

  return (
    <section className={styles.reasoningSpace} data-spatial-state={view.state} aria-label="两种理解方向之间的变化">
      <p className={styles.srOnly} aria-live="polite">{view.announcement}</p>
      <span className={styles.spaceAxis} aria-hidden="true" />
      {view.hasPair && <SpatialDirectionView direction={view.directionA} />}
      <div className={styles.openCenter} aria-hidden={view.state !== "OPEN"}>
        <span>{view.state === "OPEN" ? "这里先保持打开" : ""}</span>
      </div>
      {triggerLabel && showsRevisionEvidence && (
        <aside className={styles.evidencePresence} aria-label={`刚才的回答：${triggerLabel}`}>
          <span>你刚才选择</span>
          <q>{triggerLabel}</q>
        </aside>
      )}
      {view.hasPair && <SpatialDirectionView direction={view.directionB} />}
    </section>
  );
}

function SpatialJourney({
  pack,
  session,
  view,
  children,
}: {
  pack: ScenarioPack;
  session: Session;
  view: SpatialReasoningView;
  children: ReactNode;
}) {
  const triggerLabel = optionLabel(pack, session, view.triggerSignalId);
  const formationEvidence = session.state === "FIRST_AGENT_MOMENT"
    ? session.signals
      .filter((signal) => signal.source !== "confirmation" && !signal.abstained)
      .slice(-2)
      .map((signal) => optionLabel(pack, session, signal.id))
      .filter((label): label is string => Boolean(label))
    : [];
  return (
    <div className={styles.reasoningJourney}>
      <div className={styles.contextBand}>
        <p className={styles.contextLine}>你正在面对：{session.lifeContext.label}</p>
        {formationEvidence.length > 0 && (
          <p className={styles.formationEvidence} aria-label="形成两种方向前留下的选择">
            <span>从这些选择慢慢展开</span>
            {formationEvidence.join(" · ")}
          </p>
        )}
      </div>
      <ReasoningSpace view={view} triggerLabel={triggerLabel} />
      <div className={styles.continuumFocus} data-focus-state={session.state}>
        {children}
      </div>
    </div>
  );
}

function DiscriminatorView({ pack, session, onAnswer }: { pack: ScenarioPack; session: Session; onAnswer: (optionId: string) => void }) {
  const interaction = currentJourneyInteraction(pack, session);
  if (!interaction) return null;
  return (
    <div className={styles.discriminatorFocus}>
      <div>
        <p className={styles.kicker}>换一个条件看看</p>
        <h1>{interaction.prompt}</h1>
      </div>
      <div className={styles.discriminatorOptions} role="group" aria-label={interaction.prompt}>
        {interaction.options.map((option) => (
          <button key={option.id} type="button" onClick={() => onAnswer(option.id)}>
            <strong>{option.label}</strong>
            <span aria-hidden="true">→</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function RevisionFocus({ pack, session, onContinue }: { pack: ScenarioPack; session: Session; onContinue: () => void }) {
  const revision = session.lastRevision;
  const trigger = optionLabel(pack, session, revision?.triggerSignalIds[0]);
  const previousStatement = hypothesisStatement(pack, revision?.previousPrimary);
  const currentStatement = hypothesisStatement(pack, revision?.newPrimary);
  const title = revision?.type === "primary_switch"
    ? "刚才那个答案，让另一种可能更像了。"
    : revision?.type === "both_weakened"
      ? "刚才那个答案，让两种可能都退后了一点。"
      : "刚才那个答案，让这层理解更清楚了。";
  return (
    <div className={styles.revisionFocus} aria-live="polite">
      <div>
        <p className={styles.kicker}>有一点变化</p>
        <h1>{title}</h1>
        <details className={styles.explanation}>
          <summary>为什么会这样？</summary>
          <div>
            {previousStatement && <p><span>之前更像</span>{previousStatement}</p>}
            {trigger && <p><span>刚才的回答</span>{trigger}</p>}
            {currentStatement && <p><span>现在更像</span>{currentStatement}</p>}
          </div>
        </details>
      </div>
      <PrimaryAction onClick={onContinue}>继续</PrimaryAction>
    </div>
  );
}

function RecognitionView({ pack, session, onRespond }: { pack: ScenarioPack; session: Session; onRespond: (response: "strongly_endorsed" | "partially_endorsed" | "rejected" | "prefer_alternative" | "reject_both") => void }) {
  const insight = session.insight;
  if (!insight) return null;
  const sourceLabels = evidenceLabels(pack, session, insight.sourceSignalIds);
  return (
    <div className={styles.recognitionLayout}>
      <div className={styles.copyColumn}>
        <p className={styles.kicker}>先留下一句</p>
        <h1>有一句话，可以先放在这里。</h1>
        <p className={styles.supportingCopy}>看看它离你有多近。</p>
      </div>
      <blockquote className={styles.insightStatement}>{insight.statement}</blockquote>
      <details className={styles.explanation}>
        <summary>为什么会这样？</summary>
        <div>
          {sourceLabels.map((label, index) => <p key={`${label}:${index}`}><span>你刚才提到</span>{label}</p>)}
          <p><span>也对照过</span>另一种可能</p>
        </div>
      </details>
      <div className={styles.correctionActions} role="group" aria-label="这组理解离你有多近">
        <button type="button" onClick={() => onRespond("strongly_endorsed")}>很贴近</button>
        <button type="button" onClick={() => onRespond("partially_endorsed")}>有一点像</button>
        <button type="button" onClick={() => onRespond("rejected")}>不太像</button>
        {session.activeAlternative && <button type="button" onClick={() => onRespond("prefer_alternative")}>更像刚才另一种</button>}
        <button type="button" onClick={() => onRespond("reject_both")}>两个都不像</button>
      </div>
    </div>
  );
}

function NoValidInsightView({ pack, session, onRestart }: { pack: ScenarioPack; session: Session; onRestart: () => void }) {
  const [ended, setEnded] = useState(false);
  const noValidCopy = resolveNoValidCopy(pack, session.presentedPair);
  return (
    <div className={styles.leaveLayout} aria-live="polite">
      <p className={styles.kicker}>{ended ? "先放在这里" : "不用急着说清"}</p>
      <h1>{ended ? "先把这个问题留在这里。" : "这次还不用急着给它一个答案。"}</h1>
      {!ended && <p className={styles.supportingCopy}>{noValidCopy.summary}</p>}
      {!ended && <p className={styles.openQuestion}>{session.openQuestion}</p>}
      {ended && <p className={styles.supportingCopy}>不急着定义它，也是一种清楚。</p>}
      <div className={styles.terminalActions}>
        {!ended && <PrimaryAction onClick={() => setEnded(true)}>先留在这里</PrimaryAction>}
        <button className={styles.abstainAction} type="button" onClick={onRestart}>换一件事看看</button>
      </div>
    </div>
  );
}

function OpeningPrelude({ onContinue }: { onContinue: () => void }) {
  return (
    <div className={styles.preludeLayout} aria-labelledby="prelude-title">
      <div className={styles.preludeField} aria-hidden="true">
        <span className={styles.preludeLine} />
        <i className={styles.preludeAnchor} />
      </div>
      <div className={styles.preludeBeats}>
        <h1 id="prelude-title" className={styles.preludeBeat} data-beat="1">先不用急着回答。</h1>
        <p className={styles.preludeBeat} data-beat="2">有些事只是一直停在心里，还没有被说清。</p>
        <p className={styles.preludeBeat} data-beat="3">我们可以从一件具体的事，慢慢靠近。</p>
      </div>
      <div className={styles.preludeActions}>
        <PrimaryAction onClick={onContinue}>慢慢开始</PrimaryAction>
        <button className={styles.preludeSkip} type="button" onClick={onContinue}>跳过开场</button>
      </div>
    </div>
  );
}

function ScenarioSelector({
  headingRef,
  onSelect,
  onUnsupported,
}: {
  headingRef: RefObject<HTMLHeadingElement | null>;
  onSelect: (packId: ScenarioPackId) => void;
  onUnsupported: () => void;
}) {
  const scenarioNumbers = ["01", "02"];
  return (
    <div className={styles.scenarioSelectorLayout}>
      <div className={styles.copyColumn}>
        <p className={styles.kicker}>目前开放的探索</p>
        <h1 ref={headingRef} tabIndex={-1}>这一次，哪一种更接近你正在经历的？</h1>
        <p className={styles.supportingCopy}>现在先从两个具体处境开始。都不贴近，也可以。</p>
      </div>
      <div className={styles.scenarioOptions} role="group" aria-label="选择一个现实处境">
        {scenarioPacks.map((scenario, index) => (
          <button key={scenario.id} type="button" onClick={() => onSelect(scenario.id)}>
            <span>{scenarioNumbers[index]}</span>
            <strong>{scenario.label}</strong>
            <i aria-hidden="true">→</i>
          </button>
        ))}
        <button className={styles.selectorNone} type="button" onClick={onUnsupported}>
          <span aria-hidden="true">··</span>
          <strong>这两种都不贴近</strong>
        </button>
      </div>
    </div>
  );
}

function HoldingSpace({
  ended,
  headingRef,
  onStay,
  onReturn,
}: {
  ended: boolean;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onStay: () => void;
  onReturn: () => void;
}) {
  return (
    <div className={styles.holdingLayout} data-holding-ended={ended ? "true" : "false"}>
      <div className={styles.holdingField} aria-hidden="true">
        <span />
        <i />
        <i />
      </div>
      <div className={styles.holdingCopy} aria-live="polite">
        <p className={styles.kicker}>{ended ? "这次先到这里" : "先不用归类"}</p>
        <h1 ref={headingRef} tabIndex={-1}>
          {ended ? "这次就先停在这里。" : "那先不用把它放进这两个入口里。"}
        </h1>
        <p className={styles.supportingCopy}>
          {ended
            ? "这里没有被固定成答案。等有更合适的入口时，再回来也可以。"
            : "有些烦躁、关系或家庭里的事，暂时说不清很正常。Inner Mirror 现在还不能对这些情况作出可靠理解。"}
        </p>
        {!ended && (
          <p className={styles.holdingSupport}>这次可以先停在这里，不需要为了继续而勉强选择。</p>
        )}
        <div className={styles.holdingActions}>
          {!ended && <PrimaryAction onClick={onStay}>先留在这里</PrimaryAction>}
          <button className={styles.secondaryAction} type="button" onClick={onReturn}>返回看看</button>
        </div>
      </div>
    </div>
  );
}

export default function V4CoreJourney() {
  const [scenarioSelected, setScenarioSelected] = useState(false);
  const [entryStage, setEntryStage] = useState<EntryStage>("PRELUDE");
  const [session, setSession] = useState(() => createJourneySession(scenarioPacks[0], "selector-shell"));
  const entryHeadingRef = useRef<HTMLHeadingElement>(null);
  const pack = useMemo(() => getScenarioPack(session.scenarioPackId), [session.scenarioPackId]);
  const interaction = useMemo(() => currentJourneyInteraction(pack, session), [pack, session]);
  const spatialView = useMemo(() => deriveSpatialReasoningView(session), [session]);

  useEffect(() => {
    if (scenarioSelected || entryStage === "PRELUDE") return;
    entryHeadingRef.current?.focus({ preventScroll: true });
  }, [entryStage, scenarioSelected]);

  const selectScenario = (packId: ScenarioPackId) => {
    const selectedPack = getScenarioPack(packId);
    setSession(createJourneySession(selectedPack, createClientSessionId()));
    setScenarioSelected(true);
  };

  const start = () => {
    const fresh = createJourneySession(pack, createClientSessionId());
    setSession(enterJourney(fresh));
  };
  const restart = () => {
    setSession(createJourneySession(scenarioPacks[0], "selector-shell"));
    setScenarioSelected(false);
    setEntryStage("SELECTOR");
  };
  const answer = (optionId: string) => {
    if (!interaction) return;
    setSession(answerJourneyInteraction(pack, session, optionId, `${session.id}:${interaction.id}:${optionId}`));
  };
  const rank = (order: string[]) => {
    if (!interaction || interaction.kind !== "ranking") return;
    setSession(answerJourneyRanking(pack, session, order, `${session.id}:${interaction.id}:ranking`));
  };

  let content: ReactNode;
  let spatialFocus: ReactNode | undefined;
  if (!scenarioSelected) {
    if (entryStage === "PRELUDE") {
      return (
        <Frame session={session} entryState={entryStage} experienceLabel={entryStageLabels[entryStage]}>
          <OpeningPrelude onContinue={() => setEntryStage("SELECTOR")} />
        </Frame>
      );
    }
    if (entryStage === "HOLDING" || entryStage === "HOLDING_ENDED") {
      return (
        <Frame session={session} entryState={entryStage} experienceLabel={entryStageLabels[entryStage]}>
          <HoldingSpace
            ended={entryStage === "HOLDING_ENDED"}
            headingRef={entryHeadingRef}
            onStay={() => setEntryStage("HOLDING_ENDED")}
            onReturn={() => setEntryStage("SELECTOR")}
          />
        </Frame>
      );
    }
    return (
      <Frame session={session} entryState={entryStage} experienceLabel={entryStageLabels[entryStage]}>
        <ScenarioSelector
          headingRef={entryHeadingRef}
          onSelect={selectScenario}
          onUnsupported={() => setEntryStage("HOLDING")}
        />
      </Frame>
    );
  }
  switch (session.state) {
    case "ENTER":
      content = <div className={styles.enterLayout}><p className={styles.kicker}>{pack.entry.kicker}</p><h1>{pack.entry.title}</h1><p className={styles.supportingCopy}>{pack.entry.support}</p><PrimaryAction onClick={start}>{pack.entry.action}</PrimaryAction><p className={styles.entryBoundary}>{pack.entry.boundary}</p></div>;
      break;
    case "CLARIFY":
    case "DIFFERENTIATE":
      content = <InteractionView pack={pack} session={session} onAnswer={answer} onRank={rank} />;
      break;
    case "FIRST_AGENT_MOMENT":
      spatialFocus = <div className={styles.firstAgentFocus}><div><p className={styles.kicker}>先不用选哪一个对</p><h1>这里现在有两种不太一样的可能。</h1><p className={styles.supportingCopy}>再看一个变化，也许会更清楚。</p></div><PrimaryAction onClick={() => setSession(continueFromFirstAgentMoment(session))}>再分清一点</PrimaryAction></div>;
      content = null;
      break;
    case "EXPLORE":
      spatialFocus = <DiscriminatorView pack={pack} session={session} onAnswer={answer} />;
      content = null;
      break;
    case "REVISION":
      spatialFocus = <RevisionFocus pack={pack} session={session} onContinue={() => setSession(continueFromRevision(session))} />;
      content = null;
      break;
    case "GO_DEEPER":
      spatialFocus = session.pendingCorrection
        ? session.pendingCorrection.mode === "both_rejected"
          ? <div className={styles.correctionLayout} aria-live="polite"><p className={styles.kicker}>那就先停在这里</p><h1>这两种好像都没有说中。</h1><p className={styles.supportingCopy}>不用再换一种说法继续猜。</p><div className={styles.correctionChoice}><button type="button" onClick={() => setSession(answerCorrectionFollowup(pack, session, "still_not_fit", `${session.id}:correction:stop`))}>先留在这里</button></div></div>
          : <div className={styles.correctionLayout} aria-live="polite"><p className={styles.kicker}>换一种看看</p><h1>刚才那个不太像，那这一种呢？</h1><p className={styles.correctionStatement}>{hypothesisStatement(pack, session.pendingCorrection.reconsideredHypothesisId) ?? pack.correctionPrompt}</p><div className={styles.correctionChoice}><button type="button" onClick={() => setSession(answerCorrectionFollowup(pack, session, "reconsidered_fits", `${session.id}:correction:fits`))}>这个更接近</button><button type="button" onClick={() => setSession(answerCorrectionFollowup(pack, session, "still_not_fit", `${session.id}:correction:reject`))}>也不是这个</button></div></div>
        : <div className={styles.checkLayout}><p className={styles.kicker}>把刚才的选择放在一起</p><h1>{session.primary ? "看看会不会出现一句更贴近的话。" : "这两种好像都只说中了一部分。"}</h1><PrimaryAction onClick={() => setSession(requestRecognition(pack, session))}>看看这句话</PrimaryAction></div>;
      content = null;
      break;
    case "RECOGNITION":
      spatialFocus = <RecognitionView pack={pack} session={session} onRespond={(response) => setSession(answerRecognition(pack, session, response, `${session.id}:recognition:${response}`))} />;
      content = null;
      break;
    case "NO_VALID_INSIGHT":
      spatialFocus = <NoValidInsightView pack={pack} session={session} onRestart={restart} />;
      content = null;
      break;
    case "CORRECT_AND_LEAVE":
      spatialFocus = <div className={styles.leaveLayout} data-end-kind={session.insight?.status === "partial" ? "partial" : "endorsed"}><p className={styles.kicker}>{session.insight?.status === "partial" ? "先只留下贴近的部分" : "这次先留下这一点"}</p><h1>{session.insight?.status === "partial" ? "目前比较接近的是" : "这次比较清楚的一点"}</h1><blockquote className={styles.endStatement}>{session.insight?.statement}</blockquote><p className={styles.supportingCopy}>{session.insight?.status === "partial" ? "还有一部分没完全说清，先不用把它说满。" : "它只属于刚才那件具体的事，不把它写成关于你的固定结论。"}</p><PrimaryAction onClick={restart}>换一件事看看</PrimaryAction></div>;
      content = null;
      break;
    default:
      content = null;
  }

  if (spatialFocus !== undefined) {
    content = <SpatialJourney pack={pack} session={session} view={spatialView}>{spatialFocus}</SpatialJourney>;
  }

  return <Frame session={session} spatialState={spatialFocus !== undefined ? spatialView.state : undefined}>{content}</Frame>;
}
