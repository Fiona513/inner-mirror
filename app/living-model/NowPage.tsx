"use client";

import { useMemo, useState } from "react";
import { createReflectionSession } from "./agent";
import { LivingShell, PageHeader } from "./LivingShell";
import styles from "./LivingModel.module.css";
import { useCopy, useLocale } from "../locale/locale";
import { useSampleText } from "../locale/sample-text";
import { useLivingModel } from "./LivingModelProvider";
import { LIVING_MODEL_STORAGE_KEY, livingModelReducer } from "./store";
import { describeStateChange, getMostRelevantSnapshotGroup, STATE_METRICS } from "./state-snapshots";
import { ReadOnlyMetric } from "./StateSnapshotCapture";
import type { ReflectionContext } from "./types";
import type { MessageKey } from "../locale/messages";

const contexts: { id: ReflectionContext; labelKey: MessageKey }[] = [
  { id: "decision", labelKey: "now.contextDecision" },
  { id: "feeling", labelKey: "now.contextFeeling" },
  { id: "repeating", labelKey: "now.contextRepeating" },
  { id: "explore", labelKey: "now.contextExplore" },
];

export default function NowPage() {
  const { state, dispatch } = useLivingModel();
  const { t } = useLocale();
  const copy = useCopy();
  const sampleText = useSampleText();
  const [input, setInput] = useState("");
  const [context, setContext] = useState<ReflectionContext>("explore");
  const activeInsights = state.insights.filter((item) => item.status !== "archived" && item.userConfirmed);
  const personalCopy = !state.sampleDataLoaded || state.hasPersonalUnderstanding;
  const changing = state.insights.find((item) => item.status === "changing");
  const recent = useMemo(() => activeInsights.slice(0, 3), [activeInsights]);

  function beginReflection() {
    if (!input.trim()) return;
    const session = createReflectionSession(input, context, state);
    const action = { type: "START_REFLECTION", session } as const;
    window.localStorage.setItem(LIVING_MODEL_STORAGE_KEY, JSON.stringify(livingModelReducer(state, action)));
    dispatch(action);
    window.location.assign(`/reflection/${session.id}`);
  }

  return (
    <LivingShell>
      <div className={styles.page}>
        <PageHeader eyebrow={t("nav.now")} title={personalCopy ? t("now.titlePersonal") : t("now.titleExample")} support={activeInsights.length ? personalCopy ? t("now.supportPersonal") : t("now.supportExample") : t("now.supportEmpty")} />
        {state.sampleDataLoaded ? <div className={styles.sampleBanner}><strong>{copy("示例人物", "Sample person")}</strong><span>{copy("示例历史会持续标注，不属于你的个人镜像。", "Example history stays labelled. It is not part of your personal mirror.")}</span></div> : null}
        {state.memoryPaused ? <div className={styles.temporaryBanner}>{copy("临时反思模式已开启。这次反思不会更新长期记忆或你的镜像。", "Temporary reflection mode is on. This session can still help, but it will not update long-term memory or your mirror.")}</div> : null}
        <div className={styles.nowGrid}>
          <div className={styles.nowPrimary}>
            <CurrentStateModule />
            <section className={styles.mirrorPreview} aria-labelledby="mirror-preview-title">
              <div className={styles.previewIntro}>
                <p className={styles.sectionLabel}>{copy("镜像概览", "Mirror overview")}</p>
                <p id="mirror-preview-title">{activeInsights.length ? personalCopy ? copy("这里呈现你选择保留的几条理解之间的关系。", "A few understandings you chose to keep are in relation here.") : copy("这里呈现几条示例理解之间的关系。", "A few example understandings are in relation here.") : copy("你的镜像仍在成形。", "Your mirror is still forming.")}</p>
              </div>
              <span className={styles.previewLine + " " + styles.lineOne} aria-hidden="true" />
              <span className={styles.previewLine + " " + styles.lineTwo} aria-hidden="true" />
              <span className={styles.previewLine + " " + styles.lineThree} aria-hidden="true" />
              <div className={styles.previewCenter}>{t("nav.now")}</div>
              {recent.map((insight, index) => <a key={insight.id} href={`/mirror?insight=${insight.id}`} className={`${styles.previewNode} ${[styles.nodeOne, styles.nodeTwo, styles.nodeThree][index]}`}>{sampleText(insight.title)}</a>)}
            </section>
            <section className={styles.reflectionEntry} aria-labelledby="reflection-entry-title">
              <h2 id="reflection-entry-title">{t("now.promptTitle")}</h2>
              <p className={styles.entryHelp}>{t("now.promptHelp")}</p>
              <label className="sr-only" htmlFor="reflection-input">{t("now.promptTitle")}</label>
              <textarea id="reflection-input" className={styles.textarea} value={input} onChange={(event) => setInput(event.target.value)} placeholder={t("now.promptPlaceholder")} />
              <div className={styles.contextRow} aria-label={copy("反思情境", "Reflection context")}>
                {contexts.map((item) => <button type="button" key={item.id} onClick={() => setContext(item.id)} className={`${styles.contextButton} ${context === item.id ? styles.contextSelected : ""}`} aria-pressed={context === item.id}>{t(item.labelKey)}</button>)}
              </div>
              <div className={styles.buttonRow}><button type="button" className={styles.primaryButton} onClick={beginReflection} disabled={!input.trim()}>{t("now.reflectCta")}</button></div>
            </section>
          </div>
          <aside className={styles.nowRail} aria-label={copy("当前镜像摘要", "Current mirror summary")}>
            <section className={styles.railSection}>
              <div className={styles.railTitle}><h2>{personalCopy ? copy("当前线索", "Current threads") : copy("示例线索", "Example threads")}</h2><span>{copy("最多 3 条", "up to 3")}</span></div>
              <div className={styles.threadList}>
                {recent.map((insight) => <a key={insight.id} className={styles.thread} href={`/mirror?insight=${insight.id}`}><strong>{sampleText(insight.title)}</strong><span>{sampleText(insight.category.replaceAll("_", " "))} · {sampleText(insight.status.replaceAll("_", " "))}</span></a>)}
              </div>
            </section>
            {changing ? <section className={styles.railSection}>
              <div className={styles.railTitle}><h2>{personalCopy ? copy("某些理解可能正在变化", "Something may be changing") : copy("示例变化", "Example change")}</h2></div>
              <div className={styles.changeNotice}><p>{sampleText(changing.statement)}</p><a href={`/mirror?insight=${changing.id}`}>{copy("查看依据", "Review the evidence")}</a></div>
            </section> : null}
            <section className={styles.railSection}>
              <div className={styles.railTitle}><h2>{personalCopy ? copy("正在探索的方向", "Directions I'm exploring") : copy("示例人物的方向", "Sample person directions")}</h2></div>
              {state.directions.slice(0, 2).map((direction) => <div key={direction.id} className={styles.direction}><p>{sampleText(direction.statement)}</p><span>{sampleText(direction.status.replaceAll("_", " "))}</span></div>)}
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
  const copy = useCopy();
  const sampleText = useSampleText();
  const group = getMostRelevantSnapshotGroup(state);
  if (!group) return null;
  const latestSession = state.sessions.find((item) => item.id === group.sessionId);
  const comparable = group.metrics.some((metric) => metric.previous && metric.current);
  const summaryMetric = group.metrics.find((metric) => metric.previous && metric.current);
  const date = (value: string) => new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(value));
  return <section className={styles.currentState} aria-labelledby="current-state-title"><header><div><p className={styles.sectionLabel}>{copy("当前状态", "Current state")}</p><h2 id="current-state-title">{sampleText(group.context.split(" · ")[0])}</h2></div><span>{comparable ? locale === "zh-CN" ? `${group.count} 次相关反思` : `Across ${group.count} related reflections` : copy("一次记录 · 暂无趋势", "One snapshot · No trend yet")}</span></header><div className={styles.currentStateMetrics}>{group.metrics.map((metric) => metric.current ? <div key={metric.metricKey} className={styles.comparisonMetric}><h3>{sampleText(STATE_METRICS[metric.metricKey].label)}</h3><div>{metric.previous ? <a href={`/reflection/${metric.previous.sessionId}`} aria-label={copy(`查看更早的${sampleText(metric.metricKey)}反思`, `Open the earlier ${metric.metricKey} reflection`)}><time>{date(metric.previous.capturedAt)}</time><ReadOnlyMetric compact label={copy("较早", "Earlier")} metricKey={metric.metricKey} value={metric.previous.value} /></a> : null}<a href={`/reflection/${metric.current.sessionId}`} aria-label={copy(`查看最新的${sampleText(metric.metricKey)}反思`, `Open the latest ${metric.metricKey} reflection`)}><time>{metric.previous ? copy("现在", "Now") : date(metric.current.capturedAt)}</time><ReadOnlyMetric compact label={copy("当前", "Current")} metricKey={metric.metricKey} value={metric.current.value} /></a></div></div> : null)}</div><p className={styles.currentStateNote}>{summaryMetric?.previous && summaryMetric.current ? `${describeStateChange(summaryMetric.metricKey, summaryMetric.previous.value, summaryMetric.current.value, locale)} ${latestSession?.nextStep ? copy(`最近的反思提到：“${sampleText(latestSession.nextStep)}”`, `The latest reflection names: “${latestSession.nextStep}”`) : ""}` : copy("这是一次自报状态。再有一次相关反思后，才能呈现对照。", "This is one self-reported moment. Another related reflection is needed before showing a comparison.")}</p><footer>{copy("自报状态 · 每个点都保留时间、情境与来源。", "Self-reported · Time, context and source stay attached to each point.")}</footer></section>;
}
