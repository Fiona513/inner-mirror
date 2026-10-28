"use client";

import { useMemo, useState } from "react";
import { createReflectionSession } from "./agent";
import { LivingShell, PageHeader } from "./LivingShell";
import styles from "./LivingModel.module.css";
import { useLocale } from "../locale/locale";
import { formatLivingDate, labelEnum } from "../locale/living";
import { useLivingModel } from "./LivingModelProvider";
import { LIVING_MODEL_STORAGE_KEY, livingModelReducer } from "./store";
import { describeStateChange, getMostRelevantSnapshotGroup, STATE_METRICS } from "./state-snapshots";
import { ReadOnlyMetric } from "./StateSnapshotCapture";
import type { ReflectionContext } from "./types";
import type { MessageKey } from "../locale/messages";
import { PreviousReflectionPicker, RecentPersonalReflections } from './ReflectionContinuity';
import { localizeDemoText } from "./demo-data";

const contexts: { id: ReflectionContext; labelKey: MessageKey }[] = [
  { id: "decision", labelKey: "now.contextDecision" },
  { id: "feeling", labelKey: "now.contextFeeling" },
  { id: "repeating", labelKey: "now.contextRepeating" },
  { id: "explore", labelKey: "now.contextExplore" },
];

export default function NowPage() {
  const { state, dispatch } = useLivingModel();
  const { locale, t } = useLocale();
  const zh = locale === "zh-CN";
  const d = (value: string) => state.sampleDataLoaded ? localizeDemoText(value, locale) : value;
  const [input, setInput] = useState("");
  const [previousId, setPreviousId] = useState('');
  const [context, setContext] = useState<ReflectionContext>("explore");
  const activeInsights = state.insights.filter((item) => item.status !== "archived" && item.userConfirmed);
  const personalCopy = !state.sampleDataLoaded || state.hasPersonalUnderstanding;
  const changing = state.insights.find((item) => item.status === "changing");
  const recent = useMemo(() => activeInsights.slice(0, 3), [activeInsights]);

  function beginReflection() {
    if (!input.trim()) return;
    const session = createReflectionSession(input, context, state, undefined, undefined, locale);
    session.previousSessionId = state.memoryPaused ? undefined : previousId || undefined;
    const action = { type: "START_REFLECTION", session } as const;
    window.localStorage.setItem(LIVING_MODEL_STORAGE_KEY, JSON.stringify(livingModelReducer(state, action)));
    dispatch(action);
    window.location.assign(`/reflection/${session.id}`);
  }

  return (
    <LivingShell>
      <div className={styles.page}>
        <PageHeader eyebrow={t("nav.now")} title={personalCopy ? t("now.titlePersonal") : t("now.titleExample")} support={activeInsights.length ? personalCopy ? t("now.supportPersonal") : t("now.supportExample") : t("now.supportEmpty")} />
        {state.sampleDataLoaded ? <div className={styles.sampleBanner}><strong>{zh ? "示例人物" : "Sample person"}</strong><span>{zh ? "示例历史始终有清晰标注，不会成为你的个人镜像。" : "Example history stays labelled. It is not part of your personal mirror."}</span></div> : null}
        {state.memoryPaused ? <div className={styles.temporaryBanner}>{zh ? "临时反思模式已开启。本次仍可帮助眼前的问题，但不会更新长期记忆或你的镜像。" : "Temporary reflection mode is on. This session can still help, but it will not update long-term memory or your mirror."}</div> : null}
        <div className={styles.nowGrid}>
          <div className={styles.nowPrimary}>
            <CurrentStateModule />
            <section className={styles.mirrorPreview} aria-labelledby="mirror-preview-title">
              <div className={styles.previewIntro}>
                <p className={styles.sectionLabel}>{zh ? "镜像概览" : "Mirror overview"}</p>
                <p id="mirror-preview-title">{activeInsights.length ? personalCopy ? (zh ? "你选择保留的几份理解，正在这里彼此关联。" : "A few understandings you chose to keep are in relation here.") : (zh ? "几份示例理解正在这里彼此关联。" : "A few example understandings are in relation here.") : (zh ? "你的镜像仍在形成。" : "Your mirror is still forming.")}</p>
              </div>
              <span className={styles.previewLine + " " + styles.lineOne} aria-hidden="true" />
              <span className={styles.previewLine + " " + styles.lineTwo} aria-hidden="true" />
              <span className={styles.previewLine + " " + styles.lineThree} aria-hidden="true" />
              <div className={styles.previewCenter}>{zh ? "此刻" : "NOW"}</div>
              {recent.map((insight, index) => <a key={insight.id} href={`/mirror?insight=${insight.id}`} className={`${styles.previewNode} ${[styles.nodeOne, styles.nodeTwo, styles.nodeThree][index]}`}>{d(insight.title)}</a>)}
            </section>
            <section className={styles.reflectionEntry} aria-labelledby="reflection-entry-title">
              <h2 id="reflection-entry-title">{t("now.promptTitle")}</h2>
              <p className={styles.entryHelp}>{t("now.promptHelp")}</p>
              <label className="sr-only" htmlFor="reflection-input">{t("now.promptTitle")}</label>
              <textarea id="reflection-input" className={styles.textarea} value={input} onChange={(event) => setInput(event.target.value)} placeholder={t("now.promptPlaceholder")} />
              <div className={styles.contextRow} aria-label={zh ? "反思情境" : "Reflection context"}>
                {contexts.map((item) => <button type="button" key={item.id} onClick={() => setContext(item.id)} className={`${styles.contextButton} ${context === item.id ? styles.contextSelected : ""}`} aria-pressed={context === item.id}>{t(item.labelKey)}</button>)}
              </div>
              <PreviousReflectionPicker value={previousId} onChange={setPreviousId} />
              <div className={styles.buttonRow}><button type="button" className={styles.primaryButton} onClick={beginReflection} disabled={!input.trim()}>{t("now.reflectCta")}</button></div>
            </section>
            <RecentPersonalReflections />
          </div>
          <aside className={styles.nowRail} aria-label={zh ? "当前镜像摘要" : "Current mirror summary"}>
            <section className={styles.railSection}>
              <div className={styles.railTitle}><h2>{personalCopy ? (zh ? "当前线索" : "Current threads") : (zh ? "示例线索" : "Example threads")}</h2><span>{zh ? "最多 3 条" : "up to 3"}</span></div>
              <div className={styles.threadList}>
                {recent.map((insight) => <a key={insight.id} className={styles.thread} href={`/mirror?insight=${insight.id}`}><strong>{d(insight.title)}</strong><span>{labelEnum(locale, insight.category)} · {labelEnum(locale, insight.status)}</span></a>)}
              </div>
            </section>
            {changing ? <section className={styles.railSection}>
              <div className={styles.railTitle}><h2>{personalCopy ? (zh ? "有些东西可能正在变化" : "Something may be changing") : (zh ? "示例变化" : "Example change")}</h2></div>
              <div className={styles.changeNotice}><p>{d(changing.statement)}</p><a href={`/mirror?insight=${changing.id}`}>{zh ? "查看证据" : "Review the evidence"}</a></div>
            </section> : null}
            <section className={styles.railSection}>
              <div className={styles.railTitle}><h2>{personalCopy ? (zh ? "我正在探索的方向" : "Directions I'm exploring") : (zh ? "示例人物的方向" : "Sample person directions")}</h2></div>
              {state.directions.slice(0, 2).map((direction) => <div key={direction.id} className={styles.direction}><p>{d(direction.statement)}</p><span>{labelEnum(locale, direction.status)}</span></div>)}
            </section>
          </aside>
        </div>
      </div>
    </LivingShell>
  );
}

function CurrentStateModule() {
  const { state } = useLivingModel();
  const { locale } = useLocale();
  const zh = locale === "zh-CN";
  const d = (value: string) => state.sampleDataLoaded ? localizeDemoText(value, locale) : value;
  const group = getMostRelevantSnapshotGroup(state);
  if (!group) return null;
  const latestSession = state.sessions.find((item) => item.id === group.sessionId);
  const comparable = group.metrics.some((metric) => metric.previous && metric.current);
  const summaryMetric = group.metrics.find((metric) => metric.previous && metric.current);
  return <section className={styles.currentState} aria-labelledby="current-state-title"><header><div><p className={styles.sectionLabel}>{zh ? "当前状态" : "Current state"}</p><h2 id="current-state-title">{d(group.context).split(" · ")[0]}</h2></div><span>{comparable ? (zh ? `来自 ${group.count} 次相关反思` : `Across ${group.count} related reflections`) : (zh ? "一份状态 · 暂无趋势" : "One snapshot · No trend yet")}</span></header><div className={styles.currentStateMetrics}>{group.metrics.map((metric) => metric.current ? <div key={metric.metricKey} className={styles.comparisonMetric}><h3>{zh ? (metric.metricKey === "pressure" ? "压力" : "清晰度") : STATE_METRICS[metric.metricKey].label}</h3><div>{metric.previous ? <a href={`/reflection/${metric.previous.sessionId}`} aria-label={zh ? "打开较早的反思" : `Open the earlier ${metric.metricKey} reflection`}><time>{formatLivingDate(locale, metric.previous.capturedAt, { month: "short", day: "numeric" })}</time><ReadOnlyMetric compact label={zh ? "较早" : "Earlier"} metricKey={metric.metricKey} value={metric.previous.value} /></a> : null}<a href={`/reflection/${metric.current.sessionId}`} aria-label={zh ? "打开最近的反思" : `Open the latest ${metric.metricKey} reflection`}><time>{metric.previous ? (zh ? "现在" : "Now") : formatLivingDate(locale, metric.current.capturedAt, { month: "short", day: "numeric" })}</time><ReadOnlyMetric compact label={zh ? "当前" : "Current"} metricKey={metric.metricKey} value={metric.current.value} /></a></div></div> : null)}</div><p className={styles.currentStateNote}>{summaryMetric?.previous && summaryMetric.current ? `${zh ? describeStateChangeZh(summaryMetric.metricKey, summaryMetric.previous.value, summaryMetric.current.value) : describeStateChange(summaryMetric.metricKey, summaryMetric.previous.value, summaryMetric.current.value)} ${latestSession?.nextStep ? (zh ? `最近一次反思提到：“${d(latestSession.nextStep)}”` : `The latest reflection names: “${d(latestSession.nextStep)}”`) : ""}` : (zh ? "这是一份用户自述的当下状态。需要另一次相关反思，才会显示对比。" : "This is one self-reported moment. Another related reflection is needed before showing a comparison.")}</p><footer>{zh ? "用户自述 · 时间、情境与来源始终附在每个点上。" : "Self-reported · Time, context and source stay attached to each point."}</footer></section>;
}

function describeStateChangeZh(metricKey: "pressure" | "clarity", previous: number, current: number) {
  const label = metricKey === "pressure" ? "压力" : "清晰度";
  if (previous === current) return `${label}与上次自述持平。`;
  return `${label}在最近一次自述中${current > previous ? "更高" : "更低"}。`;
}
