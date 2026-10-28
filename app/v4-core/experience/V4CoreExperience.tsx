"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  EXPLORATION_FEELINGS,
  RETURN_CHANGES,
  TODAY_REASONS,
  explorationQuestion,
  feelingObservation,
  getExplorationNeedOptions,
  getFeeling,
  getReason,
  needQuestion,
} from "./content.ts";
import {
  answerFeeling,
  answerNeedAndComplete,
  beginSession,
  completeReturnValue,
  continueExploration,
  correctFirstValue,
  createEmptyExperienceState,
  finishToday,
  getLatestFragment,
  recordVisit,
  reviewFragmentFeedback,
  reviewPreviousFragment,
  selectTodayReason,
  setThinkingPreference,
  setOptionalNote,
  showReturningState,
  type TransitionMeta,
} from "./experience-machine.ts";
import InnerWorldStage, { type InnerWorldMode } from "./InnerWorldStage.tsx";
import { loadExperienceState, saveExperienceState } from "./storage.ts";
import type {
  ExplorationFeelingId,
  ExplorationNeedId,
  MbtiType,
  ReturnChangeId,
  TodayReasonId,
  V4ExperienceState,
} from "./types.ts";
import {
  MBTI_TYPES,
  getThinkingStyle,
  preferenceExplorationQuestion,
  preferenceNeedQuestion,
} from "./preferences.ts";
import styles from "./V4CoreExperience.module.css";

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function makeMeta(options: { signal?: boolean; session?: boolean; fragment?: boolean } = {}): TransitionMeta {
  const now = new Date().toISOString();
  return {
    now,
    eventId: createId("event"),
    signalId: options.signal ? createId("signal") : undefined,
    sessionId: options.session ? createId("session") : undefined,
    fragmentId: options.fragment ? createId("fragment") : undefined,
  };
}

function sessionMeta(state: V4ExperienceState, options: { signal?: boolean; fragment?: boolean } = {}) {
  return {
    ...makeMeta(options),
    sessionId: state.currentSession?.id,
  };
}

function ActionButton({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button className={styles.primaryAction} type="button" onClick={onClick} disabled={disabled}>
      <span>{children}</span>
      <i aria-hidden="true">→</i>
    </button>
  );
}

function QuietButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button className={styles.quietAction} type="button" onClick={onClick}>{children}</button>;
}

function ChoiceList<T extends string>({
  label,
  items,
  onSelect,
}: {
  label: string;
  items: { id: T; label: string }[];
  onSelect: (id: T) => void;
}) {
  return (
    <div className={styles.choiceList} role="group" aria-label={label}>
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => onSelect(item.id)}>
          <span>{item.label}</span>
          <i aria-hidden="true">↗</i>
        </button>
      ))}
    </div>
  );
}

function WhyThis({ labels }: { labels: string[] }) {
  const uniqueLabels = [...new Set(labels)];

  return (
    <details className={styles.whyThis}>
      <summary>为什么出现这个？</summary>
      <div>
        <span>来自你刚刚留下的</span>
        {uniqueLabels.map((label) => <q key={label}>{label}</q>)}
        <p>这里只展示你的输入依据，不是隐藏的心理分析。</p>
      </div>
    </details>
  );
}

function TrustPanel({ kind, onClose }: { kind: "privacy" | "boundary"; onClose: () => void }) {
  return (
    <div className={styles.trustOverlay} role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className={styles.trustPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="v4-trust-title"
      >
        <button className={styles.trustClose} type="button" onClick={onClose} aria-label="关闭说明">×</button>
        <p className={styles.kicker}>{kind === "privacy" ? "Privacy" : "Boundaries"}</p>
        <h2 id="v4-trust-title">{kind === "privacy" ? "你的信息如何保存" : "Inner Mirror 的使用边界"}</h2>
        {kind === "privacy" ? (
          <>
            <p>今天的选择与 Fragment 默认保存在当前浏览器，用来在你下次回来时延续这段探索。</p>
            <p>轻量事件只记录流程节点，不记录你在可选输入框里写下的原文。</p>
          </>
        ) : (
          <>
            <p>Inner Mirror 是自我探索体验，不是心理测试、医疗诊断或危机支持服务。</p>
            <p>这里留下的是可以被你修正的阶段性观察，不会把一次状态定义成固定的你。</p>
          </>
        )}
      </section>
    </div>
  );
}

export default function V4CoreExperience() {
  const [store, setStore] = useState<V4ExperienceState>(() => createEmptyExperienceState());
  const [hydrated, setHydrated] = useState(false);
  const [worldExpanded, setWorldExpanded] = useState(false);
  const [trustPanel, setTrustPanel] = useState<"privacy" | "boundary" | null>(null);
  const visitRecorded = useRef(false);
  const worldRef = useRef<HTMLDivElement>(null);
  const noteDetailsRef = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    if (visitRecorded.current) return;
    visitRecorded.current = true;
    const loaded = loadExperienceState();
    const hasHistory = loaded.fragments.length > 0;
    const restored = loaded.currentSession?.status === "active"
      ? loaded
      : hasHistory
        ? showReturningState(loaded)
        : loaded;
    const next = recordVisit(restored, makeMeta(), hasHistory);
    setStore(next);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveExperienceState(store);
  }, [hydrated, store]);

  const session = store.currentSession;
  const latestFragment = useMemo(() => getLatestFragment(store), [store]);
  const currentReason = getReason(session?.reasonId);
  const currentFeeling = getFeeling(session?.signals.find((item) => item.family === "current_feeling")?.value);
  const currentNeedOptions = getExplorationNeedOptions(currentFeeling?.id);
  const thinkingStyle = getThinkingStyle(store.thinkingPreference?.mbtiType);
  const basisLabels = session?.firstValue?.basisSignalIds
    .map((id) => session.signals.find((signal) => signal.id === id)?.label)
    .filter((label): label is string => Boolean(label)) ?? [];

  const begin = () => setStore((current) => beginSession(current, makeMeta({ session: true })));
  const browse = () => setStore((current) => {
    const started = beginSession(current, makeMeta({ session: true }));
    return selectTodayReason(started, "browsing", sessionMeta(started, { signal: true }));
  });
  const chooseReason = (reasonId: TodayReasonId) => setStore((current) => (
    selectTodayReason(current, reasonId, sessionMeta(current, { signal: true }))
  ));
  const updateThinkingPreference = (value: string) => setStore((current) => setThinkingPreference(
    current,
    value ? value as MbtiType : undefined,
    makeMeta(),
  ));
  const continueFromValue = () => setStore((current) => continueExploration(current, sessionMeta(current)));
  const endWithFragment = () => setStore((current) => finishToday(
    current,
    sessionMeta(current, { fragment: true }),
  ));
  const correct = () => setStore((current) => correctFirstValue(
    current,
    sessionMeta(current, { signal: true }),
  ));
  const chooseFeeling = (id: ExplorationFeelingId) => setStore((current) => answerFeeling(
    current,
    id,
    sessionMeta(current, { signal: true }),
  ));
  const chooseNeed = (id: ExplorationNeedId) => setStore((current) => answerNeedAndComplete(
    current,
    id,
    sessionMeta(current, { signal: true, fragment: true }),
  ));
  const updateNote = (value: string) => setStore((current) => setOptionalNote(current, value, new Date().toISOString()));
  const reviewFragment = (changeId: ReturnChangeId) => {
    if (!latestFragment) return;
    setStore((current) => reviewPreviousFragment(
      current,
      latestFragment.id,
      changeId,
      makeMeta({ session: true, signal: true }),
    ));
  };
  const exploreSomethingElse = () => setStore((current) => beginSession(current, makeMeta({ session: true })));
  const finishReturn = () => setStore((current) => completeReturnValue(
    current,
    sessionMeta(current, { fragment: true }),
  ));

  const latestCompletedSession = store.currentState === "COMPLETE"
    ? [...store.sessions].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0]
    : undefined;
  const displayFragment = latestCompletedSession?.fragmentId
    ? store.fragments.find((item) => item.id === latestCompletedSession.fragmentId)
    : undefined;
  const fragmentSources = displayFragment
    ? [...new Set(displayFragment.sourceSignals.map((signal) => signal.label))]
    : [];
  const reviewCurrentFragment = (feedback: "fits" | "inaccurate") => {
    if (!displayFragment) return;
    setStore((current) => reviewFragmentFeedback(
      current,
      displayFragment.id,
      feedback,
      makeMeta(),
    ));
  };

  const worldMode: InnerWorldMode = store.currentState === "LANDING" || store.currentState === "REASON"
    ? "quiet"
    : store.currentState === "RETURNING"
      ? "returning"
      : store.currentState === "COMPLETE"
        ? displayFragment?.userFeedback === "inaccurate" ? "corrected" : "fragment"
        : session?.firstValue?.userFeedback === "corrected"
          ? "corrected"
          : store.currentState === "EXPLORE_ONE" || store.currentState === "EXPLORE_TWO"
            ? "exploring"
            : "signal";
  const evidenceLabel = session?.signals.find((item) => item.kind === "return_change")?.label
    ?? currentReason?.label;
  const stageLabel: Record<V4ExperienceState["currentState"], string> = {
    LANDING: "从今天开始",
    REASON: "今天为什么来到这里",
    FIRST_VALUE: "第一块线索",
    EXPLORE_ONE: "再靠近一点",
    EXPLORE_TWO: "只再看一步",
    RETURNING: "从上次继续",
    RETURN_VALUE: "今天的变化",
    COMPLETE: "今天的碎片",
  };

  return (
    <div className={styles.root} data-stage={store.currentState} data-hydrated={hydrated}>
      <a className={styles.skipLink} href="#v4-experience">跳到今天的探索</a>
      <header className={styles.header}>
        {/* V4 exits to the separately owned root without RSC prefetch. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className={styles.brand} href="/" aria-label="回到 Inner Mirror 首页">
          <span>Inner Mirror</span>
          <small>内在镜像</small>
        </a>
        <p aria-live="polite">{stageLabel[store.currentState]}</p>
      </header>

      <main id="v4-experience" className={styles.main} tabIndex={-1}>
        <section className={styles.copyStage}>
          {store.currentState === "LANDING" && (
            <div className={styles.landing}>
              <p className={styles.kicker}>A place to notice, not define</p>
              <h1>看看最近的你，正在发生什么。</h1>
              <p className={styles.lead}>不用一次说清自己。从今天的一个状态开始，慢慢看见你最近在意什么、被什么消耗，又在发生怎样的变化。</p>
              <p className={styles.assurance}>没有标准答案，不给你贴标签，也不是心理测试。</p>
              <div className={styles.actions}>
                <ActionButton onClick={begin}>看看今天的我</ActionButton>
                <QuietButton onClick={browse}>我只是随便看看</QuietButton>
              </div>
              <div className={styles.trustLinks} aria-label="信任与使用说明">
                <button type="button" onClick={() => setTrustPanel("privacy")}>隐私说明</button>
                <button type="button" onClick={() => setTrustPanel("boundary")}>使用边界</button>
              </div>
            </div>
          )}

          {store.currentState === "REASON" && (
            <div className={styles.reasonStage}>
              <p className={styles.kicker}>从一个当下开始</p>
              <h1>此刻，哪一句更接近你？</h1>
              <p className={styles.support}>不用解释，也可以选「我也不知道」。</p>
              <ChoiceList label="今天为什么来到这里" items={TODAY_REASONS} onSelect={chooseReason} />
              <QuietButton onClick={() => setStore((current) => ({ ...current, currentState: "LANDING", currentSession: undefined, currentSignals: [] }))}>
                今天先不选
              </QuietButton>
            </div>
          )}

          {(store.currentState === "FIRST_VALUE" || store.currentState === "RETURN_VALUE") && session?.firstValue && (
            <div className={styles.firstValue}>
              <p className={styles.kicker}>{store.currentState === "RETURN_VALUE" ? "从上次的碎片继续" : "刚刚留下了第一条线索。"}</p>
              <h1>{session.firstValue.observation}</h1>
              <p className={styles.caveat}>这是根据你刚刚留下的信息形成的第一条观察，不是结论。你可以看看它像不像你。</p>
              <details className={styles.thinkingPreference}>
                <summary>让接下来的提问更贴近我 <span>可选</span></summary>
                <div>
                  <label htmlFor="v4-mbti-preference">如果你知道自己的 MBTI</label>
                  <select
                    id="v4-mbti-preference"
                    value={store.thinkingPreference?.mbtiType ?? ""}
                    onChange={(event) => updateThinkingPreference(event.target.value)}
                  >
                    <option value="">暂不使用 MBTI</option>
                    {MBTI_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                  <p>它只调整提问方式，不参与结论，也不会成为 Fragment 证据。</p>
                  {thinkingStyle && (
                    <p className={styles.preferenceSummary} role="status">
                      <strong>{thinkingStyle.type}</strong>
                      <span>{thinkingStyle.summary}</span>
                    </p>
                  )}
                </div>
              </details>
              <WhyThis labels={store.currentState === "RETURN_VALUE" && latestFragment
                ? [latestFragment.observation, ...basisLabels]
                : basisLabels} />
              {session.firstValue.userFeedback === "corrected" && (
                <p className={styles.correctionNotice} role="status">那我们改一下。刚才的理解已经退后，只保留你愿意确认的线索。</p>
              )}
              <div className={styles.continuePrompt}>
                <p>如果愿意，可以再留两个轻选择，让这条观察更具体一点。</p>
                <div className={styles.actions}>
                  <ActionButton onClick={continueFromValue}>继续看看</ActionButton>
                  <QuietButton onClick={store.currentState === "RETURN_VALUE" ? finishReturn : endWithFragment}>今天先到这里</QuietButton>
                </div>
              </div>
              {session.firstValue.userFeedback !== "corrected" && (
                <button className={styles.correctionAction} type="button" onClick={correct}>不太像我</button>
              )}
            </div>
          )}

          {store.currentState === "EXPLORE_ONE" && session && (
            <div className={styles.exploration}>
              <p className={styles.memoryLine}>刚才你留下了「{currentReason?.label ?? "一点变化"}」。不急着解释，只再靠近一步。</p>
              <p className={styles.kicker}>一个当下的感觉</p>
              <h1>{preferenceExplorationQuestion(store.thinkingPreference?.mbtiType, explorationQuestion(session.reasonId))}</h1>
              <ChoiceList label="最近出现得更多的感觉" items={EXPLORATION_FEELINGS} onSelect={chooseFeeling} />
              <QuietButton onClick={endWithFragment}>今天先到这里</QuietButton>
            </div>
          )}

          {store.currentState === "EXPLORE_TWO" && session && (
            <div className={styles.exploration}>
              <div className={styles.signalResponse} aria-live="polite">
                <span>你刚才留下了「{currentFeeling?.label ?? "说不上来"}」</span>
                <p>{feelingObservation(currentFeeling?.id)}</p>
              </div>
              <p className={styles.kicker}>只再确认一个情境</p>
              <h1>{preferenceNeedQuestion(store.thinkingPreference?.mbtiType, needQuestion(currentFeeling?.id))}</h1>
              <ChoiceList label="这种感觉通常更接近哪里" items={currentNeedOptions} onSelect={chooseNeed} />
              <details ref={noteDetailsRef} className={styles.optionalNote}>
                <summary>如果你愿意，可以多说一点。</summary>
                <label htmlFor="v4-optional-note">只留给这次探索的一句话</label>
                <textarea
                  id="v4-optional-note"
                  value={session.optionalNote ?? ""}
                  maxLength={280}
                  rows={3}
                  onChange={(event) => updateNote(event.target.value)}
                  placeholder="可以留空"
                />
                <div>
                  <button type="button" onClick={() => {
                    updateNote("");
                    noteDetailsRef.current?.removeAttribute("open");
                  }}>跳过</button>
                  <button type="button" onClick={() => {
                    updateNote("");
                    noteDetailsRef.current?.removeAttribute("open");
                  }}>不知道怎么说</button>
                  <button type="button" onClick={() => noteDetailsRef.current?.removeAttribute("open")}>用选项继续</button>
                </div>
              </details>
              <QuietButton onClick={endWithFragment}>今天先到这里</QuietButton>
            </div>
          )}

          {store.currentState === "RETURNING" && latestFragment && (
            <div className={styles.returning}>
              <p className={styles.kicker}>欢迎回来</p>
              <p className={styles.lastTime}>上次你留下的是</p>
              <h1>{latestFragment.observation}</h1>
              {latestFragment.userFeedback === "inaccurate" && (
                <p className={styles.returnStatus}>你上次觉得这条观察不太像。它现在只作为一条待修正的记录留着。</p>
              )}
              <p className={styles.returnQuestion}>今天，它有变化吗？</p>
              <ChoiceList label="上次的线索今天有变化吗" items={RETURN_CHANGES} onSelect={reviewFragment} />
              <QuietButton onClick={exploreSomethingElse}>今天想看看别的</QuietButton>
            </div>
          )}

          {store.currentState === "COMPLETE" && (
            <div className={styles.complete}>
              <p className={styles.kicker}>Today Fragment</p>
              <h1>今天先到这里。</h1>
              {displayFragment ? (
                <>
                  <p className={styles.completionLine}>你留下了一块新的自己。今天更具体地留下了：</p>
                  <blockquote data-feedback={displayFragment.userFeedback}>{displayFragment.observation}</blockquote>
                  <div className={styles.fragmentSources}>
                    <span>来自</span>
                    <ul>
                      {fragmentSources.map((source) => <li key={source}>{source}</li>)}
                    </ul>
                  </div>
                  <p className={styles.caveat}>这是今天的阶段性观察，不是对你的固定定义。</p>
                  <div className={styles.fragmentFeedback} role="group" aria-label="这条观察像不像你">
                    <span>这条观察现在像你吗？</span>
                    <div>
                      <button
                        type="button"
                        aria-pressed={displayFragment.userFeedback === "fits"}
                        onClick={() => reviewCurrentFragment("fits")}
                      >像我</button>
                      <button
                        type="button"
                        aria-pressed={displayFragment.userFeedback === "inaccurate"}
                        onClick={() => reviewCurrentFragment("inaccurate")}
                      >不太像</button>
                    </div>
                  </div>
                  {displayFragment.userFeedback === "fits" && (
                    <p className={styles.feedbackStatus} role="status">这条观察先作为今天比较贴近你的部分留下。</p>
                  )}
                  {displayFragment.userFeedback === "inaccurate" && (
                    <p className={styles.feedbackStatus} role="status">那就先不把它当成结论。它会以较弱的状态留在这里，等以后继续修正。</p>
                  )}
                </>
              ) : (
                <p className={styles.completionLine}>今天没有添加新的碎片。你上次留下的仍然在这里。</p>
              )}
              <p className={styles.returnInvitation}>下次再来时，我们可以从这里继续，而不是重新认识一次你。</p>
              <div className={styles.actions}>
                <ActionButton onClick={() => {
                  setWorldExpanded(true);
                  worldRef.current?.focus();
                }}>回到我的内在世界</ActionButton>
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a className={styles.quietLink} href="/">下次再继续</a>
              </div>
              {worldExpanded && store.fragments.length > 0 && (
                <div className={styles.worldMemory} role="status">
                  <span>My Inner World · 已留下 {store.fragments.length} 块</span>
                  <p>{getLatestFragment(store)?.observation}</p>
                </div>
              )}
            </div>
          )}
        </section>

        {(store.currentState === "LANDING" || store.currentState === "REASON") && (
          <figure className={styles.heroVisual}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/inner-mirror-room-quiet-v3.jpg"
              alt="暮色里，光线穿过纱帘落在一面镜子和一张折叠纸片上"
            />
            <figcaption>
              <span>Inner Mirror · 00</span>
              <p>先从今天的一点光线开始，不急着看清全部。</p>
            </figcaption>
          </figure>
        )}

        <aside className={styles.worldStage}>
          <InnerWorldStage
            ref={worldRef}
            mode={worldMode}
            fragmentCount={store.fragments.length}
            latestObservation={displayFragment?.observation}
            evidenceLabel={evidenceLabel}
          />
          <p className={styles.worldCaption}>
            <span>My Inner World</span>
            {store.fragments.length > 0 ? `${store.fragments.length} 块今天的碎片留在这里` : "它会随着你的选择慢慢留下痕迹"}
          </p>
          {store.currentState === "COMPLETE" && displayFragment && (
            <p className={styles.worldMeaning}>今天的 Fragment 已经进入这里。这里不会一次定义你，它会随着你留下的东西慢慢变化。</p>
          )}
        </aside>
      </main>
      {trustPanel && <TrustPanel kind={trustPanel} onClose={() => setTrustPanel(null)} />}
    </div>
  );
}
